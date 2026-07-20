// Layer 2 of the guardrail pipeline (brief §6a step 5): a case-insensitive
// scan for banned phrasing and protected-characteristic terms. Hard hits
// force a mandatory regenerate; the soft-flag pattern doesn't block on its
// own — it exists so Layer 3 (the classifier) has extra signal, per the
// brief's canonical example of "recent experience" implying age.

const BANNED_PHRASES = [
  "unfortunately",
  "we regret",
  "after careful consideration",
  "at this time",
  "we wish you the best",
  "recent experience",
  "recently qualified",
];

const HARD_BLOCK_TERMS = [
  "health",
  "disability",
  "disabled",
  "pregnan",
  "maternity",
  "paternity",
  "married",
  "marital",
  "religion",
  "religious",
  "nationality",
  "visa",
  "accent",
];

const HARD_BLOCK_PATTERNS = [/gap in (your|their) (cv|career|employment)/i];

const SOFT_FLAG_PATTERN = /\b(young|older|age|recent)\b/i;

export interface GuardrailScanResult {
  hardHits: string[];
  softHit: boolean;
}

export function scanGuardrails(text: string): GuardrailScanResult {
  const lower = text.toLowerCase();
  const hardHits: string[] = [];

  for (const phrase of [...BANNED_PHRASES, ...HARD_BLOCK_TERMS]) {
    if (lower.includes(phrase)) {
      hardHits.push(phrase);
    }
  }

  for (const pattern of HARD_BLOCK_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      hardHits.push(match[0]);
    }
  }

  return { hardHits, softHit: SOFT_FLAG_PATTERN.test(text) };
}
