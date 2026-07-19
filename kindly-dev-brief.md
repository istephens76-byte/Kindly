# Kindly — MVP Development Brief

**Version 1.1 · July 2026 · Owner: Ian**
**Intended reader: Claude Code (and any human developer). This document is the source of truth for the MVP build. Keep it in the repo root alongside CLAUDE.md.**

**Changes in v1.1:** batch mode replaced by CV Triage mode; register-interest (talent link) feature added; closings become recruiter-selected chips in both modes; design principle added; data model, pipeline, UX, phases updated accordingly. Prototype reference is now `kindly-prototype-v4.jsx`.

---

## 0. Design principle (non-negotiable)

> **The human decides, Kindly articulates.**

A human recruiter makes every judgment (the reason tap, the closing choice, the talent-link tick). Kindly turns those judgments into well-written, safe, on-brand prose. Kindly must NEVER read a CV, score a candidate, or suggest which chip to tap. The moment the AI suggests decisions, the product becomes an automated employment screening tool subject to a far heavier regulatory regime (EU AI Act high-risk category, NYC AEDT law, etc.) and loses its compliance story. If a future feature proposal involves AI-suggested decisions, it is out of scope by principle, not by phase. The human tap is also the product's proof of human review — it is load-bearing, not friction.

---

## 1. What Kindly is

Kindly is a governance tool for candidate rejection emails, disguised as a time-saver. Companies lock in a lawyer-reviewable, brand-voiced rejection framework once (the **Template Studio**); recruiters then produce personalised, legally-safe, on-brand rejection emails two ways:

- **Interviewed candidates:** five tap-based questions, ~30 seconds, AI writes 2–3 personalised middle sentences.
- **CV-stage candidates (Triage mode):** one tap per candidate — which JD requirement the decision came down to — producing an individual email per applicant that can honestly state a human reviewed their application.

Every generated email is logged with the structured inputs that produced it (the **audit log**). Rejected candidates can be invited to register interest in future similar roles via a link (the **talent link**), turning rejection into re-engagement.

One-line pitch: *"Every rejection your team sends is on-brand, legally defensible, and kind — in less time than the cold template takes now."*

A working front-end prototype exists (`kindly-prototype-v4.jsx`, included in this repo). It is the **design and UX reference**: visual style, chip interactions, triage grid, live preview, editable output. Re-implement properly with a backend; do not copy its architecture (client-side API calls, no persistence) — only its UX and prompt logic.

---

## 2. MVP scope

### In scope
1. **Auth + multi-tenant companies.** Users belong to a company; roles are `admin` and `recruiter`.
2. **Template Studio (admin, one-off per company):** company profile (about / values & behaviours / voice & style), AI-drafted template shell with manual editing and versioning, configurable reason and strength chip taxonomies, sign-off name, talent link URL. The shell has **five** lines: warm line, three closings (actively encourage / door open / not right now), and the **register-interest invitation line** (talent line).
3. **Role setup (per vacancy):** role title + pasted JD → AI extracts 5–6 comparison skills as chips; skills manually editable.
4. **Interviewed-candidate flow (recruiter):** five questions — first name / stage / reason incl. skill chip + optional nuance / strength + optional detail / **closing choice as chips** — plus a **tickbox to include the talent link**. AI writes the middle 2–3 sentences only; editable output; copy to clipboard.
5. **CV Triage mode (recruiter):** paste/upload first names (one per line; CSV upload acceptable stretch goal) → triage grid, one row per candidate showing the vacancy's JD skill chips + a "role changed / paused" chip. One tap per candidate = the deciding requirement. Per row: closing chips (door open / not now, **defaulting to not now** to preserve one-tap economy) and a talent-link tick, with a batch-level "talent link for all" toggle. Generation produces an individual email per candidate; per-email copy and copy-all.
6. **The reviewed line.** Every triage email includes the deterministic sentence: *"Your application was individually reviewed by our recruitment team against the requirements for this role."* This is only true because the recruiter tapped — see §0. It must never appear on an email whose reason was not human-selected.
7. **Guardrail pipeline** on every generation (see §6). Non-negotiable.
8. **Audit log:** every generation persisted with inputs, outputs, shell version, guardrail results, user, timestamps — including every triage row as its own record.
9. **Telemetry:** time-to-generate; edit distance between generated and copied text; talent-link inclusion rate.

### Explicitly out of scope (do not build)
- ATS integrations, Chrome extension, webhooks
- Email sending (copy-to-clipboard only in MVP)
- **The working talent-link destination.** The link is a per-company configurable URL (dummy default). Do NOT build the registration page, contact capture, or consent flow in MVP — see §11.
- Billing/subscriptions (hardcode a `plan` field on company)
- US legal variants; UK English only
- Gamified countdown timers — time silently, report after generation ("Written in 14s" / "12 emails in 74s")
- AI-suggested triage decisions (§0 — out of scope by principle)
- Mobile apps (responsive web only)

