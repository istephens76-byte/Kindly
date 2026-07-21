import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  CLASSIFIER_MODEL,
  createAnthropicClient,
  extractAnthropicText,
  GENERATION_MODEL,
} from "@/lib/anthropic";
import { buildSingleEmail } from "@/lib/email-assembly";
import { scanGuardrails } from "@/lib/guardrails";
import {
  buildClassifierAvoidInstruction,
  buildClassifierPrompt,
  buildGenerateMiddlePrompt,
  buildRegexAvoidInstruction,
  classifierSchema,
  generateMiddleSchema,
  JSON_ONLY_RETRY_INSTRUCTION,
  PROMPTS_VERSION,
  type GenerateMiddleAnswers,
} from "@/lib/prompts";
import { createClient } from "@/lib/supabase/server";

const STAGES = [
  "CV / application review",
  "Phone screen",
  "First interview",
  "Final interview",
] as const;

const bodySchema = z.object({
  vacancyId: z.string().uuid(),
  candidateFirstName: z.string().trim().min(1, "First name is required").max(100),
  stage: z.enum(STAGES),
  reasonTaxonomyId: z.string().uuid(),
  reasonSkill: z.string().trim().max(200).optional(),
  reasonDetail: z.string().trim().max(500).optional(),
  strengthTaxonomyId: z.string().uuid(),
  strengthDetail: z.string().trim().max(500).optional(),
  closing: z.enum(["active", "other", "no"]),
  talentLinkIncluded: z.boolean(),
});

const GENERIC_FAILURE = "Couldn't write this one — try again.";

