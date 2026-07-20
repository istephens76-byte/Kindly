import { describe, expect, it } from "vitest";
import { scanGuardrails } from "../../src/lib/guardrails";

describe("scanGuardrails", () => {
  it("catches each banned phrase, case-insensitively", () => {
    const phrases = [
      "Unfortunately, we've decided to move forward with others.",
      "We regret to inform you.",
      "After Careful Consideration we chose another candidate.",
      "We can't offer you a role AT THIS TIME.",
      "We wish you the best in your search.",
      "Other candidates had more recent experience in this area.",
      "They were more recently qualified for the role.",
    ];
    for (const text of phrases) {
      expect(scanGuardrails(text).hardHits.length).toBeGreaterThan(0);
    }
  });

  it("catches protected-characteristic terms", () => {
    const phrases = [
      "We were concerned about their health.",
      "Their disability made it difficult to accommodate.",
      "She mentioned she was pregnant during the interview.",
      "He was on paternity leave.",
      "Their religion came up in conversation.",
      "We noted a gap in their CV.",
      "There was a gap in their employment history.",
    ];
    for (const text of phrases) {
      expect(scanGuardrails(text).hardHits.length).toBeGreaterThan(0);
    }
  });

  it("passes clean, on-brief text", () => {
    const text =
      "Other applicants brought more hands-on experience of budget ownership, and we were genuinely impressed by how clearly you presented your portfolio.";
    const result = scanGuardrails(text);
    expect(result.hardHits).toEqual([]);
  });

  it("soft-flags age-adjacent words without hard-blocking them", () => {
    const text = "The role needed someone with more recent hands-on work.";
    const result = scanGuardrails(text);
    expect(result.softHit).toBe(true);
  });

  it("does not soft-flag unrelated text", () => {
    const text = "We were impressed by your interview preparation.";
    expect(scanGuardrails(text).softHit).toBe(false);
  });
});
