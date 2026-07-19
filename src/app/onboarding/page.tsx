import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateCompanyForm } from "./create-company-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: existingMembership } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingMembership) {
    redirect("/dashboard");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-6">
        <h1 className="text-2xl font-bold text-ink">Create your company</h1>
        <p className="mt-1 text-sm text-ink-muted">
          You&apos;ll be the first admin. You can invite teammates later.
        </p>
        <CreateCompanyForm />
      </div>
    </main>
  );
}
