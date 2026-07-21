import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  CLASSIFIER_MODEL,
  createAnthropicClient,
  extractAnthropicText,
  GENERATION_MODEL,
} from "@/lib/anthropic";
import { chunk } from "@/lib/chunk";
import { buildTriageEmail, REVIEWED_LINE } from "@/lib/email-assembly";
import { scanGuardrails } from "@/lib/guardrails";
import {
  buildClassifierAvoidInstruction,
  buildClassifierPrompt,
  buildRegexAvoidInstruction,
  buildTriageMiddlesPrompt,
  classifierSchema,
  JSON_ONLY_RETRY_INSTRUCTION,
  PROMPTS_VERSION,
  ROLE_CHANGED_SENTINEL,
  triageMiddlesSchema,
  type CompanyProfileInput,
  type TriageCandidateInput,
} from "@/lib/prompts";
import {
  TRIAGE_RATE_LIMIT_PER_MINUTE,
  triageBatchesInLastMinute,
} from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type GenerationInsert = Database["public"]["Tables"]["generations"]["Insert"];

const CHUNK_SIZE = 15;
const GENERIC_FAILURE = "Couldn't write these — try again.";

const candidateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  skillOrChanged: z.string().trim().min(1).max(200),
  closing: z.enum(["other", "no"]),
  talentLinkIncluded: z.boolean(),
});

const bodySchema = z.object({
  vacancyId: z.string().uuid(),
  candidates: z.array(candidateSchema).min(1).max(50),
});

interface TriageResult {
  name: string;
  id?: string;
  email?: string;
  needsManualAttention?: boolean;
}

// One model call per chunk (brief §6b step 2). Returns null if the
// response never parses to the right shape even after the JSON-only
// retry — the caller treats that as every candidate in the chunk needing
// manual attention rather than failing the whole request (brief §8:
// triage batches degrade per-candidate, not wholesale).
async function runBatchPrompt(
  anthropic: ReturnType<typeof createAnthropicClient>,
  candidates: TriageCandidateInput[],
  roleTitle: string,
  profile: CompanyProfileInput,
): Promise<string[] | null> {
  const extraInstructions: string[] = [];

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const prompt = buildTriageMiddlesPrompt(
      candidates,
      roleTitle,
      profile,
      extraInstructions,
    );

    let rawText: string;
    try {
      const message = await anthropic.messages.create({
        model: GENERATION_MODEL,
        max_tokens: 200 * candidates.length,
        messages: [{ role: "user", content: prompt }],
      });
      rawText = extractAnthropicText(message);
    } catch {
      return null;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      parsedJson = undefined;
    }

    const result =
      parsedJson === undefined
        ? { success: false as const }
        : triageMiddlesSchema.safeParse(parsedJson);

    if (result.success && result.data.middles.length === candidates.length) {
      return result.data.middles;
    }

    extraInstructions.push(JSON_ONLY_RETRY_INSTRUCTION);
  }

  return null;
}

interface ResolvedCandidate {
  middle: string | null;
  regexHits: string[];
  classifierVerdict: { flag: boolean; reason: string } | null;
  retried: boolean;
}

async function runClassifier(
  anthropic: ReturnType<typeof createAnthropicClient>,
  middle: string,
  userId: string,
): Promise<{ flag: boolean; reason: string }> {
  try {
    const classifierMessage = await anthropic.messages.create({
      model: CLASSIFIER_MODEL,
      max_tokens: 200,
      messages: [{ role: "user", content: buildClassifierPrompt(middle) }],
    });
    const classifierText = extractAnthropicText(classifierMessage);
    const parsed = classifierSchema.safeParse(JSON.parse(classifierText));
    return parsed.success
      ? parsed.data
      : { flag: false, reason: "classifier response unparseable" };
  } catch {
    console.error("generate-triage: classifier call failed", { userId });
    return { flag: false, reason: "classifier unavailable" };
  }
}

