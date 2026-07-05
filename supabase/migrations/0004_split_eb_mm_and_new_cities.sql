-- ============================================================
-- 0004_split_eb_mm_and_new_cities.sql
--
-- Onboarding option corrections (see lib/scoring/types.ts for the
-- corresponding Zod enum changes):
--   * Elite Boutique and Mid-Market become two distinct firm tiers.
--     'elite_boutique_and_mm' is kept as a valid (legacy) value so
--     existing professional rows aren't broken by this migration —
--     relabel them into 'elite_boutique' / 'mid_market' via a fresh
--     xlsx import whenever the underlying data is ready.
--   * Perth, Adelaide, and Brisbane become valid current_geography
--     values (target-city options now include them; see pool.ts for
--     the match-pool fallback used until real data exists for these
--     cities).
-- ============================================================

-- current_firm_tier: inline CHECK on 0001 — default constraint name.
alter table professionals
  drop constraint if exists professionals_current_firm_tier_check;

alter table professionals
  add constraint professionals_current_firm_tier_check
  check (current_firm_tier in
    ('bb', 'elite_boutique', 'mid_market', 'elite_boutique_and_mm', 'boutique'));

-- current_geography: inline CHECK on 0001 — default constraint name.
alter table professionals
  drop constraint if exists professionals_current_geography_check;

alter table professionals
  add constraint professionals_current_geography_check
  check (current_geography in
    ('sydney', 'melbourne', 'perth', 'adelaide', 'brisbane',
     'hk', 'london', 'ny', 'singapore', 'other'));

-- expN_firm_tier_ck x5 — explicitly named constraints on 0001.
alter table professionals drop constraint if exists exp1_firm_tier_ck;
alter table professionals add constraint exp1_firm_tier_ck
  check (exp1_firm_tier is null or exp1_firm_tier in
    ('bb','elite_boutique','mid_market','elite_boutique_and_mm','boutique','big4','private_equity','top_tier_law','corporate','startup','government','non_profit','other','unknown'));

alter table professionals drop constraint if exists exp2_firm_tier_ck;
alter table professionals add constraint exp2_firm_tier_ck
  check (exp2_firm_tier is null or exp2_firm_tier in
    ('bb','elite_boutique','mid_market','elite_boutique_and_mm','boutique','big4','private_equity','top_tier_law','corporate','startup','government','non_profit','other','unknown'));

alter table professionals drop constraint if exists exp3_firm_tier_ck;
alter table professionals add constraint exp3_firm_tier_ck
  check (exp3_firm_tier is null or exp3_firm_tier in
    ('bb','elite_boutique','mid_market','elite_boutique_and_mm','boutique','big4','private_equity','top_tier_law','corporate','startup','government','non_profit','other','unknown'));

alter table professionals drop constraint if exists exp4_firm_tier_ck;
alter table professionals add constraint exp4_firm_tier_ck
  check (exp4_firm_tier is null or exp4_firm_tier in
    ('bb','elite_boutique','mid_market','elite_boutique_and_mm','boutique','big4','private_equity','top_tier_law','corporate','startup','government','non_profit','other','unknown'));

alter table professionals drop constraint if exists exp5_firm_tier_ck;
alter table professionals add constraint exp5_firm_tier_ck
  check (exp5_firm_tier is null or exp5_firm_tier in
    ('bb','elite_boutique','mid_market','elite_boutique_and_mm','boutique','big4','private_equity','top_tier_law','corporate','startup','government','non_profit','other','unknown'));
