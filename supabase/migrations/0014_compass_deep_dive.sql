-- ============================================================
-- 0014_compass_deep_dive.sql
--
-- Adds the downloadable Career Compass deep-dive to the reports row.
-- A student generates this longer, guided report (rendered to PDF) from a
-- button at the bottom of their on-screen report. It is produced by a single
-- LLM call, cached here so re-downloads are free, and mirrors the report's own
-- status/columns pattern (no separate job table).
--
-- Columns:
--   * deep_dive         — cached DeepDiveReport JSON (null until generated)
--   * deep_dive_status  — null | processing | completed | error
--   * deep_dive_error   — last failure message, for retry/debugging
--
-- RLS is unchanged: the deep-dive and export routes use the service client
-- filtered by user_id, exactly like the existing report routes.
-- ============================================================

alter table reports
  add column if not exists deep_dive jsonb,
  add column if not exists deep_dive_status text,
  add column if not exists deep_dive_error text;

alter table reports
  drop constraint if exists reports_deep_dive_status_check;

alter table reports
  add constraint reports_deep_dive_status_check
  check (deep_dive_status is null or deep_dive_status in ('processing', 'completed', 'error'));
