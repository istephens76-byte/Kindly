-- Lets a recruiter archive a vacancy once it's closed/filled, so the
-- vacancies list doesn't grow forever, while keeping the row (and its
-- vacancy_skills, and any generations that reference it) intact — same
-- "never hard-deleted, just tucked away" pattern as taxonomies.archived
-- and shells' 'superseded' status.
alter table vacancies add column archived boolean not null default false;
