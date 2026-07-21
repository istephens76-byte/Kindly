import { describe, expect, it } from "vitest";
import {
  brandShellSchema,
  buildBrandShellPrompt,
  buildClassifierAvoidInstruction,
  buildClassifierPrompt,
  buildExtractSkillsPrompt,
  buildGenerateMiddlePrompt,
  buildRegexAvoidInstruction,
  buildTriageMiddlesPrompt,
  classifierSchema,
  extractSkillsSchema,
  generateMiddleSchema,
  JSON_ONLY_RETRY_INSTRUCTION,
  ROLE_CHANGED_SENTINEL,
  triageMiddlesSchema,
  type GenerateMiddleAnswers,
} from "../../src/lib/prompts";

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

describe("buildExtractSkillsPrompt", () => {
  it("includes the role title and JD text", () => {
    const prompt = buildExtractSkillsPrompt(
      "Own the TikTok content calendar end to end.",
      "Social Media Manager",
    );
    expect(prompt).toContain("Social Media Manager");
    expect(prompt).toContain("Own the TikTok content calendar end to end.");
  });
});

describe("extractSkillsSchema", () => {
  it("accepts 5-6 skills", () => {
    const result = extractSkillsSchema.safeParse([
      "stakeholder management",
      "TikTok content production",
      "budget ownership",
      "campaign reporting",
      "cross-team collaboration",
    ]);
    expect(result.success).toBe(true);
  });

  it("rejects too few skills", () => {
    const result = extractSkillsSchema.safeParse(["one", "two"]);
    expect(result.success).toBe(false);
  });

  it("rejects too many skills", () => {
    const result = extractSkillsSchema.safeParse(
      Array.from({ length: 9 }, (_, i) => `skill ${i}`),
    );
    expect(result.success).toBe(false);
  });

  it("rejects non-string entries", () => {
    const result = extractSkillsSchema.safeParse([
      "one",
      "two",
      "three",
      4,
    ]);
    expect(result.success).toBe(false);
  });
});

const answers: GenerateMiddleAnswers = {
  roleTitle: "Social Media Manager",
  stage: "First interview",
  reasonLabel: "Others had more hands-on experience in…",
  reasonSkill: "paid social campaigns",
  reasonDetail: "",
  strength: "Interview preparation",
  strengthDetail: "",
};

describe("buildGenerateMiddlePrompt", () => {
  it("includes the recruiter's tapped answers", () => {
    const prompt = buildGenerateMiddlePrompt(
      answers,
      { about: "", values: "", voice: "" },
      "warm",
    );
    expect(prompt).toContain("Social Media Manager");
    expect(prompt).toContain("First interview");
    expect(prompt).toContain("paid social campaigns");
    expect(prompt).toContain("Interview preparation");
  });

  it("selects the warm vs professional tone instruction", () => {
    const warmPrompt = buildGenerateMiddlePrompt(
      answers,
      { about: "", values: "", voice: "" },
      "warm",
    );
    const professionalPrompt = buildGenerateMiddlePrompt(
      answers,
      { about: "", values: "", voice: "" },
      "professional",
    );
    expect(warmPrompt).toContain("warm and personal");
    expect(professionalPrompt).toContain("professional and courteous");
  });

  it("omits the profile block entirely when the profile is blank", () => {
    const prompt = buildGenerateMiddlePrompt(
      answers,
      { about: "", values: "", voice: "" },
      "warm",
    );
    expect(prompt).not.toContain("COMPANY PROFILE");
  });

  it("appends extra retry instructions", () => {
    const prompt = buildGenerateMiddlePrompt(
      answers,
      { about: "", values: "", voice: "" },
      "warm",
      [JSON_ONLY_RETRY_INSTRUCTION],
    );
    expect(prompt).toContain(JSON_ONLY_RETRY_INSTRUCTION);
  });
});

