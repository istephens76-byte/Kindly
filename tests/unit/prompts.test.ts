import { describe, expect, it } from "vitest";
import { brandShellSchema, buildBrandShellPrompt } from "../../src/lib/prompts";

describe("buildBrandShellPrompt", () => {
  it("includes the company name and profile fields", () => {
    const prompt = buildBrandShellPrompt(
      { about: "We build widgets.", values: "Curiosity", voice: "Friendly" },
      "Acme",
    );
    expect(prompt).toContain("Acme");
    expect(prompt).toContain("We build widgets.");
    expect(prompt).toContain("Curiosity");
    expect(prompt).toContain("Friendly");
  });

  it("falls back to 'not provided' for empty profile fields", () => {
    const prompt = buildBrandShellPrompt(
      { about: "", values: "   ", voice: "" },
      "Acme",
    );
    expect(prompt.match(/not provided/g)).toHaveLength(3);
  });
});

describe("brandShellSchema", () => {
  it("accepts a well-formed model response", () => {
    const result = brandShellSchema.safeParse({
      warm_line: "Thanks for applying.",
      closing_active: "Please apply again.",
      closing_other: "Other roles may suit you.",
      closing_no: "We wish you well.",
      talent_line: "Register your interest here:",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a response missing a required line", () => {
    const result = brandShellSchema.safeParse({
      warm_line: "Thanks for applying.",
      closing_active: "Please apply again.",
      closing_other: "Other roles may suit you.",
      closing_no: "We wish you well.",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty strings", () => {
    const result = brandShellSchema.safeParse({
      warm_line: "",
      closing_active: "Please apply again.",
      closing_other: "Other roles may suit you.",
      closing_no: "We wish you well.",
      talent_line: "Register your interest here:",
    });
    expect(result.success).toBe(false);
  });
});
