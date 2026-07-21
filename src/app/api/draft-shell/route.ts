import { NextResponse } from "next/server";
import {
  createAnthropicClient,
  extractAnthropicText,
  GENERATION_MODEL,
} from "@/lib/anthropic";
import { brandShellSchema, buildBrandShellPrompt } from "@/lib/prompts";
import { createClient } from "@/lib/supabase/server";

async function nextVersionFor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
): Promise<number> {
  const { data: latestShell } = await supabase
    .from("shells")
    .select("version")
    .eq("company_id", companyId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (latestShell?.version ?? 0) + 1;
}

// Brief §6c: drafts the five fixed shell lines from the company's saved
// profile. Every call starts a genuinely fresh draft: any existing
// draft-status row(s) are first demoted to 'superseded' (never deleted —
// shells have no DELETE policy, see the RLS migration) rather than
// looked up and updated in place. An earlier version tried to find "the"
// existing draft via .maybeSingle() and update it, but that lookup
// silently broke once more than one draft-status row existed (it errors
// on >1 match, and the error went unchecked, so it fell through to
// inserting yet another version) — demoting unconditionally has no such
// ambiguity and is also self-healing against any leftover duplicates. A
// version only becomes permanent once it's activated (see
// activate_shell). Takes no request body — the profile is loaded
// server-side, never trusted from the client (same principle as the
// other routes in §6).
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

  let rawText: string;
  try {
    const anthropic = createAnthropicClient();
    const message = await anthropic.messages.create({
      model: GENERATION_MODEL,
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });
    rawText = extractAnthropicText(message);
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

  const { error: supersedeError } = await supabase
    .from("shells")
    .update({ status: "superseded" })
    .eq("company_id", member.company_id)
    .eq("status", "draft");

  if (supersedeError) {
    return NextResponse.json(
      { error: "Couldn't save the draft — try again." },
      { status: 500 },
    );
  }

  const { data: shell, error: shellError } = await supabase
    .from("shells")
    .insert({
      company_id: member.company_id,
      version: await nextVersionFor(supabase, member.company_id),
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