describe("generateMiddleSchema", () => {
  it("accepts a well-formed response", () => {
    expect(
      generateMiddleSchema.safeParse({ middle: "Two or three sentences." })
        .success,
    ).toBe(true);
  });

  it("rejects an empty middle", () => {
    expect(generateMiddleSchema.safeParse({ middle: "" }).success).toBe(
      false,
    );
  });

  it("rejects a missing middle", () => {
    expect(generateMiddleSchema.safeParse({}).success).toBe(false);
  });
});

describe("buildRegexAvoidInstruction", () => {
  it("lists each hit", () => {
    const instruction = buildRegexAvoidInstruction([
      "unfortunately",
      "recent experience",
    ]);
    expect(instruction).toContain("unfortunately");
    expect(instruction).toContain("recent experience");
  });
});

describe("buildClassifierAvoidInstruction", () => {
  it("includes the classifier's reason", () => {
    const instruction = buildClassifierAvoidInstruction(
      "Implies age discrimination.",
    );
    expect(instruction).toContain("Implies age discrimination.");
  });
});

describe("buildClassifierPrompt", () => {
  it("includes the paragraph under review", () => {
    const prompt = buildClassifierPrompt("Some middle text.");
    expect(prompt).toContain("Some middle text.");
  });
});

describe("classifierSchema", () => {
  it("accepts a flagged response", () => {
    const result = classifierSchema.safeParse({
      flag: true,
      reason: "Implies age.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an unflagged response with no reason", () => {
    const result = classifierSchema.safeParse({ flag: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe("");
    }
  });

  it("rejects a missing flag", () => {
    expect(classifierSchema.safeParse({ reason: "x" }).success).toBe(false);
  });
});

describe("buildTriageMiddlesPrompt", () => {
  it("includes each candidate's name and skill-based reason", () => {
    const prompt = buildTriageMiddlesPrompt(
      [
        { name: "Priya", skillOrChanged: "paid social campaigns" },
        { name: "Marcus", skillOrChanged: "budget ownership" },
      ],
      "Social Media Manager",
      { about: "", values: "", voice: "" },
    );
    expect(prompt).toContain("Priya");
    expect(prompt).toContain("more hands-on experience of paid social campaigns");
    expect(prompt).toContain("Marcus");
    expect(prompt).toContain("more hands-on experience of budget ownership");
    expect(prompt).toContain("exactly 2 entries");
  });

  it("phrases the role-changed sentinel differently from a skill", () => {
    const prompt = buildTriageMiddlesPrompt(
      [{ name: "Sofia", skillOrChanged: ROLE_CHANGED_SENTINEL }],
      "Social Media Manager",
      { about: "", values: "", voice: "" },
    );
    expect(prompt).toContain(
      "the role requirements changed or the role was paused",
    );
    expect(prompt).not.toContain(ROLE_CHANGED_SENTINEL);
  });

  it("never invokes strengths or interview language (CV-stage only)", () => {
    const prompt = buildTriageMiddlesPrompt(
      [{ name: "Jake", skillOrChanged: "stakeholder management" }],
      "Ops Lead",
      { about: "", values: "", voice: "" },
    );
    expect(prompt).toContain("were not interviewed");
  });

  it("appends extra retry instructions", () => {
    const prompt = buildTriageMiddlesPrompt(
      [{ name: "Jake", skillOrChanged: "stakeholder management" }],
      "Ops Lead",
      { about: "", values: "", voice: "" },
      [JSON_ONLY_RETRY_INSTRUCTION],
    );
    expect(prompt).toContain(JSON_ONLY_RETRY_INSTRUCTION);
  });
});

describe("triageMiddlesSchema", () => {
  it("accepts a well-formed array of middles", () => {
    const result = triageMiddlesSchema.safeParse({
      middles: ["Sentence one.", "Sentence two."],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing middles key", () => {
    expect(triageMiddlesSchema.safeParse({}).success).toBe(false);
  });

  it("rejects an empty string entry", () => {
    const result = triageMiddlesSchema.safeParse({
      middles: ["Sentence one.", ""],
    });
    expect(result.success).toBe(false);
  });
});
