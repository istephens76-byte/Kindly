import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Server-only Anthropic client. `import "server-only"` makes an accidental
// client import a build error rather than an API-key leak (see CLAUDE.md:
// ANTHROPIC_API_KEY never reaches the client).
export function createAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing required env var: ANTHROPIC_API_KEY");
  }
  return new Anthropic({ apiKey });
}

// Model per kindly-dev-brief.md §3: claude-sonnet-4-6 for generation and
// extraction. A guardrail classifier pass (Phase 4) uses Haiku for cost.
export const GENERATION_MODEL = "claude-sonnet-4-6";
