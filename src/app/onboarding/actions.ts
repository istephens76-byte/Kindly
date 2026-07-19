"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
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

  redirect("/dashboard");
}