---

## 3. Tech stack

- **Framework:** Next.js (App Router, TypeScript) deployed on Vercel
- **Database + auth:** Supabase (Postgres, Row Level Security, Supabase Auth email magic links). RLS isolates tenants: every table keyed by `company_id`, policies enforce membership.
- **AI:** Anthropic API, called **only** from server routes. Model: `claude-sonnet-4-6` for generation and extraction; guardrail classifier pass may use `claude-haiku-4-5-20251001` for cost. `ANTHROPIC_API_KEY` in server env only.
- **Styling:** Tailwind. Port the prototype's visual language: paper `#ECF1EF`, ink `#17312B`, accent `#0E7C66`, amber `#E9A83B`/`#FBEFD6`, Sora display type, Inter body, pill chips. Triage rows highlight green when decided.
- **Validation:** zod on all API inputs and parsed LLM outputs.
- **React discipline:** never define components inside components (this caused a focus-loss bug in the prototype — inputs remounting per keystroke). Lint rule or convention to enforce.

---

## 4. Data model (Postgres)

```
companies        id, name, plan, created_at
users            id (supabase auth uid), company_id, role ('admin'|'recruiter'), display_name, email
company_profiles company_id (1:1), about, values, voice, sender_name,
                 talent_link_url (default dummy), updated_at
shells           id, company_id, version (int), warm_line,
                 closing_active, closing_other, closing_no, talent_line,
                 status ('draft'|'active'), created_by, created_at
                 -- one active shell per company; superseded rows never deleted (audit)
taxonomies       id, company_id, kind ('reason'|'strength'), label,
                 needs_skill (bool, reasons only), sort_order, archived (bool)
vacancies        id, company_id, title, jd_text, created_by, created_at
vacancy_skills   id, vacancy_id, label, source ('extracted'|'manual')
generations      id, company_id, vacancy_id, user_id, shell_id (FK to exact version used),
                 mode ('single'|'triage'), batch_id (uuid, null for single; groups a triage run),
                 candidate_first_name, stage,
                 reason_taxonomy_id (single mode), reason_skill, reason_detail,
                 strength_taxonomy_id (single mode only), strength_detail,
                 closing ('active'|'other'|'no'; triage limited to 'other'|'no'),
                 talent_link_included (bool),
                 tone, prompt_hash, middle_generated, email_generated,
                 email_copied, edit_distance (int),
                 guardrail_results (jsonb: schema_ok, regex_hits[], classifier_verdict, retries),
                 ms_to_generate, created_at, copied_at
```

Note: `batch_sends` from brief v1.0 is **removed** — every triage candidate is a full `generations` row (grouped by `batch_id`), so audit, guardrails, and telemetry apply identically at CV stage.

**Data minimisation (GDPR):** only candidate PII stored is a first name. Scheduled job (Supabase cron) nulls `candidate_first_name` on rows older than 180 days, keeping the rest of the audit record. State this in the privacy notice. (This posture changes when the talent link goes live — see §11.)

---

## 5. Seed content (defaults per new company; admin-editable except where noted)

**Reasons** (`needs_skill` in brackets): Others had more hands-on experience in… (true) · We needed deeper capability in… (true) · Stronger evidence from others of… (true) · Role requirements changed or the role was paused (false) · A later-stage candidate was already close to offer (false)

**Strengths:** Communication · Enthusiasm for the role · Interview preparation · Relevant experience · Portfolio / work examples · Great questions asked

**Stages (fixed):** CV / application review · Phone screen · First interview · Final interview

**Closings (fixed ids, admin-editable text via shell):** active ("Actively encourage reapplying") · other ("Door open — other roles") · no ("Not right now"). Triage rows offer only other/no, defaulting to no.

**Default shell text:** use `DEFAULT_SHELL` from the v4 prototype, including `talent_line` ("If you'd like to hear about similar roles when they come up, you can register your interest here:").

**Reviewed line (fixed, not editable in MVP):** "Your application was individually reviewed by our recruitment team against the requirements for this role."

**Default talent link:** `https://careers.example.com/register-interest` (per-company editable URL field).

---

## 6. The generation pipeline (the heart of the product)

