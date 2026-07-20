-- Tenant isolation for vacancies + vacancy_skills.
--
-- Unlike the Template Studio tables, role setup is a routine per-vacancy
-- recruiter task (brief §2.3), not an admin-only one-off — so any
-- same-company member (admin or recruiter) can read/write here, no role
-- check. vacancy_skills has no company_id of its own, so its policies
-- check company membership via its parent vacancy.
--
-- Vacancies are never deleted (no delete policy) since later phases will
-- reference vacancy_id from generations rows. Skill chips are freely
-- add/edit/removable — they're just editable chips, not an audit record.

alter table vacancies enable row level security;
alter table vacancy_skills enable row level security;

create policy "vacancies_select_same_company"
  on vacancies for select
  to authenticated
  using (company_id = auth_company_id());

create policy "vacancies_insert_same_company"
  on vacancies for insert
  to authenticated
  with check (company_id = auth_company_id());

create policy "vacancies_update_same_company"
  on vacancies for update
  to authenticated
  using (company_id = auth_company_id())
  with check (company_id = auth_company_id());

create policy "vacancy_skills_select_same_company"
  on vacancy_skills for select
  to authenticated
  using (
    exists (
      select 1 from vacancies v
      where v.id = vacancy_skills.vacancy_id
        and v.company_id = auth_company_id()
    )
  );

create policy "vacancy_skills_insert_same_company"
  on vacancy_skills for insert
  to authenticated
  with check (
    exists (
      select 1 from vacancies v
      where v.id = vacancy_skills.vacancy_id
        and v.company_id = auth_company_id()
    )
  );

create policy "vacancy_skills_update_same_company"
  on vacancy_skills for update
  to authenticated
  using (
    exists (
      select 1 from vacancies v
      where v.id = vacancy_skills.vacancy_id
        and v.company_id = auth_company_id()
    )
  )
  with check (
    exists (
      select 1 from vacancies v
      where v.id = vacancy_skills.vacancy_id
        and v.company_id = auth_company_id()
    )
  );

create policy "vacancy_skills_delete_same_company"
  on vacancy_skills for delete
  to authenticated
  using (
    exists (
      select 1 from vacancies v
      where v.id = vacancy_skills.vacancy_id
        and v.company_id = auth_company_id()
    )
  );
