-- Atomically activates a shell version: demotes the company's current
-- active shell (if any) back to draft, then promotes the target version.
-- A single function call is one implicit transaction, avoiding the window
-- where two separate client-side UPDATEs could leave a company with zero
-- (or, if reordered, briefly two) active shells.
--
-- SECURITY INVOKER (the default) so the underlying UPDATEs still run as the
-- calling user and are checked against shells_update_admin — same-company
-- admins only, same as any other write to this table.
create function activate_shell(p_shell_id uuid)
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
    set status = 'draft'
    where company_id = v_company_id
      and status = 'active'
      and id != p_shell_id;

  update shells
    set status = 'active'
    where id = p_shell_id;
end;
$$;

grant execute on function activate_shell(uuid) to authenticated;
