import { z } from "zod";

// Prompt text lives here, never inline in routes (see CLAUDE.md). Ported
// from kindly-prototype-v4.jsx per the dev brief's Appendix A; bump
// PROMPTS_VERSION whenever prompt wording changes.
export const PROMPTS_VERSION = "v1";

export interface CompanyProfileInput {
  about: string;
  values: string;
  voice: string;
}

// Parses the model's JSON response for buildBrandShellPrompt. Field
// descriptions mirror the five lines requested in the prompt below.
export const brandShellSchema = z.object({
  warm_line: z.string().min(1),
  closing_active: z.string().min(1),
  closing_other: z.string().min(1),
  closing_no: z.string().min(1),
  talent_line: z.string().min(1),
});

export type BrandShellOutput = z.infer<typeof brandShellSchema>;

function orNotProvided(value: string): string {
  return value.trim() || "not provided";
}

// Ported from brandShell() in kindly-prototype-v4.jsx. Drafts the five fixed
// lines of a company's rejection email shell (brief §2.2, §6c): the warm
// opening line, the three closing choices, and the talent-link invitation
// line. These are reviewed and edited by an admin before activation — this
// prompt only produces the first draft.
export function buildBrandShellPrompt(
  profile: CompanyProfileInput,
  companyName: string,
): string {
  return `You are writing the FIXED template lines of a candidate rejection email for ${companyName}. These lines are approved once by the employer brand team and reused for every candidate, so they must be brand-perfect and legally safe.

COMPANY PROFILE:
- About: ${orNotProvided(profile.about)}
- Values & behaviours: ${orNotProvided(profile.values)}
- Employer brand voice & style: ${orNotProvided(profile.voice)}

Write these five lines in the company's voice:
1. "warm_line" — one sentence that follows "Thank you for applying/interviewing for the [role] role at ${companyName}." and acknowledges the effort candidates put in. Human, not grovelling.
2. "closing_active" — one or two sentences actively encouraging this candidate to apply again (careers page mention welcome).
3. "closing_other" — one sentence warmly leaving the door open for other roles.
4. "closing_no" — one sentence wishing them well, kind but not encouraging reapplication.
5. "talent_line" — one sentence inviting the candidate to register their interest in hearing about similar roles when they come up. It will be followed immediately by a link, so end it naturally leading into a URL (e.g. "...you can register your interest here:").

RULES: UK English. No "unfortunately", "we regret", "after careful consideration". No exclamation marks unless the voice clearly calls for them. Sound like the company, not like HR software. Keep each line short.

Respond ONLY with JSON, no markdown fences: {"warm_line": "...", "closing_active": "...", "closing_other": "...", "closing_no": "...", "talent_line": "..."}`;
}

// Parses the model's JSON response for buildExtractSkillsPrompt. Tolerates
// 3-8 entries even though the prompt asks for 5-6, since models sometimes
// drift by one or two.
export const extractSkillsSchema = z
  .array(z.string().trim().min(1).max(60))
  .min(3)
  .max(8);

export type ExtractSkillsOutput = z.infer<typeof extractSkillsSchema>;

// Ported from extractSkills() in kindly-prototype-v4.jsx. Extracts 5-6
// comparison skills from a pasted JD (brief §2.3, §6c) to become a
// vacancy's skill chips; recruiters can edit, add, or remove them after.
export function buildExtractSkillsPrompt(
  jdText: string,
  roleTitle: string,
): string {
  return `From this job description for "${roleTitle}", extract the 5-6 most important skills, experience areas or traits a recruiter would compare candidates on. Keep each one short (2-5 words), concrete, and taken from the JD itself (e.g. "stakeholder management", "TikTok content production", "budget ownership"). Respond ONLY with a JSON array of strings, nothing else — no preamble, no markdown.

JOB DESCRIPTION:
${jdText}`;
}

export type Tone = "warm" | "professional";

export interface GenerateMiddleAnswers {
  roleTitle: string;
  stage: string;
  reasonLabel: string;
  reasonSkill: string; // "" if the reason doesn't need a skill chip
  reasonDetail: string; // "" if the recruiter left no note
  strength: string;
  strengthDetail: string; // "" if the recruiter left no note
}

// Parses the model's JSON response for buildGenerateMiddlePrompt.
export const generateMiddleSchema = z.object({
  middle: z.string().min(1),
});

export type GenerateMiddleOutput = z.infer<typeof generateMiddleSchema>;

// Appended to the prompt on a Layer 1 schema-check retry (brief §6a step 4:
// "one silent retry with JSON-only instruction appended").
export const JSON_ONLY_RETRY_INSTRUCTION =
  "Your last response was not valid JSON. Respond ONLY with the JSON object, nothing else — no markdown fences, no preamble, no explanation.";

// Appended on a Layer 2 regenerate (brief §6a step 5: "one regenerate with
// the hit as an explicit avoid-instruction").
export function buildRegexAvoidInstruction(hits: string[]): string {
  const list = hits.map((hit) => `"${hit}"`).join(", ");
  return `Your previous attempt used this banned wording: ${list}. Do not use it or anything similar — rewrite the sentences from scratch avoiding that phrasing entirely.`;
}

