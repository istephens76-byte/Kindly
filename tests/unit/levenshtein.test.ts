import { describe, expect, it } from "vitest";
import { levenshteinDistance } from "../../src/lib/levenshtein";

describe("levenshteinDistance", () => {
  it("is 0 for identical strings", () => {
    expect(levenshteinDistance("hello", "hello")).toBe(0);
  });

  it("equals the length of the other string when one is empty", () => {
    expect(levenshteinDistance("", "hello")).toBe(5);
    expect(levenshteinDistance("hello", "")).toBe(5);
  });

  it("counts a single substitution as 1", () => {
    expect(levenshteinDistance("cat", "bat")).toBe(1);
  });

  it("counts a single insertion as 1", () => {
    expect(levenshteinDistance("cat", "cats")).toBe(1);
  });

  it("counts a single deletion as 1", () => {
    expect(levenshteinDistance("cats", "cat")).toBe(1);
  });

  it("handles completely different strings", () => {
    expect(levenshteinDistance("kitten", "sitting")).toBe(3);
  });

  it("is symmetric", () => {
    expect(levenshteinDistance("abc", "xyz")).toBe(
      levenshteinDistance("xyz", "abc"),
    );
  });
});
