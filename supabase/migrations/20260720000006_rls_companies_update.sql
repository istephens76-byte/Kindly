-- Phase 1 deliberately left `companies` read-only to authenticated users
-- (see 20260719000002's comment) since nothing needed to edit it yet. The
-- Template Studio now needs to let an admin fix/rename the company name
-- (used directly in the brandShell prompt), so add an admin-only UPDATE
-- policy — same company_id + role pattern as the Phase 2 tables.

create policy "companies_update_admin"
  on companies for update
  to authenticated
  using (id = auth_company_id() and auth_role() = 'admin')
  with check (id = auth_company_id() and auth_role() = 'admin');