// Brief §6a: authorise + validate, load everything server-side (never
// trust client-provided labels), run the three-layer guardrail pipeline
// (schema -> regex -> classifier, one retry each), assemble the email
// deterministically, persist the full audit row.
export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: member, error: memberError } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (memberError || !member) {
    return NextResponse.json(
      { error: "No company found for this account." },
      { status: 403 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsedBody = bodySchema.safeParse(json);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const input = parsedBody.data;

  const [companyResult, profileResult, shellResult, vacancyResult, reasonResult, strengthResult] =
    await Promise.all([
      supabase.from("companies").select("name").eq("id", member.company_id).single(),
      supabase
        .from("company_profiles")
        .select("about, values, voice, sender_name, talent_link_url")
        .eq("company_id", member.company_id)
        .maybeSingle(),
      supabase
        .from("shells")
        .select("id, warm_line, closing_active, closing_other, closing_no, talent_line")
        .eq("company_id", member.company_id)
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("vacancies")
        .select("id, title")
        .eq("id", input.vacancyId)
        .eq("company_id", member.company_id)
        .maybeSingle(),
      supabase
        .from("taxonomies")
        .select("id, label, needs_skill")
        .eq("id", input.reasonTaxonomyId)
        .eq("company_id", member.company_id)
        .eq("kind", "reason")
        .maybeSingle(),
      supabase
        .from("taxonomies")
        .select("id, label")
        .eq("id", input.strengthTaxonomyId)
        .eq("company_id", member.company_id)
        .eq("kind", "strength")
        .maybeSingle(),
    ]);

  if (companyResult.error || !companyResult.data) {
    return NextResponse.json({ error: "Couldn't load the company." }, { status: 500 });
  }
  if (!shellResult.data) {
    return NextResponse.json(
      { error: "No active shell — set one up in Template Studio first." },
      { status: 400 },
    );
  }
  if (!vacancyResult.data) {
    return NextResponse.json({ error: "Vacancy not found." }, { status: 400 });
  }
  if (!reasonResult.data) {
    return NextResponse.json({ error: "Reason not found." }, { status: 400 });
  }
  if (!strengthResult.data) {
    return NextResponse.json({ error: "Strength not found." }, { status: 400 });
  }

  if (reasonResult.data.needs_skill && !input.reasonSkill) {
    return NextResponse.json(
      { error: "This reason needs a skill." },
      { status: 400 },
    );
  }

  // The skill chip must actually belong to this vacancy — never trust a
  // client-supplied label as-is.
  let reasonSkill = "";
  if (reasonResult.data.needs_skill && input.reasonSkill) {
    const { data: skillRow } = await supabase
      .from("vacancy_skills")
      .select("label")
      .eq("vacancy_id", input.vacancyId)
      .eq("label", input.reasonSkill)
      .maybeSingle();
    if (!skillRow) {
      return NextResponse.json(
        { error: "That skill isn't part of this vacancy." },
        { status: 400 },
      );
    }
    reasonSkill = skillRow.label;
  }

  const profile = profileResult.data ?? {
    about: "",
    values: "",
    voice: "",
    sender_name: "",
    talent_link_url: "",
  };

  const answers: GenerateMiddleAnswers = {
    roleTitle: vacancyResult.data.title,
    stage: input.stage,
    reasonLabel: reasonResult.data.label,
    reasonSkill,
    reasonDetail: input.reasonDetail ?? "",
    strength: strengthResult.data.label,
    strengthDetail: input.strengthDetail ?? "",
  };

  // Phase 4's five-question flow has no tone selector yet (brief §7 lists
  // the five questions; tone isn't one of them) — matches the prototype's
  // default.
  const tone = "warm" as const;

  const anthropic = createAnthropicClient();
  const extraInstructions: string[] = [];
  let schemaRetryUsed = false;
  let regexRetryUsed = false;
  let classifierRetryUsed = false;
  const allRegexHits: string[] = [];
  let finalClassifierVerdict: { flag: boolean; reason: string } | null = null;
  let middle: string | null = null;
  let failureReason: string | null = null;

  // At most 4 attempts: the original, plus one retry per layer (schema,
  // regex, classifier) — each retry flag can only be spent once, so this
  // loop is guaranteed to terminate.
  for (let attempt = 0; attempt < 4 && middle === null && !failureReason; attempt += 1) {
    const prompt = buildGenerateMiddlePrompt(answers, profile, tone, extraInstructions);

    let rawText: string;
    try {
      const message = await anthropic.messages.create({
        model: GENERATION_MODEL,
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      });
      rawText = extractAnthropicText(message);
    } catch {
      failureReason = GENERIC_FAILURE;
      break;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      parsedJson = undefined;
    }

    const schemaResult =
      parsedJson === undefined
        ? { success: false as const }
        : generateMiddleSchema.safeParse(parsedJson);

    if (!schemaResult.success) {
      if (schemaRetryUsed) {
        failureReason = GENERIC_FAILURE;
        break;
      }
      schemaRetryUsed = true;
      extraInstructions.push(JSON_ONLY_RETRY_INSTRUCTION);
      continue;
    }

    const candidateMiddle = schemaResult.data.middle;
    const { hardHits } = scanGuardrails(candidateMiddle);
    if (hardHits.length > 0) {
      allRegexHits.push(...hardHits);
      if (regexRetryUsed) {
        failureReason = GENERIC_FAILURE;
        break;
      }
      regexRetryUsed = true;
      extraInstructions.push(buildRegexAvoidInstruction(hardHits));
      continue;
    }

    let classifierVerdict: { flag: boolean; reason: string };
    try {
      const classifierMessage = await anthropic.messages.create({
        model: CLASSIFIER_MODEL,
        max_tokens: 200,
        messages: [
          { role: "user", content: buildClassifierPrompt(candidateMiddle) },
        ],
      });
      const classifierText = extractAnthropicText(classifierMessage);
      const classifierParsed = classifierSchema.safeParse(
        JSON.parse(classifierText),
      );
      classifierVerdict = classifierParsed.success
        ? classifierParsed.data
        : { flag: false, reason: "classifier response unparseable" };
    } catch {
      // Fail open rather than blocking every generation on a classifier
      // hiccup (brief §8: graceful degradation on every AI failure path)
      // — but log it distinctly so audit review can tell this apart from
      // a genuine pass.
      console.error("generate: classifier call failed", { userId: user.id });
      classifierVerdict = { flag: false, reason: "classifier unavailable" };
    }

    finalClassifierVerdict = classifierVerdict;

    if (classifierVerdict.flag) {
      if (classifierRetryUsed) {
        failureReason = GENERIC_FAILURE;
        break;
      }
      classifierRetryUsed = true;
      extraInstructions.push(
        buildClassifierAvoidInstruction(
          classifierVerdict.reason || "possible protected-characteristic implication",
        ),
      );
      continue;
    }

    middle = candidateMiddle;
  }

  if (!middle || failureReason) {
    console.error("generate: guardrail pipeline failed", {
      userId: user.id,
      companyId: member.company_id,
      regexHits: allRegexHits,
      classifierVerdict: finalClassifierVerdict,
    });
    return NextResponse.json(
      { error: failureReason ?? GENERIC_FAILURE },
      { status: 502 },
    );
  }

  const closingTextByKey = {
    active: shellResult.data.closing_active,
    other: shellResult.data.closing_other,
    no: shellResult.data.closing_no,
  };

  const emailGenerated = buildSingleEmail({
    candidateFirstName: input.candidateFirstName,
    roleTitle: answers.roleTitle,
    stage: input.stage,
    companyName: companyResult.data.name,
    warmLine: shellResult.data.warm_line,
    middle,
    closingText: closingTextByKey[input.closing],
    talentLine: shellResult.data.talent_line,
    talentLinkUrl: profile.talent_link_url,
    talentLinkIncluded: input.talentLinkIncluded,
    senderName: profile.sender_name,
  });

  const retries =
    Number(schemaRetryUsed) + Number(regexRetryUsed) + Number(classifierRetryUsed);

  const { data: generation, error: insertError } = await supabase
    .from("generations")
    .insert({
      company_id: member.company_id,
      vacancy_id: input.vacancyId,
      user_id: user.id,
      shell_id: shellResult.data.id,
      mode: "single",
      candidate_first_name: input.candidateFirstName,
      stage: input.stage,
      reason_taxonomy_id: input.reasonTaxonomyId,
      reason_skill: reasonSkill || null,
      reason_detail: input.reasonDetail || null,
      strength_taxonomy_id: input.strengthTaxonomyId,
      strength_detail: input.strengthDetail || null,
      closing: input.closing,
      talent_link_included: input.talentLinkIncluded,
      tone,
      prompt_hash: PROMPTS_VERSION,
      middle_generated: middle,
      email_generated: emailGenerated,
      guardrail_results: {
        schema_ok: true,
        regex_hits: allRegexHits,
        classifier_verdict: finalClassifierVerdict,
        retries,
      },
      ms_to_generate: Date.now() - startedAt,
    })
    .select("id, email_generated")
    .single();

  if (insertError || !generation) {
    return NextResponse.json(
      { error: "Couldn't save this — try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: generation.id,
    email: generation.email_generated,
  });
}