// Appended on a Layer 3 regenerate (brief §6a step 6: "one regenerate with
// reason appended").
export function buildClassifierAvoidInstruction(reason: string): string {
  return `Your previous attempt was flagged for compliance: ${reason} Rewrite the sentences from scratch so they cannot be read this way, while still following all the rules above.`;
}

function toneInstruction(tone: Tone): string {
  return tone === "warm"
    ? "warm and personal — the recruiter got to know this candidate"
    : "professional and courteous — contact was limited";
}

function generateMiddleProfileBlock(profile: CompanyProfileInput): string {
  const parts: string[] = [];
  if (profile.about.trim()) {
    parts.push(`- About the company: ${profile.about.trim()}`);
  }
  if (profile.values.trim()) {
    parts.push(`- Values & behaviours: ${profile.values.trim()}`);
  }
  if (profile.voice.trim()) {
    parts.push(`- Employer brand voice & style: ${profile.voice.trim()}`);
  }
  return parts.length
    ? `\nCOMPANY PROFILE (write in this company's voice):\n${parts.join("\n")}\n`
    : "";
}

// Ported from generateMiddle() in kindly-prototype-v4.jsx. Writes the only
// free-form text in a single-mode email: 2-3 personalised sentences from a
// recruiter's tapped answers (brief §6a step 2). extraInstructions carries
// the retry/avoid-instruction mechanics added per §6 (e.g.
// JSON_ONLY_RETRY_INSTRUCTION or buildRegexAvoidInstruction's output) —
// appended to the same base prompt rather than rewriting it from scratch.
export function buildGenerateMiddlePrompt(
  answers: GenerateMiddleAnswers,
  profile: CompanyProfileInput,
  tone: Tone,
  extraInstructions: string[] = [],
): string {
  const base = `You write the personalised middle section of a candidate rejection email for a UK employer. You will receive structured answers a recruiter tapped in, plus a company profile. Turn the answers into EXACTLY 2-3 warm, human sentences in the company's voice.
${generateMiddleProfileBlock(profile)}
HARD RULES:
- UK English. Plain, kind, specific. Write like a thoughtful person at this company, not HR boilerplate.
- Match the employer brand voice and style above. If a company value or behaviour genuinely connects to the candidate's strength, you may echo its language naturally — never bolt values on artificially or name-check them like a checklist.
- BANNED phrases: "unfortunately", "we regret", "after careful consideration", "at this time", "we wish you the best" (the template handles closings).
- NEVER mention or imply age, health, disability, family circumstances, employment gaps, nationality, or any protected characteristic.
- Frame the decision around the strength of the field and the specific requirement — e.g. "other applicants brought more hands-on experience of X" — never as the candidate's personal deficiency or failure.
- Genuinely acknowledge their specific strength; make it feel noticed, not generic.
- Do not promise feedback calls, do not apologise excessively, do not repeat the candidate's name.
- Do not write a greeting or sign-off. Middle sentences only.
- Tone: ${toneInstruction(tone)}.

RECRUITER'S ANSWERS:
- Role: ${answers.roleTitle}
- Stage reached: ${answers.stage}
- Reason for rejection: ${answers.reasonLabel}${answers.reasonSkill ? ` — specifically: ${answers.reasonSkill}` : ""}${answers.reasonDetail ? ` (recruiter's note: ${answers.reasonDetail})` : ""}
- Their standout strength: ${answers.strength}${answers.strengthDetail ? ` (recruiter's note: ${answers.strengthDetail})` : ""}`;

  const extra = extraInstructions.length
    ? `\n\n${extraInstructions.join("\n")}`
    : "";

  return `${base}${extra}\n\nRespond ONLY with JSON, no markdown fences: {"middle": "your 2-3 sentences"}`;
}

// Parses the model's JSON response for buildClassifierPrompt.
export const classifierSchema = z.object({
  flag: z.boolean(),
  reason: z.string().optional().default(""),
});

export type ClassifierOutput = z.infer<typeof classifierSchema>;

// Layer 3 of the guardrail pipeline (brief §6a step 6). Not ported from the
// prototype — no classifier layer exists there — authored from the
// brief's description: flags text that states or indirectly implies a
// protected characteristic, canonical example "more recent experience"
// implying age. Runs on the cheaper Haiku model (brief §3).
export function buildClassifierPrompt(middleText: string): string {
  return `You are a compliance classifier reviewing a paragraph from a UK candidate rejection email. Decide whether it states, or indirectly implies, a protected characteristic — age, disability, pregnancy or maternity, marital status, religion, race or nationality, sex, sexual orientation, or gender reassignment.

The canonical case to catch: a phrase like "more recent experience" never says "age" but indirectly implies it. Flag indirect implications, not just explicit mentions.

PARAGRAPH:
"""
${middleText}
"""

Respond ONLY with JSON, no markdown fences: {"flag": true or false, "reason": "one short sentence explaining what was flagged, or an empty string if flag is false"}`;
}
