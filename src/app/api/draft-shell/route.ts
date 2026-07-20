import { NextResponse } from "next/server";
import { createAnthropicClient, GENERATION_MODEL } from "@/lib/anthropic";
import { brandShellSchema, buildBrandShellPrompt } from "@/lib/prompts";
import { createClient } from "@/lib/supabase/server";

// Brief §6c: drafts the five fixed shell lines from the company's saved
// profile and inserts a new `shells` row with status='draft'. Takes no
// request body — the profile is loaded server-side, never trusted from the
// client (same principle as the other routes in §6).
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: member, error: memberError } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (memberError || !member) {
    return NextResponse.json(
      { error: "No company found for this account." },
      { status: 403 },
    );
  }

  if (member.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can draft the shell." },
      { status: 403 },
    );
  }

  const [companyResult, profileResult] = await Promise.all([
    supabase
      .from("companies")
      .select("name")
      .eq("id", member.company_id)
      .single(),
    supabase
      .from("company_profiles")
      .select("about, values, voice")
      .eq("company_id", member.company_id)
      .single(),
  ]);

  if (companyResult.error || !companyResult.data) {
    return NextResponse.json(
      { error: "Couldn't load the company." },
      { status: 500 },
    );
  }

  if (profileResult.error || !profileResult.data) {
    return NextResponse.json(
      { error: "Fill in the company profile before drafting a shell." },
      { status: 400 },
    );
  }

  const prompt = buildBrandShellPrompt(
    profileResult.data,
    companyResult.data.name,
  );

  const anthropic = createAnthropicClient();

  let rawText: string;
  try {
    const message = await anthropic.messages.create({
      model: GENERATION_MODEL,
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });
    rawText = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .replace(/```json|```/g, "")
      .trim();
  } catch {
    return NextResponse.json(
      { error: "Couldn't draft the shell — try again." },
      { status: 502 },
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    return NextResponse.json(
      { error: "Couldn't draft the shell — try again." },
      { status: 502 },
    );
  }

  const parsed = brandShellSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Couldn't draft the shell — try again." },
      { status: 502 },
    );
  }

  const { data: latestShell } = await supabase
    .from("shells")
    .select("version")
    .eq("company_id", member.company_id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latestShell?.version ?? 0) + 1;

  const { data: shell, error: shellError } = await supabase
    .from("shells")
    .insert({
      company_id: member.company_id,
      version: nextVersion,
      ...parsed.data,
      status: "draft",
      created_by: user.id,
    })
    .select()
    .single();

  if (shellError || !shell) {
    return NextResponse.json(
      { error: "Couldn't save the draft — try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ shell });
}
