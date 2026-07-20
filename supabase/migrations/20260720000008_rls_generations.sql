-- Tenant isolation for generations (the audit log).
--
-- SELECT is same-company for any role (the Phase 6 insights dashboard
-- aggregates company-wide, not just the generating user's own rows).
-- INSERT requires user_id = auth.uid(), so a client can't attribute a
-- generation to a different teammate. UPDATE (used only by
-- POST /api/generations/:id/copied to set email_copied/edit_distance/
-- copied_at) is restricted to the row's own generating user. No DELETE —
-- this is an audit record.

alter table generations enable row level security;

create policy "generations_select_same_company"
  on generations for select
  to authenticated
  using (company_id = auth_company_id());

create policy "generations_insert_own"
  on generations for insert
  to authenticated
  with check (company_id = auth_company_id() and user_id = auth.uid());

create policy "generations_update_own"
  on generations for update
  to authenticated
  using (company_id = auth_company_id() and user_id = auth.uid())
  with check (company_id = auth_company_id() and user_id = auth.uid());
