// Ported from buildSingleEmail() in kindly-prototype-v4.jsx. Deterministic
// assembly (brief §6a step 7) — no AI involved here, just the fixed shell
// text plus the AI-written middle, stitched together the same way every
// time. Note this never includes REVIEWED_LINE: that sentence is only ever
// true for triage mode, where a human tapped a reason per candidate (see
// brief §0, §6b, Appendix B).

// Exported so the generate form's live preview (which shows this line
// updating before the AI middle exists) can stay in sync with the real
// assembly logic below, instead of re-deriving it separately.
export function singleOpening(
  stage: string,
  roleTitle: string,
  companyName: string,
): string {
  if (stage === "CV / application review") {
    return `Thank you for applying for the ${roleTitle} role with us at ${companyName}.`;
  }
  const verb = stage === "Phone screen" ? "speak with us" : "interview with us";
  return `Thank you for taking the time to ${verb} for the ${roleTitle} role at ${companyName}.`;
}

export interface SingleEmailInput {
  candidateFirstName: string;
  roleTitle: string;
  stage: string;
  companyName: string;
  warmLine: string;
  middle: string;
  closingText: string;
  talentLine: string;
  talentLinkUrl: string;
  talentLinkIncluded: boolean;
  senderName: string;
}

export function buildSingleEmail(input: SingleEmailInput): string {
  const talentBlock = `${input.talentLine} ${input.talentLinkUrl}`;
  const opening = singleOpening(input.stage, input.roleTitle, input.companyName);

  return `Hi ${input.candidateFirstName},\n\n${opening} ${input.warmLine}\n\n${input.middle}\n\n${input.closingText}${
    input.talentLinkIncluded ? `\n\n${talentBlock}` : ""
  }\n\nThanks again for your interest in ${input.companyName}.\n\nBest wishes,\n${input.senderName}`;
}

// Fixed, not editable in MVP (brief §5). Only true because a human tapped
// the deciding requirement per candidate — never rendered on single-mode
// emails (see the note at the top of this file).
export const REVIEWED_LINE =
  "Your application was individually reviewed by our recruitment team against the requirements for this role.";

export interface TriageEmailInput {
  candidateFirstName: string;
  roleTitle: string;
  companyName: string;
  warmLine: string;
  middle: string;
  closingText: string;
  talentLine: string;
  talentLinkUrl: string;
  talentLinkIncluded: boolean;
  senderName: string;
}

// Ported from buildTriageEmail() in kindly-prototype-v4.jsx (brief §6b
// step 4). CV-stage opening (no stage variants — triage is always at CV
// stage) plus the reviewed line, which is what makes it honest to state.
export function buildTriageEmail(input: TriageEmailInput): string {
  const talentBlock = `${input.talentLine} ${input.talentLinkUrl}`;

  return `Hi ${input.candidateFirstName},\n\nThank you for applying for the ${input.roleTitle} role at ${input.companyName}. ${REVIEWED_LINE} ${input.warmLine}\n\n${input.middle}\n\n${input.closingText}${
    input.talentLinkIncluded ? `\n\n${talentBlock}` : ""
  }\n\nThanks again for your interest in ${input.companyName}.\n\nBest wishes,\n${input.senderName}`;
}
