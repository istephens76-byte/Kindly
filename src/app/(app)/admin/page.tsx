import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";
import { ShellEditor } from "./shell-editor";
import { TaxonomyManager } from "./taxonomy-manager";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: member } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!member) {
    redirect("/onboarding");
  }

  if (member.role !== "admin") {
    redirect("/dashboard");
  }

  const [companyResult, profileResult, shellsResult, taxonomiesResult] =
    await Promise.all([
      supabase
        .from("companies")
        .select("name")
        .eq("id", member.company_id)
        .single(),
      supabase
        .from("company_profiles")
        .select("about, values, voice, sender_name, talent_link_url")
        .eq("company_id", member.company_id)
        .maybeSingle(),
      supabase
        .from("shells")
        .select(
          "id, version, status, warm_line, closing_active, closing_other, closing_no, talent_line, created_at",
        )
        .eq("company_id", member.company_id)
        .order("version", { ascending: false }),
      supabase
        .from("taxonomies")
        .select("id, kind, label, needs_skill, archived")
        .eq("company_id", member.company_id)
        .order("sort_order", { ascending: true }),
    ]);

  const profile = profileResult.data ?? {
    about: "",
    values: "",
    voice: "",
    sender_name: "",
    talent_link_url: "",
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <h1 className="text-2xl font-bold text-ink">Template Studio</h1>

      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-ink">
          Company profile
        </h2>
        <ProfileForm
          initial={{
            companyName: companyResult.data?.name ?? "",
            about: profile.about,
            values: profile.values,
            voice: profile.voice,
            senderName: profile.sender_name,
            talentLinkUrl: profile.talent_link_url,
          }}
        />
      </section>

      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-ink">
          Rejection email shell
        </h2>
        <ShellEditor shells={shellsResult.data ?? []} />
      </section>

      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-ink">Taxonomies</h2>
        <TaxonomyManager rows={taxonomiesResult.data ?? []} />
      </section>
    </main>
  );
}
