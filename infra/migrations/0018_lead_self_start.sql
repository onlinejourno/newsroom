-- 0018 — Reporter agency: a reporter can self-start a story without waiting to
-- be commissioned ("take it up"). New origin 'self' — assigned straight to the
-- reporter, no commissioner. (ADR 0056 follow-up.)
do $$
declare c text;
begin
  select conname into c from pg_constraint
   where conrelid = 'story_leads'::regclass and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%origin%';
  if c is not null then
    execute format('alter table story_leads drop constraint %I', c);
  end if;
end $$;

alter table story_leads add constraint story_leads_origin_check
  check (origin in ('assigned', 'pitched', 'requested', 'self'));