// Layers 2-3 on a single candidate's middle (brief §6b step 3). Exactly
// one solo-regenerate attempt total (not one retry per layer, unlike
// single mode) — a second failure returns needsManualAttention.
async function resolveCandidate(
  anthropic: ReturnType<typeof createAnthropicClient>,
  candidate: TriageCandidateInput,
  roleTitle: string,
  profile: CompanyProfileInput,
  initialMiddle: string,
  userId: string,
): Promise<ResolvedCandidate> {
  let middle = initialMiddle;
  let retried = false;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { hardHits } = scanGuardrails(middle);
    if (hardHits.length > 0) {
      if (attempt === 1) {
        return { middle: null, regexHits: hardHits, classifierVerdict: null, retried };
      }
      const regenerated = await soloRegenerate(
        anthropic,
        candidate,
        roleTitle,
        profile,
        buildRegexAvoidInstruction(hardHits),
      );
      if (regenerated === null) {
        return { middle: null, regexHits: hardHits, classifierVerdict: null, retried: true };
      }
      middle = regenerated;
      retried = true;
      continue;
    }

    const classifierVerdict = await runClassifier(anthropic, middle, userId);
    if (classifierVerdict.flag) {
      if (attempt === 1) {
        return { middle: null, regexHits: [], classifierVerdict, retried };
      }
      const regenerated = await soloRegenerate(
        anthropic,
        candidate,
        roleTitle,
        profile,
        buildClassifierAvoidInstruction(
          classifierVerdict.reason || "possible protected-characteristic implication",
        ),
      );
      if (regenerated === null) {
        return { middle: null, regexHits: [], classifierVerdict, retried: true };
      }
      middle = regenerated;
      retried = true;
      continue;
    }

    return { middle, regexHits: [], classifierVerdict, retried };
  }

  return { middle: null, regexHits: [], classifierVerdict: null, retried };
}

async function soloRegenerate(
  anthropic: ReturnType<typeof createAnthropicClient>,
  candidate: TriageCandidateInput,
  roleTitle: string,
  profile: CompanyProfileInput,
  avoidInstruction: string,
): Promise<string | null> {
  const prompt = buildTriageMiddlesPrompt(
    [candidate],
    roleTitle,
    profile,
    [avoidInstruction],
  );

  let rawText: string;
  try {
    const message = await anthropic.messages.create({
      model: GENERATION_MODEL,
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });
    rawText = extractAnthropicText(message);
  } catch {
    return null;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    return null;
  }

  const result = triageMiddlesSchema.safeParse(parsedJson);
  if (!result.success || result.data.middles.length !== 1) {
    return null;
  }
  return result.data.middles[0];
}

function skillDisplayLabel(skillOrChanged: string): string {
  return skillOrChanged === ROLE_CHANGED_SENTINEL
    ? "role changed / paused"
    : skillOrChanged;
}

