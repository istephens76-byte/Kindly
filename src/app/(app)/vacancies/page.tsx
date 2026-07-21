import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewVacancyForm } from "./new-vacancy-form";
import { VacancyList, type VacancyRow } from "./vacancy-list";

export default async function VacanciesPage() {
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

  const { data: vacancies } = await supabase
    .from("vacancies")
    .select("id, title, created_at, archived, vacancy_skills(id, label, source)")
    .eq("company_id", member.company_id)
    .order("created_at", { ascending: false });

  const rows: VacancyRow[] = (vacancies ?? []).map((v) => ({
    id: v.id,
    title: v.title,
    created_at: v.created_at,
    archived: v.archived,
    skills: v.vacancy_skills,
  }));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <h1 className="text-2xl font-bold text-ink">Vacancies</h1>

      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-ink">New vacancy</h2>
        <NewVacancyForm />
      </section>

      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-ink">
          Existing vacancies
        </h2>
        <VacancyList vacancies={rows} />
      </section>
    </main>
  );
}
