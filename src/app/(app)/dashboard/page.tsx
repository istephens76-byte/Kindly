import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Scoped by RLS to this user's own company row — this query is the
  // thing the cross-tenant isolation test exercises.
  const { data: membership } = await supabase
    .from("users")
    .select("company_id, role, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!membership) {
    redirect("/onboarding");
  }

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", membership.company_id)
    .maybeSingle();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6">
        <h1 className="text-2xl font-bold text-ink">
          {company?.name ?? "Your company"}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Signed in as {membership.display_name} · {membership.role}
        </p>
        {membership.role === "admin" && (
          <Link
            href="/admin"
            className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Go to Template Studio
          </Link>
        )}
      </div>
    </main>
  );
}