### 6a. Single mode — `POST /api/generate`
1. **Authorise + validate.** zod-validate; confirm company membership; load active shell, profile, taxonomy labels server-side (never trust client labels).
2. **Build prompt.** Port `generateMiddle` from the v4 prototype (company profile block, tone, HARD RULES: banned phrases; protected characteristics; strength-of-field framing; genuine strength acknowledgement; no greeting/sign-off; 2–3 sentences; JSON-only).
3. **Call Anthropic** (`claude-sonnet-4-6`).
4. **Layer 1 — schema check.** zod-parse `{ middle: string }`. Fail → one silent retry with JSON-only instruction appended → fail gracefully ("Couldn't write this one — try again"), log. Never surface raw model output.
5. **Layer 2 — regex pass.** Case-insensitive scan for banned list: `unfortunately`, `we regret`, `after careful consideration`, `at this time`, `we wish you the best`, `recent experience`, `recently qualified`, plus protected-characteristic terms — hard-block: health, disability, disabled, pregnan, maternity, paternity, married, marital, religion, religious, nationality, visa, accent, `gap in (your|their) (CV|career|employment)`; soft-flag for classifier: `\b(young|older|age|recent)\b`. Hard hit → one regenerate with the hit as an explicit avoid-instruction → persistent hit fails gracefully, logged.
6. **Layer 3 — classifier pass.** Cheap model call (Haiku): flags anything that states or *indirectly implies* a protected characteristic (canonical example: "more recent experience" implying age). `flag:true` → one regenerate with reason appended → second flag fails gracefully, logged.
7. **Assemble deterministically:** greeting + stage opening + warm line + middle + chosen closing + (if ticked) `talent_line + " " + talent_link_url` + thanks + sign-off. Port `buildSingleEmail` logic.
8. **Persist** full generations row; return email + id.
9. **On copy:** `POST /api/generations/:id/copied` with final text; server computes Levenshtein `edit_distance`, stores `copied_at`.

### 6b. Triage mode — `POST /api/generate-triage`
1. Authorise + validate an array of `{name, skill_or_changed, closing, talent}` (server caps 50 per request; UI may paginate larger batches).
2. **Chunked batch prompting:** port `generateTriageMiddles` — one model call per chunk of ~15 candidates returning a JSON array of middles, with the prompt rules: CV-stage only (no invented personal knowledge, no strengths, no interview references); varied sentence construction across candidates; the explicit "recent experience" ban; strength-of-field framing.
3. Layers 1–3 run on **each** middle individually (regex is per-string; classifier may batch its call for cost, but verdicts are stored per candidate). A failed individual middle is regenerated solo; if it fails again, that candidate is returned as "needs manual attention" without blocking the rest of the batch.
4. Assemble each email deterministically: greeting + CV opening + **reviewed line** + warm line + middle + row's chosen closing + (if ticked) talent block + thanks + sign-off. Port `buildTriageEmail`.
5. Persist one generations row per candidate sharing a `batch_id`; return the array.
6. Per-email copy and copy-all both report back for edit-distance capture (copy-all stores the concatenated text against each row unedited unless individually copied after editing).

### 6c. Other routes
- `POST /api/extract-skills` — port `extractSkills`; persists `vacancy_skills`.
- `POST /api/draft-shell` — port `brandShell` **including the talent_line** (five lines); creates `shells` row `status='draft'`; admin edits then activates.

All prompt text lives in a versioned `prompts.ts` (version constant logged as `prompt_hash` on each generation).

---

## 7. UX requirements beyond the prototype

- **Mode switch** after setup: "Interviewed candidate · 5 taps" / "CV triage · 1 tap per candidate".
- **No countdown clock.** Silent timing; report after generation: "Written in 14s" (single), "12 emails in 74s" (triage).
- **Copy buttons sit below the full email text** so output is scrolled past before copying. No other forced friction.
- **Single mode Q5** is "How should it end?" — three closing chips + the talent-link tickbox with helper text ("Adds your register-interest line and link before the sign-off"). Live preview reflects both instantly.
- **Triage grid:** one row per candidate; skill chips + "role changed / paused"; compact second line with closing chips (default "not now") and per-row talent tick; batch-level "talent link for all" toggle both at names-entry stage and in the grid header; rows turn decided-green; decided counter; generate button labelled with the count ("Write 12 emails").
- **Admin area** (`/admin`): profile editor, shell editor (five lines + talent URL) with "Draft in our voice", version history + activate, taxonomy manager, sign-off. "Shell last reviewed {date}" with a 6-month re-review nudge banner.
- **Dashboard** (`/admin/insights`, MVP-simple): emails generated (split single/triage), median time, median edit distance, % copied unedited, closing split, **talent-link inclusion rate**. Big numbers, one page. (Opt-in *click* rate arrives only when the link destination exists — see §11.)
- **Privacy notice page:** what's stored, first-name-only rule, 180-day PII wipe, UK GDPR contact.

