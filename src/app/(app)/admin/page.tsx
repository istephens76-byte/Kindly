import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewTemplateButton } from "./new-template-button";
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
      <div>
        <h1 className="text-2xl font-bold text-ink">Template Studio</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Set up your company profile, then create your rejection email
          template.
        </p>
      </div>

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
        <div className="mt-6 border-t border-border pt-4">
          <p className="mb-3 text-sm text-ink-muted">
            Once your profile&apos;s saved, create your rejection email
            template in your voice.
          </p>
          <NewTemplateButton />
        </div>
      </section>

      <section
        id="shell-section"
        className="rounded-2xl border border-border bg-white p-6"
      >
        <h2 className="mb-1 text-lg font-semibold text-ink">
          Rejection email shell
        </h2>
        <p className="mb-4 text-sm text-ink-muted">
          Use the AI-drafted lines as they are, or edit any line below to
          match your voice — nothing reaches candidates until you activate a
          version.
        </p>
        <ShellEditor shells={shellsResult.data ?? []} />
      </section>

      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="mb-1 text-lg font-semibold text-ink">Taxonomies</h2>
        <p className="mb-4 text-sm text-ink-muted">
          The tappable chips recruiters choose from when writing a rejection
          email.
        </p>
        <TaxonomyManager rows={taxonomiesResult.data ?? []} />
      </section>

      <div className="flex justify-center">
        <Link
          href="/vacancies"
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white"
        >
          Go to Vacancies →
        </Link>
      </div>
    </main>
  );
}
