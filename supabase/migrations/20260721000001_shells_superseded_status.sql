-- Distinguishes "was once genuinely active" from "an in-progress draft
-- nobody has activated yet". Previously a superseded shell and a fresh
-- unactivated draft were both just status='draft', which meant redrafting
-- (POST /api/draft-shell) had no safe way to reuse a row — it always
-- inserted a new version, so an admin re-rolling "Draft in our voice"
-- several times while iterating accumulated one permanent row per click,
-- none of which were ever audit-relevant (they were never live).
--
-- Now: 'superseded' is a genuinely-was-active row, never touched again.
-- 'draft' is the single in-progress slot that redrafting overwrites in
-- place. activate_shell demotes the outgoing active row to 'superseded'
-- instead of 'draft'.

alter table shells drop constraint shells_status_check;
alter table shells add constraint shells_status_check
  check (status in ('draft', 'active', 'superseded'));

create or replace function activate_shell(p_shell_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  select company_id into v_company_id from shells where id = p_shell_id;

  if v_company_id is null then
    raise exception 'Shell not found';
  end if;

  update shells
    set status = 'superseded'
    where company_id = v_company_id
      and status = 'active'
      and id != p_shell_id;

  update shells
    set status = 'active'
    where id = p_shell_id;
end;
$$;