---

## 8. Non-functional requirements

- All Anthropic calls server-side; key in Vercel env only.
- Supabase RLS on every table; RLS test proving cross-tenant isolation.
- Rate limit generation routes per user (e.g. 30 single/min; 5 triage batches/min) against runaway cost.
- Graceful degradation on every AI failure path; nothing crashes a flow; triage batches degrade per-candidate, not wholesale.

---

## 9. Build phases and acceptance criteria

**Phase 1 — Skeleton:** Next.js + Supabase auth + company creation + RLS + Vercel deploy.
✅ Two accounts in different companies cannot see each other's data.

**Phase 2 — Template Studio:** profile, five-line shell drafting via `/api/draft-shell`, versioning + activation, taxonomy manager, talent URL field, seeds.
✅ Draft a shell (incl. talent line) from a filled profile, edit, activate; v1 queryable after v2 activates.

**Phase 3 — Vacancies + skill extraction.**
✅ A real JD returns 5–6 sensible, editable, persisted skill chips.

**Phase 4 — Single-mode pipeline + flow:** full §6a, five-question UI with closing chips + talent tick, preview, edit, copy, audit row, edit distance.
✅ (a) happy path generates <8s and reads correctly with and without the talent tick; (b) forced banned phrase caught by regex and regenerated; (c) canned "more recent experience" text flagged by classifier (unit test); (d) complete audit rows incl. guardrail_results.

**Phase 5 — Triage mode:** grid UI, §6b chunked pipeline, per-candidate audit rows with batch_id, reviewed line, per-row closings and talent ticks, copy/copy-all, per-candidate failure isolation.
✅ (a) 12 names → 12 correct individual emails, varied phrasing for identical reasons, each with the reviewed line; (b) one deliberately-failed candidate returns "needs manual attention" while the other 11 succeed; (c) generations table shows 12 rows sharing a batch_id.

**Phase 6 — Insights dashboard + privacy page + polish.**
✅ Dashboard numbers reconcile with the generations table, including talent-link inclusion rate.

Work in order; commit at every phase end; do not advance until acceptance criteria pass.

---

## 10. Testing expectations

- Unit: prompt builders (both modes), banned-phrase regex fixtures (should-catch / should-pass, including "recent experience"), email assembly (all closing × talent combinations), edit distance, triage chunking.
- Integration: both generation routes with Anthropic mocked — schema-retry, regex-regenerate, classifier-flag, and triage per-candidate failure isolation all covered.
- E2E (Playwright): sign in → company setup → draft shell → vacancy → single generate → copy; and a 5-name triage run → copy-all.

---

## 11. The talent link — future consent flow (documented now, built later)

In MVP the talent link is a dumb URL. When the destination is built (post-MVP), the moment a candidate submits contact details Kindly's data posture changes from "first names only, auto-wiped" to "candidate contact data held with consent." That version requires: an explicit consent capture with purpose statement, per-company data controller framing (the company, not Kindly, is controller; Kindly is processor — DPA required), retention schedule, one-click withdrawal, and per-candidate link tokens so the dashboard can report opt-in rate ("X% of rejected candidates registered for future roles" — the headline candidate-experience metric). Nothing in the MVP schema should preclude per-candidate link tokens later; a nullable `talent_token` column on generations is acceptable future-proofing but the token flow itself must not be built yet.

---

## Appendix A — Prompts to port from the prototype

Port `extractSkills`, `brandShell` (five lines), `generateMiddle`, and `generateTriageMiddles` from `kindly-prototype-v4.jsx` as v1 prompts, adjusted only to (a) receive server-loaded taxonomy labels, (b) add the retry/avoid-instruction mechanics of §6. Prompt text is versioned config in `prompts.ts`, never inline strings in routes.

## Appendix B — Glossary

- **Shell:** the fixed, company-approved parts of every email (opening, warm line, closings, talent line, sign-off). AI drafts once at setup; humans approve; versioned.
- **Middle:** the personalised sentences the AI writes per candidate (2–3 in single mode; 1–2 at CV stage). The only free-form AI text in any email.
- **Triage:** CV-stage batch flow — one human tap per candidate selecting the deciding JD requirement.
- **Reviewed line:** the fixed sentence asserting individual human review; only ever true because of the tap; only ever rendered on triage emails.
- **Talent link:** the register-interest URL appended when the recruiter ticks it; dumb URL in MVP, consented re-engagement channel later (§11).
- **Taxonomy:** company-configurable chip sets for reasons and strengths.
- **Guardrail pipeline:** schema check → regex pass → classifier pass, logged per generation.
