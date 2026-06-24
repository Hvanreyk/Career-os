-- ============================================================
-- 0003_async_reports.sql
--
-- Splits report generation into two phases so neither serverless
-- request risks a timeout:
--   1. create  — score + insert a row with status 'processing'
--                (scoring_output set, llm_report still null)
--   2. process — run the LLM, then flip status to 'completed'/'error'
--
-- Changes:
--   * llm_report becomes nullable (null while status = 'processing')
--   * status gains a 'processing' value
-- ============================================================

-- llm_report is absent until the LLM step finishes.
alter table reports
  alter column llm_report drop not null;

-- Allow the intermediate 'processing' state.
alter table reports
  drop constraint if exists reports_status_check;

alter table reports
  add constraint reports_status_check
  check (status in ('pending', 'processing', 'completed', 'error'));
