import { describe, expect, it } from "vitest";
import {
  summarizeGenerations,
  type GenerationInsightRow,
} from "../../src/lib/insights";

function row(overrides: Partial<GenerationInsightRow> = {}): GenerationInsightRow {
  return {
    mode: "single",
    ms_to_generate: 1000,
    edit_distance: null,
    closing: "other",
    talent_link_included: false,
    copied_at: null,
    ...overrides,
  };
}

describe("summarizeGenerations", () => {
  it("returns all-null/zero for an empty set", () => {
    const summary = summarizeGenerations([]);
    expect(summary.totalGenerated).toBe(0);
    expect(summary.medianMsToGenerate).toBeNull();
    expect(summary.medianEditDistance).toBeNull();
    expect(summary.percentCopiedUnedited).toBeNull();
    expect(summary.talentLinkInclusionRatePercent).toBeNull();
    expect(summary.closingSplitPercent).toEqual({ active: 0, other: 0, no: 0 });
  });

  it("splits counts by mode", () => {
    const summary = summarizeGenerations([
      row({ mode: "single" }),
      row({ mode: "single" }),
      row({ mode: "triage" }),
    ]);
    expect(summary.totalGenerated).toBe(3);
    expect(summary.singleCount).toBe(2);
    expect(summary.triageCount).toBe(1);
  });

  it("computes the median generation time for an odd count", () => {
    const summary = summarizeGenerations([
      row({ ms_to_generate: 1000 }),
      row({ ms_to_generate: 3000 }),
      row({ ms_to_generate: 2000 }),
    ]);
    expect(summary.medianMsToGenerate).toBe(2000);
  });

  it("computes the median generation time for an even count", () => {
    const summary = summarizeGenerations([
      row({ ms_to_generate: 1000 }),
      row({ ms_to_generate: 2000 }),
      row({ ms_to_generate: 3000 }),
      row({ ms_to_generate: 4000 }),
    ]);
    expect(summary.medianMsToGenerate).toBe(2500);
  });

  it("only considers copied rows for edit distance and unedited rate", () => {
    const summary = summarizeGenerations([
      row({ copied_at: "2026-01-01T00:00:00Z", edit_distance: 0 }),
      row({ copied_at: "2026-01-01T00:00:00Z", edit_distance: 10 }),
      row({ copied_at: null, edit_distance: null }),
    ]);
    expect(summary.copiedCount).toBe(2);
    expect(summary.medianEditDistance).toBe(5);
    expect(summary.percentCopiedUnedited).toBe(50);
  });

  it("returns null percentCopiedUnedited when nothing has been copied yet", () => {
    const summary = summarizeGenerations([row(), row()]);
    expect(summary.copiedCount).toBe(0);
    expect(summary.medianEditDistance).toBeNull();
    expect(summary.percentCopiedUnedited).toBeNull();
  });

  it("computes the closing split as percentages of the total", () => {
    const summary = summarizeGenerations([
      row({ closing: "active" }),
      row({ closing: "other" }),
      row({ closing: "other" }),
      row({ closing: "no" }),
    ]);
    expect(summary.closingSplitPercent).toEqual({
      active: 25,
      other: 50,
      no: 25,
    });
  });

  it("computes the talent-link inclusion rate", () => {
    const summary = summarizeGenerations([
      row({ talent_link_included: true }),
      row({ talent_link_included: true }),
      row({ talent_link_included: false }),
      row({ talent_link_included: false }),
    ]);
    expect(summary.talentLinkInclusionRatePercent).toBe(50);
  });
});
