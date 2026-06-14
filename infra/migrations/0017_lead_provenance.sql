-- 0017 — Lead provenance (IA build): record WHO created/pitched a lead, distinct
-- from who commissioned it (commissioner_id) and who is doing it (assignee_id),
-- so a card can read "pitched by X · assigned to Y by Z" (ADR 0056 follow-up).
alter table story_leads
  add column if not exists created_by uuid references users(id) on delete set null;

-- Migrate the prior hack: pitched leads stored the pitcher in assignee_id.
-- Move it to created_by, then clear assignee_id so "assigned to" is clean.
update story_leads set created_by = assignee_id
 where origin = 'pitched' and created_by is null and assignee_id is not null;
update story_leads set assignee_id = null where origin = 'pitched';

create index if not exists idx_leads_created_by on story_leads (created_by);
