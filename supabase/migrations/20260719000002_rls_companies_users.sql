-- Tenant isolation for companies + users.
--
-- Writes are not exposed to the `authenticated` role in Phase 1: company
-- creation and the resulting users row are both written server-side with
-- the service role (which bypasses RLS), never via a client-side insert.
-- Only SELECT policies exist here as a result.

alter table companies enable row level security;
alter table users enable row level security;

-- SECURITY DEFINER lookup of the caller's own company_id, used so the
-- `users` SELECT policy can reference `users` itself without recursing
-- into RLS (the function runs as its owner, which bypasses RLS on the
-- table it queries).
create function auth_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.users where id = auth.uid()
$$;

create policy "companies_select_own"
  on companies for select
  to authenticated
  using (id = auth_company_id());

create policy "users_select_same_company"
  on users for select
  to authenticated
  using (company_id = auth_company_id());
