-- 2b: mark read-only demo (public showcase) accounts. Default false; real users unaffected.
alter table users add column if not exists demo boolean not null default false;
