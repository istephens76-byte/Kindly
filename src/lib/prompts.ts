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
