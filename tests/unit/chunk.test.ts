import { describe, expect, it } from "vitest";
import { chunk } from "../../src/lib/chunk";

describe("chunk", () => {
  it("splits evenly divisible arrays", () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("puts the remainder in a smaller final chunk", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns one chunk when size exceeds the array length", () => {
    expect(chunk([1, 2], 15)).toEqual([[1, 2]]);
  });

  it("returns an empty array for an empty input", () => {
    expect(chunk([], 15)).toEqual([]);
  });

  it("chunks 12 candidates into a single chunk of 15", () => {
    const candidates = Array.from({ length: 12 }, (_, i) => i);
    expect(chunk(candidates, 15)).toEqual([candidates]);
  });

  it("chunks 32 candidates into three chunks of 15/15/2", () => {
    const candidates = Array.from({ length: 32 }, (_, i) => i);
    const result = chunk(candidates, 15);
    expect(result.map((c) => c.length)).toEqual([15, 15, 2]);
  });

  it("throws on a non-positive size", () => {
    expect(() => chunk([1, 2], 0)).toThrow();
  });
});
