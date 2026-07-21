// Pure aggregation for the /admin/insights dashboard (brief §7, MVP-simple
// "big numbers, one page"). Kept separate from the page component so the
// arithmetic — medians, percentages, closing split — is unit-testable
// without a live Supabase query.

export interface GenerationInsightRow {
  mode: "single" | "triage";
  ms_to_generate: number;
  edit_distance: number | null;
  closing: "active" | "other" | "no";
  talent_link_included: boolean;
  copied_at: string | null;
}

export interface InsightsSummary {
  totalGenerated: number;
  singleCount: number;
  triageCount: number;
  medianMsToGenerate: number | null;
  copiedCount: number;
  medianEditDistance: number | null;
  percentCopiedUnedited: number | null;
  closingSplitPercent: { active: number; other: number; no: number };
  talentLinkInclusionRatePercent: number | null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// null (not 0) when there's nothing to divide by, so the page can render
// "—" instead of a misleading 0%.
function percent(count: number, total: number): number | null {
  if (total === 0) return null;
  return Math.round((count / total) * 100);
}

export function summarizeGenerations(
  rows: GenerationInsightRow[],
): InsightsSummary {
  const totalGenerated = rows.length;
  const singleCount = rows.filter((r) => r.mode === "single").length;
  const triageCount = rows.filter((r) => r.mode === "triage").length;

  const medianMsToGenerate = median(rows.map((r) => r.ms_to_generate));

  const copiedRows = rows.filter((r) => r.copied_at !== null);
  const copiedCount = copiedRows.length;
  const editDistances = copiedRows
    .map((r) => r.edit_distance)
    .filter((d): d is number => d !== null);
  const medianEditDistance = median(editDistances);
  const uneditedCount = copiedRows.filter(
    (r) => r.edit_distance === 0,
  ).length;
  const percentCopiedUnedited = percent(uneditedCount, copiedCount);

  const closingCounts = { active: 0, other: 0, no: 0 };
  for (const row of rows) closingCounts[row.closing] += 1;
  const closingSplitPercent = {
    active: percent(closingCounts.active, totalGenerated) ?? 0,
    other: percent(closingCounts.other, totalGenerated) ?? 0,
    no: percent(closingCounts.no, totalGenerated) ?? 0,
  };

  const talentLinkCount = rows.filter((r) => r.talent_link_included).length;
  const talentLinkInclusionRatePercent = percent(
    talentLinkCount,
    totalGenerated,
  );

  return {
    totalGenerated,
    singleCount,
    triageCount,
    medianMsToGenerate,
    copiedCount,
    medianEditDistance,
    percentCopiedUnedited,
    closingSplitPercent,
    talentLinkInclusionRatePercent,
  };
}
