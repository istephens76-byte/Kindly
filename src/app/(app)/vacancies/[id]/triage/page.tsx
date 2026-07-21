import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TriageForm } from "./triage-form";

export default async function TriagePage({
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

  const [vacancyResult, shellResult, companyResult] = await Promise.all([
    supabase
      .from("vacancies")
      .select("id, title, vacancy_skills(id, label)")
      .eq("id", vacancyId)
      .eq("company_id", member.company_id)
      .maybeSingle(),
    supabase
      .from("shells")
      .select("id")
      .eq("company_id", member.company_id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("companies")
      .select("name")
      .eq("id", member.company_id)
      .single(),
  ]);

  if (!vacancyResult.data) {
    redirect("/vacancies");
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold text-ink">
          {vacancyResult.data.title}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          CV triage · one tap per candidate.
        </p>
      </div>

      {!shellResult.data ? (
        <p className="rounded-lg border border-amber bg-amber-light px-3 py-2 text-sm text-ink">
          No active shell yet — set one up in Template Studio before
          generating.
        </p>
      ) : (
        <TriageForm
          vacancyId={vacancyResult.data.id}
          roleTitle={vacancyResult.data.title}
          skills={vacancyResult.data.vacancy_skills.map((s) => s.label)}
          companyName={companyResult.data?.name ?? ""}
        />
      )}
    </main>
  );
}
