import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GenerateForm } from "./generate-form";

export default async function GeneratePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: vacancyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: member } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!member) {
    redirect("/onboarding");
  }

  const [
    vacancyResult,
    shellResult,
    reasonsResult,
    strengthsResult,
    companyResult,
    profileResult,
  ] = await Promise.all([
    supabase
      .from("vacancies")
      .select("id, title, vacancy_skills(id, label)")
      .eq("id", vacancyId)
      .eq("company_id", member.company_id)
      .maybeSingle(),
    supabase
      .from("shells")
      .select(
        "warm_line, closing_active, closing_other, closing_no, talent_line",
      )
      .eq("company_id", member.company_id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("taxonomies")
      .select("id, label, needs_skill")
      .eq("company_id", member.company_id)
      .eq("kind", "reason")
      .eq("archived", false)
      .order("sort_order", { ascending: true }),
    supabase
      .from("taxonomies")
      .select("id, label")
      .eq("company_id", member.company_id)
      .eq("kind", "strength")
      .eq("archived", false)
      .order("sort_order", { ascending: true }),
    supabase
      .from("companies")
      .select("name")
      .eq("id", member.company_id)
      .single(),
    supabase
      .from("company_profiles")
      .select("sender_name, talent_link_url")
      .eq("company_id", member.company_id)
      .maybeSingle(),
  ]);

  if (!vacancyResult.data) {
    redirect("/vacancies");
  }

  const profile = profileResult.data ?? {
    sender_name: "",
    talent_link_url: "",
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold text-ink">
          {vacancyResult.data.title}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Write a rejection email for this candidate.
        </p>
      </div>

      {!shellResult.data ? (
        <p className="rounded-lg border border-amber bg-amber-light px-3 py-2 text-sm text-ink">
          No active shell yet — set one up in Template Studio before
          generating.
        </p>
      ) : (
        <GenerateForm
          vacancyId={vacancyResult.data.id}
          roleTitle={vacancyResult.data.title}
          skills={vacancyResult.data.vacancy_skills.map((s) => s.label)}
          reasons={reasonsResult.data ?? []}
          strengths={strengthsResult.data ?? []}
          companyName={companyResult.data?.name ?? ""}
          warmLine={shellResult.data.warm_line}
          closingActive={shellResult.data.closing_active}
          closingOther={shellResult.data.closing_other}
          closingNo={shellResult.data.closing_no}
          talentLine={shellResult.data.talent_line}
          talentLinkUrl={profile.talent_link_url}
          senderName={profile.sender_name}
        />
      )}
    </main>
  );
}
