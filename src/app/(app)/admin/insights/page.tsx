import { redirect } from "next/navigation";
import { summarizeGenerations } from "@/lib/insights";
import { createClient } from "@/lib/supabase/server";

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
      {hint && <p className="mt-1 text-sm text-ink-muted">{hint}</p>}
    </div>
  );
}

function formatMs(ms: number | null): string {
  if (ms === null) return "—";
  return `${Math.round(ms / 1000)}s`;
}

function formatCount(n: number | null): string {
  return n === null ? "—" : String(n);
}

function formatPercent(pct: number | null): string {
  return pct === null ? "—" : `${pct}%`;
}

// Brief §7: MVP-simple, big numbers, one page. Admin-only (matches
// Template Studio's gating) — this is aggregate company-wide reporting,
// not something every recruiter needs day to day.
export default async function InsightsPage() {
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

  const { data: rows } = await supabase
    .from("generations")
    .select("mode, ms_to_generate, edit_distance, closing, talent_link_included, copied_at")
    .eq("company_id", member.company_id);

  const summary = summarizeGenerations(rows ?? []);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold text-ink">Insights</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Aggregate numbers across every rejection email this company has
          generated.
        </p>
      </div>

      {summary.totalGenerated === 0 ? (
        <p className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-muted">
          No emails generated yet — numbers will appear here once the team
          starts writing rejections.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatTile
              label="Emails generated"
              value={formatCount(summary.totalGenerated)}
              hint={`${summary.singleCount} single · ${summary.triageCount} triage`}
            />
            <StatTile
              label="Median time to write"
              value={formatMs(summary.medianMsToGenerate)}
            />
            <StatTile
              label="Median edit distance"
              value={formatCount(summary.medianEditDistance)}
              hint={`across ${summary.copiedCount} copied email${summary.copiedCount === 1 ? "" : "s"}`}
            />
            <StatTile
              label="Copied unedited"
              value={formatPercent(summary.percentCopiedUnedited)}
            />
            <StatTile
              label="Talent-link inclusion rate"
              value={formatPercent(summary.talentLinkInclusionRatePercent)}
            />
          </div>

          <div className="rounded-2xl border border-border bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Closing split
            </p>
            <div className="mt-3 flex flex-wrap gap-6">
              <div>
                <p className="text-2xl font-bold text-ink">
                  {summary.closingSplitPercent.active}%
                </p>
                <p className="text-sm text-ink-muted">
                  Actively encourage reapplying
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-ink">
                  {summary.closingSplitPercent.other}%
                </p>
                <p className="text-sm text-ink-muted">
                  Door open — other roles
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-ink">
                  {summary.closingSplitPercent.no}%
                </p>
                <p className="text-sm text-ink-muted">Not right now</p>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
