# Kindly

Governance tool for candidate rejection emails. See `kindly-dev-brief.md` for
the full product spec — this README only covers getting the app running.

## Status

Phase 1 (skeleton): Next.js + Supabase auth + company creation + RLS. No
generation pipeline, Template Studio, or admin area yet — see the brief §9
for the phase plan.

## Prerequisites

- Node 20+
- A Supabase project (free tier is fine for development)

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run the migrations in `supabase/migrations/` **in
   filename order**:
   - `20260719000001_init_companies_users.sql`
   - `20260719000002_rls_companies_users.sql`
   - `20260720000001_init_profiles_shells_taxonomies.sql`
   - `20260720000002_rls_profiles_shells_taxonomies.sql`
   - `20260720000003_activate_shell_function.sql`
   - `20260720000004_init_vacancies.sql`
   - `20260720000005_rls_vacancies.sql`
   - `20260720000006_rls_companies_update.sql`

   (Or, if you have the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
   installed and linked to the project: `supabase db push`.)
3. In **Authentication → Providers**, confirm email auth is enabled (it is
   by default). Magic links use it as-is — no extra config needed.
4. In **Authentication → URL Configuration**, add your dev and prod origins
   to the redirect allow-list, e.g. `http://localhost:3000/auth/callback`
   and `https://<your-vercel-domain>/auth/callback`.
5. Copy the project URL and keys from **Project Settings → API**.

## 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in the three Supabase values from step 1. `ANTHROPIC_API_KEY` isn't
used until the generation pipeline lands (Phase 4) — leave it blank for now.

**`SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security.** Never expose it
to the client, never commit it, never log it.

## 3. Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in with a work
email, follow the magic link, and create a company. A second browser
profile (or incognito window) with a different email creates a second,
isolated company.

## Running the isolation test

`tests/integration/rls-isolation.test.ts` proves the Phase 1 acceptance
criterion: two accounts in different companies cannot see each other's
`companies`/`users` rows. It talks to a real Supabase project via the admin
API (creates and tears down two throwaway accounts), so it needs
`.env.local` populated as above.

**Run it against a disposable/dev Supabase project — never production** (it
creates and deletes real auth users).

```bash
npm run test
```

## Other commands

```bash
npm run build   # production build (also runs the TypeScript check)
npm run lint    # ESLint
```

## Deploying

Deploy to [Vercel](https://vercel.com/new). Add the same environment
variables from `.env.local` in the Vercel project settings, then update the
Supabase redirect allow-list (step 1.4 above) with the deployed domain.
