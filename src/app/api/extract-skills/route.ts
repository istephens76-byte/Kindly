import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  createAnthropicClient,
  extractAnthropicText,
  GENERATION_MODEL,
} from "@/lib/anthropic";
import { buildExtractSkillsPrompt, extractSkillsSchema } from "@/lib/prompts";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// vacancies has no DELETE policy (by design — see the RLS migration), so
// rolling back a vacancy created earlier in this same request needs the
// service-role client. This is not a user-facing delete: it only ever
// removes a row this same request just created after a downstream step
// failed, same rollback pattern as onboarding/actions.ts.
async function rollbackVacancy(vacancyId: string) {
  await createAdminClient().from("vacancies").delete().eq("id", vacancyId);
}

const bodySchema = z.object({
  title: z.string().trim().min(1, "Role title is required").max(200),
  jdText: z.string().trim().min(1, "Job description is required").max(20_000),
});

// Brief §6c/§2.3: creates a vacancy from a role title + pasted JD, extracts
// 5-6 comparison skills via Anthropic, and persists them as vacancy_skills
// with source='extracted'. Any same-company member can call this — role
// setup is a routine recruiter task, not admin-only (see the RLS migration).
export async function POST(request: NextRequest) {
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

  const { data: vacancy, error: vacancyError } = await supabase
    .from("vacancies")
    .insert({
      company_id: member.company_id,
      title: parsedBody.data.title,
      jd_text: parsedBody.data.jdText,
      created_by: user.id,
    })
    .select()
    .single();

  if (vacancyError || !vacancy) {
    return NextResponse.json(
      { error: "Couldn't save the vacancy — try again." },
      { status: 500 },
    );
  }

  const prompt = buildExtractSkillsPrompt(
    parsedBody.data.jdText,
    parsedBody.data.title,
  );

  let rawText: string;
  try {
    const anthropic = createAnthropicClient();
    const message = await anthropic.messages.create({
      model: GENERATION_MODEL,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });
    rawText = extractAnthropicText(message);
  } catch {
    await rollbackVacancy(vacancy.id);
    return NextResponse.json(
      { error: "Couldn't extract skills — try again." },
      { status: 502 },
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    await rollbackVacancy(vacancy.id);
    return NextResponse.json(
      { error: "Couldn't extract skills — try again." },
      { status: 502 },
    );
  }

  const parsedSkills = extractSkillsSchema.safeParse(parsedJson);
  if (!parsedSkills.success) {
    await rollbackVacancy(vacancy.id);
    return NextResponse.json(
      { error: "Couldn't extract skills — try again." },
      { status: 502 },
    );
  }

  const { data: skills, error: skillsError } = await supabase
    .from("vacancy_skills")
    .insert(
      parsedSkills.data.map((label) => ({
        vacancy_id: vacancy.id,
        label,
        source: "extracted" as const,
      })),
    )
    .select();

  if (skillsError || !skills) {
    await rollbackVacancy(vacancy.id);
    return NextResponse.json(
      { error: "Couldn't save the skills — try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ vacancy, skills });
}
