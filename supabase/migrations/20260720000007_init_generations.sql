-- Phase 4 schema: generations (brief §4). The audit log — every generated
-- email, single or triage, is a full row here. Only single mode (Phase 4)
-- writes to this table for now; triage mode (Phase 5) reuses the same
-- table via mode/batch_id, per the brief's note that batch_sends from
-- brief v1.0 was removed in favour of this shared shape.
--
-- reason_taxonomy_id/strength_taxonomy_id/strength_detail are single-mode
-- only (nullable here, populated by the single-mode route; triage rows
-- will leave them null). candidate_first_name is nullable because the
-- brief's GDPR posture nulls it out on a 180-day cron job, keeping the
-- rest of the row for audit.
create table generations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  vacancy_id uuid not null references vacancies (id) on delete cascade,
  user_id uuid references users (id) on delete set null,
  shell_id uuid references shells (id) on delete set null,
  mode text not null check (mode in ('single', 'triage')),
  batch_id uuid,
  candidate_first_name text,
  stage text not null check (
    stage in (
      'CV / application review',
      'Phone screen',
      'First interview',
      'Final interview'
    )
  ),
  reason_taxonomy_id uuid references taxonomies (id) on delete set null,
  reason_skill text,
  reason_detail text,
  strength_taxonomy_id uuid references taxonomies (id) on delete set null,
  strength_detail text,
  closing text not null check (closing in ('active', 'other', 'no')),
  talent_link_included boolean not null default false,
  tone text not null,
  prompt_hash text not null,
  middle_generated text not null,
  email_generated text not null,
  email_copied text,
  edit_distance int,
  guardrail_results jsonb not null default '{}'::jsonb,
  ms_to_generate int not null,
  created_at timestamptz not null default now(),
  copied_at timestamptz
);

create index generations_company_id_idx on generations (company_id);
create index generations_vacancy_id_idx on generations (vacancy_id);
create index generations_batch_id_idx on generations (batch_id);
