-- Phase 2 schema: company_profiles, shells, taxonomies.
-- RLS for these tables lands in a follow-up migration, same split as Phase 1.

create table company_profiles (
  company_id uuid primary key references companies (id) on delete cascade,
  about text not null default '',
  values text not null default '',
  voice text not null default '',
  sender_name text not null default '',
  talent_link_url text not null default 'https://careers.example.com/register-interest',
  updated_at timestamptz not null default now()
);

create table shells (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  version int not null,
  warm_line text not null,
  closing_active text not null,
  closing_other text not null,
  closing_no text not null,
  talent_line text not null,
  status text not null default 'draft' check (status in ('draft', 'active')),
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (company_id, version)
);

create index shells_company_id_idx on shells (company_id);

-- One active shell per company; superseded rows are never deleted (audit).
create unique index shells_one_active_per_company
  on shells (company_id)
  where status = 'active';

create table taxonomies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  kind text not null check (kind in ('reason', 'strength')),
  label text not null,
  needs_skill boolean not null default false,
  sort_order int not null default 0,
  archived boolean not null default false,
  check (kind = 'reason' or needs_skill = false)
);

create index taxonomies_company_id_idx on taxonomies (company_id);
