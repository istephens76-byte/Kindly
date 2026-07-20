-- Phase 3 schema: vacancies + vacancy_skills (brief §4).
-- RLS lands in a follow-up migration, same split as earlier phases.

create table vacancies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  title text not null,
  jd_text text not null,
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index vacancies_company_id_idx on vacancies (company_id);

create table vacancy_skills (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references vacancies (id) on delete cascade,
  label text not null,
  source text not null check (source in ('extracted', 'manual')),
  created_at timestamptz not null default now()
);

create index vacancy_skills_vacancy_id_idx on vacancy_skills (vacancy_id);
