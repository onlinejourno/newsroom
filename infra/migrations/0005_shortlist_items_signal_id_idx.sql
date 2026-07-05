-- 0005_shortlist_items_signal_id_idx.sql
--
-- Index shortlist_items.signal_id. Postgres indexes only the referenced (PK)
-- side of a foreign key, not the referencing column — so the FK on
-- shortlist_items.signal_id has no backing index. The shortlist scorer's
-- candidate query anti-joins on it:
--
--   not exists (select 1 from shortlist_items si where si.signal_id = s.id)
--
-- (onlinejourno_agents.db.candidate_signals) — without this index that probe
-- seq-scans shortlist_items per candidate batch.
--
-- Idempotent.

create index if not exists shortlist_items_signal_id_idx
  on shortlist_items (signal_id);
