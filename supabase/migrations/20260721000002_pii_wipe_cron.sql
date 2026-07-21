-- Brief §4 data minimisation: the only candidate PII stored is a first
-- name. This nulls candidate_first_name on generations rows once they're
-- older than 180 days, keeping the rest of the audit record (guardrail
-- results, timings, closings, etc.) intact for the insights dashboard.
--
-- SECURITY DEFINER + no grant to `authenticated`: this must only ever run
-- as the scheduled cron job (which executes as the job owner, not a
-- request-scoped user), never be callable by a company member directly —
-- unlike activate_shell, there is no legitimate app-level caller for this.
create function wipe_stale_candidate_names()
returns void
language sql
security definer
set search_path = public
as $$
  update generations
    set candidate_first_name = null
    where candidate_first_name is not null
      and created_at < now() - interval '180 days';
$$;

create extension if not exists pg_cron with schema extensions;

select
  cron.schedule(
    'wipe-stale-candidate-names',
    '0 3 * * *',
    $$select wipe_stale_candidate_names()$$
  );
