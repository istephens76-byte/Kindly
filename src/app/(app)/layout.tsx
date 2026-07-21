import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";

// Wraps every authenticated page (dashboard, admin, vacancies, and the
// generate flow) with a persistent header linking to the app's main
// sections. Added after a recruiter could reach the generate page, create
// an email, and then have no way back except the browser's back button —
// this replaces the one-off "back" links that used to live on individual
// pages (easy to add a new page and forget one, which is exactly what
// happened) with a single place that can't be missed.
//
// Each page still does its own auth/company/role guard and redirect; this
// layout does a lightweight lookup of its own just to decide what to show
// in the nav, and simply renders children without the header if there's no
// signed-in company member — the page's own redirect handles that case.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const member = user
    ? (
        await supabase
          .from("users")
          .select("company_id, role")
          .eq("id", user.id)
          .maybeSingle()
      ).data
    : null;

  if (!member) {
    return <>{children}</>;
  }

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", member.company_id)
    .maybeSingle();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border bg-white">
        <nav className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/dashboard" className="text-sm font-bold text-ink">
            {company?.name ?? "Kindly"}
          </Link>
          <div className="flex flex-wrap items-center gap-4 text-sm font-semibold">
            <Link
              href="/dashboard"
              className="text-ink-muted hover:text-accent-dark"
            >
              Dashboard
            </Link>
            {member.role === "admin" && (
              <Link
                href="/admin"
                className="text-ink-muted hover:text-accent-dark"
              >
                Template Studio
              </Link>
            )}
            <Link
              href="/vacancies"
              className="text-ink-muted hover:text-accent-dark"
            >
              Vacancies
            </Link>
            {member.role === "admin" && (
              <Link
                href="/admin/insights"
                className="text-ink-muted hover:text-accent-dark"
              >
                Insights
              </Link>
            )}
            <SignOutButton />
          </div>
        </nav>
      </header>
      {children}
      <footer className="border-t border-border px-4 py-4 text-center text-xs text-ink-muted">
        <Link href="/privacy" className="hover:text-accent-dark hover:underline">
          Privacy notice
        </Link>
      </footer>
    </div>
  );
}
