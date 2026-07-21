import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const WINDOW_MS = 60_000;

// Brief §8 non-functional requirement: rate limit generation routes per
// user against runaway cost (e.g. 30 single/min; 5 triage batches/min).
// Backed by the generations audit table itself rather than new
// infrastructure — every successful generation is already a row there.
export const SINGLE_RATE_LIMIT_PER_MINUTE = 30;
export const TRIAGE_RATE_LIMIT_PER_MINUTE = 5;

export async function singleGenerationsInLastMinute(
  supabase: Supabase,
  userId: string,
): Promise<number> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("mode", "single")
    .gte("created_at", since);
  return count ?? 0;
}

// Counts distinct batches, not rows — a 15-candidate triage batch is one
// unit against the limit, not 15.
export async function triageBatchesInLastMinute(
  supabase: Supabase,
  userId: string,
): Promise<number> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { data } = await supabase
    .from("generations")
    .select("batch_id")
    .eq("user_id", userId)
    .eq("mode", "triage")
    .gte("created_at", since);
  return new Set((data ?? []).map((row) => row.batch_id)).size;
}