// Brief §6b: chunked batch prompting (~15 per call), per-candidate
// guardrail isolation with a single solo-regenerate attempt, deterministic
// assembly with the reviewed line, one generations row per successful
// candidate sharing a batch_id.
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

  const recentBatches = await triageBatchesInLastMinute(supabase, user.id);
  if (recentBatches >= TRIAGE_RATE_LIMIT_PER_MINUTE) {
    return NextResponse.json(
      { error: "Too many batches written in the last minute — wait a moment and try again." },
      { status: 429 },
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

  const [companyResult, profileResult, shellResult, vacancyResult] =
    await Promise.all([
      supabase.from("companies").select("name").eq("id", member.company_id).single(),
      supabase
        .from("company_profiles")
        .select("about, values, voice, sender_name, talent_link_url")
        .eq("company_id", member.company_id)
        .maybeSingle(),
      supabase
        .from("shells")
        .select("id, warm_line, closing_other, closing_no, talent_line")
        .eq("company_id", member.company_id)
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("vacancies")
        .select("id, title, vacancy_skills(label)")
        .eq("id", input.vacancyId)
        .eq("company_id", member.company_id)
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

  // Never trust the client's tapped skill label as-is — it must match one
  // of this vacancy's real skill chips, or be the fixed sentinel.
  const validSkillLabels = new Set(
    vacancyResult.data.vacancy_skills.map((s) => s.label),
  );
  for (const candidate of input.candidates) {
    if (
      candidate.skillOrChanged !== ROLE_CHANGED_SENTINEL &&
      !validSkillLabels.has(candidate.skillOrChanged)
    ) {
      return NextResponse.json(
        { error: "That skill isn't part of this vacancy." },
        { status: 400 },
      );
    }
  }

  const profile: CompanyProfileInput = {
    about: profileResult.data?.about ?? "",
    values: profileResult.data?.values ?? "",
    voice: profileResult.data?.voice ?? "",
  };
  const senderName = profileResult.data?.sender_name ?? "";
  const talentLinkUrl = profileResult.data?.talent_link_url ?? "";
  const roleTitle = vacancyResult.data.title;

  const anthropic = createAnthropicClient();
  const batchId = crypto.randomUUID();
  const closingTextByKey = {
    other: shellResult.data.closing_other,
    no: shellResult.data.closing_no,
  };

  const chunks = chunk(input.candidates, CHUNK_SIZE);
  const results: TriageResult[] = new Array(input.candidates.length);
  const rowsToInsert: GenerationInsert[] = [];

  let candidateOffset = 0;
  for (const candidateChunk of chunks) {
    const promptCandidates: TriageCandidateInput[] = candidateChunk.map((c) => ({
      name: c.name,
      skillOrChanged: c.skillOrChanged,
    }));

    const middles = await runBatchPrompt(anthropic, promptCandidates, roleTitle, profile);

    if (middles === null) {
      for (const candidate of candidateChunk) {
        results[candidateOffset] = { name: candidate.name, needsManualAttention: true };
        candidateOffset += 1;
      }
      continue;
    }

    for (let i = 0; i < candidateChunk.length; i += 1) {
      const candidate = candidateChunk[i];
      const resolved = await resolveCandidate(
        anthropic,
        promptCandidates[i],
        roleTitle,
        profile,
        middles[i],
        user.id,
      );

      if (resolved.middle === null) {
        console.error("generate-triage: candidate needs manual attention", {
          userId: user.id,
          companyId: member.company_id,
          regexHits: resolved.regexHits,
          classifierVerdict: resolved.classifierVerdict,
        });
        results[candidateOffset] = { name: candidate.name, needsManualAttention: true };
        candidateOffset += 1;
        continue;
      }

      const email = buildTriageEmail({
        candidateFirstName: candidate.name,
        roleTitle,
        companyName: companyResult.data.name,
        warmLine: shellResult.data.warm_line,
        middle: resolved.middle,
        closingText: closingTextByKey[candidate.closing],
        talentLine: shellResult.data.talent_line,
        talentLinkUrl,
        talentLinkIncluded: candidate.talentLinkIncluded,
        senderName,
      });

      rowsToInsert.push({
        company_id: member.company_id,
        vacancy_id: input.vacancyId,
        user_id: user.id,
        shell_id: shellResult.data.id,
        mode: "triage",
        batch_id: batchId,
        candidate_first_name: candidate.name,
        stage: "CV / application review",
        reason_taxonomy_id: null,
        reason_skill: skillDisplayLabel(candidate.skillOrChanged),
        reason_detail: null,
        strength_taxonomy_id: null,
        strength_detail: null,
        closing: candidate.closing,
        talent_link_included: candidate.talentLinkIncluded,
        tone: "n/a",
        prompt_hash: PROMPTS_VERSION,
        middle_generated: resolved.middle,
        email_generated: email,
        guardrail_results: {
          schema_ok: true,
          regex_hits: resolved.regexHits,
          classifier_verdict: resolved.classifierVerdict,
          retries: Number(resolved.retried),
          reviewed_line: REVIEWED_LINE,
        },
        ms_to_generate: Date.now() - startedAt,
      });

      results[candidateOffset] = { name: candidate.name, email };
      candidateOffset += 1;
    }
  }

  if (rowsToInsert.length === 0) {
    return NextResponse.json({ error: GENERIC_FAILURE }, { status: 502 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("generations")
    .insert(rowsToInsert)
    .select("id, candidate_first_name");

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: "Couldn't save these — try again." },
      { status: 500 },
    );
  }

  // Match inserted ids back to their result slots by walking the insert
  // order (rowsToInsert and inserted share the same order — Postgres
  // preserves multi-row insert order in its RETURNING output).
  let insertedIndex = 0;
  for (let i = 0; i < results.length; i += 1) {
    if (!results[i].needsManualAttention) {
      results[i].id = inserted[insertedIndex].id;
      insertedIndex += 1;
    }
  }

  return NextResponse.json({ batchId, results });
}
