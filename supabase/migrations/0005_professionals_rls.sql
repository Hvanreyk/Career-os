-- ============================================================
-- 0005_professionals_rls.sql
--
-- Enable Row Level Security on public.professionals. The table was
-- fully exposed to the anon/authenticated roles (readable AND
-- writable by anyone holding the public anon key).
--
-- No policies are added on purpose: every legitimate reader goes
-- through the service role, which bypasses RLS —
--   * web/app/api/generate-report/route.ts (createServiceClient)
--   * scripts/import-csv.ts (SUPABASE_SERVICE_ROLE_KEY)
-- With RLS on and no policies, anon/authenticated clients get no
-- access at all, which is the intended posture for this dataset
-- (it contains real names and LinkedIn URLs).
-- ============================================================

alter table public.professionals enable row level security;
