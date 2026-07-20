"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  DEFAULT_REASONS,
  DEFAULT_SHELL_LINES,
  DEFAULT_STRENGTHS,
} from "@/lib/seeds";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface CreateCompanyState {
  error?: string;
}

const schema = z.object({
  companyName: z.string().trim().min(1, "Company name is required").max(200),
});

export async function createCompany(
  _prevState: CreateCompanyState,
  formData: FormData,
): Promise<CreateCompanyState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const parsed = schema.safeParse({
    companyName: formData.get("companyName"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Writes go through the service-role client, never a client-side insert,
  // so RLS can't be bypassed by a tampered request (see supabase/migrations).
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    redirect("/dashboard");
  }

  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({ name: parsed.data.companyName })
    .select("id")
    .single();

  if (companyError || !company) {
    return { error: "Couldn't create the company — try again." };
  }

  const { error: userError } = await admin.from("users").insert({
    id: user.id,
    company_id: company.id,
    role: "admin",
    display_name: user.email?.split("@")[0] ?? "Admin",
    email: user.email ?? "",
  });

  if (userError) {
    // Don't leave an orphaned company row with no admin attached.
    await admin.from("companies").delete().eq("id", company.id);
    return { error: "Couldn't finish setting up your company — try again." };
  }

  // Seed content (brief §5): a live default shell and starter taxonomies
  // so the company can use Kindly before an admin visits the Template
  // Studio, plus a blank profile row so its defaults (e.g. talent_link_url)
  // show correctly in the admin UI right away.
  const { error: profileError } = await admin
    .from("company_profiles")
    .insert({ company_id: company.id });

  const { error: shellError } = await admin.from("shells").insert({
    company_id: company.id,
    version: 1,
    ...DEFAULT_SHELL_LINES,
    status: "active",
    created_by: user.id,
  });

  const { error: taxonomyError } = await admin.from("taxonomies").insert([
    ...DEFAULT_REASONS.map((reason, index) => ({
      company_id: company.id,
      kind: "reason" as const,
      label: reason.label,
      needs_skill: reason.needsSkill,
      sort_order: index,
    })),
    ...DEFAULT_STRENGTHS.map((label, index) => ({
      company_id: company.id,
      kind: "strength" as const,
      label,
      needs_skill: false,
      sort_order: index,
    })),
  ]);

  if (profileError || shellError || taxonomyError) {
    // Don't leave a half-seeded company behind — cascades users/profile/
    // shells/taxonomies too.
    await admin.from("companies").delete().eq("id", company.id);
    return { error: "Couldn't finish setting up your company — try again." };
  }

  redirect("/dashboard");
}
