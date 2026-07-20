-- Tenant isolation for company_profiles, shells, taxonomies.
--
-- Unlike Phase 1, these tables are written directly by authenticated admins
-- through the app (Template Studio), not just by the service role — so each
-- gets INSERT/UPDATE policies scoped to same-company admins, in addition to
-- same-company SELECT for any role (recruiters need read access to the
-- active shell and taxonomy labels once the generation pipeline lands).
-- Rows are never hard-deleted (shells are superseded, not removed; taxonomy
-- entries are archived via the `archived` flag), so no DELETE policies.

alter table company_profiles enable row level security;
alter table shells enable row level security;
alter table taxonomies enable row level security;

-- SECURITY DEFINER lookup of the caller's own role, same pattern as
-- auth_company_id() (avoids recursing into `users` RLS).
create function auth_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

create policy "company_profiles_select_same_company"
  on company_profiles for select
  to authenticated
  using (company_id = auth_company_id());

create policy "company_profiles_insert_admin"
  on company_profiles for insert
  to authenticated
  with check (company_id = auth_company_id() and auth_role() = 'admin');

create policy "company_profiles_update_admin"
  on company_profiles for update
  to authenticated
  using (company_id = auth_company_id() and auth_role() = 'admin')
  with check (company_id = auth_company_id() and auth_role() = 'admin');

create policy "shells_select_same_company"
  on shells for select
  to authenticated
  using (company_id = auth_company_id());

create policy "shells_insert_admin"
  on shells for insert
  to authenticated
  with check (company_id = auth_company_id() and auth_role() = 'admin');

create policy "shells_update_admin"
  on shells for update
  to authenticated
  using (company_id = auth_company_id() and auth_role() = 'admin')
  with check (company_id = auth_company_id() and auth_role() = 'admin');

create policy "taxonomies_select_same_company"
  on taxonomies for select
  to authenticated
  using (company_id = auth_company_id());

create policy "taxonomies_insert_admin"
  on taxonomies for insert
  to authenticated
  with check (company_id = auth_company_id() and auth_role() = 'admin');

create policy "taxonomies_update_admin"
  on taxonomies for update
  to authenticated
  using (company_id = auth_company_id() and auth_role() = 'admin')
  with check (company_id = auth_company_id() and auth_role() = 'admin');
