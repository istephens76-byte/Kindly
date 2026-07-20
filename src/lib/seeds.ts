// Seed content for a brand-new company (dev brief §5). This is the
// product's approved starting point, not AI-drafted — a company gets a
// live shell and usable taxonomies from the moment it signs up, before an
// admin ever visits the Template Studio.

export const DEFAULT_SHELL_LINES = {
  warm_line:
    "We know how much effort goes into every application, and we don't take yours for granted.",
  closing_active:
    "We'd genuinely like to see you apply again — please keep an eye on our careers page, and do mention this application if you do.",
  closing_other:
    "We'd be happy to see your name come up for other roles with us in the future.",
  closing_no: "We wish you every success with your search.",
  talent_line:
    "If you'd like to hear about similar roles when they come up, you can register your interest here:",
};

export const DEFAULT_REASONS = [
  { label: "Others had more hands-on experience in…", needsSkill: true },
  { label: "We needed deeper capability in…", needsSkill: true },
  { label: "Stronger evidence from others of…", needsSkill: true },
  {
    label: "Role requirements changed or the role was paused",
    needsSkill: false,
  },
  {
    label: "A later-stage candidate was already close to offer",
    needsSkill: false,
  },
];

export const DEFAULT_STRENGTHS = [
  "Communication",
  "Enthusiasm for the role",
  "Interview preparation",
  "Relevant experience",
  "Portfolio / work examples",
  "Great questions asked",
];
