@AGENTS.md

# Kindly

Governance tool for candidate rejection emails. **`kindly-dev-brief.md` is the
source of truth** — read it in full before making product or architecture
decisions. `kindly-prototype-v4.jsx` is the UX/prompt reference only (chip
interactions, triage grid, prompt text to port) — never import it or copy its
architecture (it calls the Anthropic API client-side with no persistence,
which this app must not do).

Design principle (non-negotiable, brief §0): **the human decides, Kindly
articulates.** Kindly never scores, ranks, or suggests a candidate decision —
only turns a human's tapped choice into prose.

## Stack

- Next.js (App Router, TypeScript), Vercel
- Supabase: Postgres + RLS + Auth (email magic links)
- Anthropic API, called server-side only
- Tailwind v4 (CSS-first config — tokens live in `src/app/globals.css` under
  `@theme`, not `tailwind.config.ts`)
- zod for all API input and parsed LLM output validation

## Conventions

- **Never define a component inside another component's render body.** This
  caused a real focus-loss bug in the prototype (inputs remounting per
  keystroke) — see brief §3. `eslint-config-next` already enforces this via
  `react-hooks/static-components`; `npm run lint` will fail on a violation.
- All Anthropic calls happen in server routes/actions only. `ANTHROPIC_API_KEY`
  never reaches the client.
- Every table has RLS enabled; policies key off `company_id`. See
  `supabase/migrations/`.
- Prompt text is versioned config in `prompts.ts` (added when the generation
  pipeline is built in Phase 4+), never inline strings in routes.

## Supabase clients (`src/lib/supabase/`)

- `client.ts` — browser client, RLS-scoped. Client components only.
- `server.ts` — server client, RLS-scoped, reads/writes cookies via
  `next/headers`. Use in Server Components, Route Handlers, Server Actions.
- `admin.ts` — service-role client, **bypasses RLS**. Server-only
  (`import "server-only"` enforces this at build time). Reserved for writes
  RLS is meant to block from the client — e.g. creating the `users` row for a
  brand-new company on signup. Never call in response to unvalidated input.
- `proxy.ts` (the lib helper, invoked from root `src/proxy.ts`) — refreshes
  the auth session on every navigation. Next.js 16 renamed `middleware.ts` to
  `proxy.ts`; same mechanism, different filename.
- `database.types.ts` is **hand-written** to match
  `supabase/migrations/*.sql`, since no live Supabase project exists yet to
  run `supabase gen types` against. Regenerate from the real database once
  Phase 1 is deployed, and keep it in sync by hand until then whenever a
  migration changes the schema.

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build (also runs the TypeScript check)
- `npm run lint` — ESLint

## Build phases

Work in the order defined in the brief (§9); each phase has explicit
acceptance criteria. Do not start a phase's features before the prior phase's
criteria pass. Phase 1 (skeleton: auth, company creation, RLS, deploy) is
current.
