# Decisions

Operational/account decisions for Kindly. Not application documentation —
see `kindly-dev-brief.md` for that. Nothing in this file should ever be a
live secret; credential values live in Vercel/Supabase/Anthropic's own
consoles and env vars, never in the repo.

- **Kindly API account email:** Google login — istephens76@gmail.com
- **Kindly API org ID:** 3717f3e6-b33f-43d2-8166-9a1b59cc3044
- **API key in use:** kindly-prod (created July 20th 2026)
- **Anthropic API key variable name in code:** `ANTHROPIC_API_KEY`
- **Supabase project:** avxeqorzdcyoruwqrjdg.supabase.co
- **Supabase keys in use:** new-style (`sb_secret` / `sb_publishable`),
  legacy keys disabled
- **Preview and Production share the same Supabase project** until first
  pilot customer data
- **Spare Anthropic org ignored** — all Kindly activity happens in the
  account above
