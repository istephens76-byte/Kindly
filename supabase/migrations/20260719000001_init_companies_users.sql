-- Phase 1 schema: companies + users only.
-- Remaining tables from the dev brief (§4) are added in later phases.

create type user_role as enum ('admin', 'recruiter');

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'trial',
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  role user_role not null default 'recruiter',
  display_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create index users_company_id_idx on users (company_id);
