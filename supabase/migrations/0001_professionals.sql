-- ============================================================
-- 0001_professionals.sql
-- Flat 80-column professionals table mirroring Database_v7_clean.xlsx.
-- One row per professional. CHECK constraints mirror the Zod enums
-- in lib/scoring/types.ts. Schema is the contract — fail loudly.
-- ============================================================

create table if not exists professionals (
  -- Identity (3)
  id                              text        primary key,
  full_name_internal              text        not null,
  linkedin_url_internal           text,

  -- Current state (6)
  "current_role"                  text        not null
    check ("current_role" in ('ib_analyst','ib_associate','ib_vp')),
  current_firm                    text        not null,
  current_firm_tier               text        not null
    check (current_firm_tier in ('bb','elite_boutique_and_mm','boutique')),
  current_geography               text        not null
    check (current_geography in
      ('sydney','melbourne','hk','london','ny','singapore','other')),
  current_role_start_year         integer     not null,
  years_to_current_role           integer     not null check (years_to_current_role >= 0),

  -- Education (14)
  university                      text        not null,
  university_tier                 text        not null
    check (university_tier in
      ('go8_top','go8_other','atn','other_au',
       'top_global','international_top','other_global')),
  degree                          text        not null,
  degree_type                     text        not null
    check (degree_type in
      ('bachelor','honours','masters','mba','double_degree','phd')),
  majors                          text,
  wam_band                        text        not null
    check (wam_band in ('hd','d','c','p','unknown')),
  graduation_year                 integer,
  has_honours                     boolean     not null,
  has_masters_or_second_degree    boolean     not null,
  secondary_education_notes       text,
  education_achievements          text,
  high_school                     text,
  high_school_type                text        not null
    check (high_school_type in
      ('gps','cas','aps','selective','public_comprehensive',
       'catholic','independent_other','international','unknown')),
  atar_band                       text        not null
    check (atar_band in
      ('99_plus','98_99','95_98','90_95','85_90','below_85','unknown')),

  -- Experiences x 5 (50)
  exp1_type            text, exp1_firm text, exp1_firm_tier text,
  exp1_industry        text, exp1_role_function text,
  exp1_role_relevance  integer,
  exp1_year            integer,
  exp1_duration_months integer,
  exp1_how_obtained    text,
  exp1_converted_to_ft text,

  exp2_type            text, exp2_firm text, exp2_firm_tier text,
  exp2_industry        text, exp2_role_function text,
  exp2_role_relevance  integer,
  exp2_year            integer,
  exp2_duration_months integer,
  exp2_how_obtained    text,
  exp2_converted_to_ft text,

  exp3_type            text, exp3_firm text, exp3_firm_tier text,
  exp3_industry        text, exp3_role_function text,
  exp3_role_relevance  integer,
  exp3_year            integer,
  exp3_duration_months integer,
  exp3_how_obtained    text,
  exp3_converted_to_ft text,

  exp4_type            text, exp4_firm text, exp4_firm_tier text,
  exp4_industry        text, exp4_role_function text,
  exp4_role_relevance  integer,
  exp4_year            integer,
  exp4_duration_months integer,
  exp4_how_obtained    text,
  exp4_converted_to_ft text,

  exp5_type            text, exp5_firm text, exp5_firm_tier text,
  exp5_industry        text, exp5_role_function text,
  exp5_role_relevance  integer,
  exp5_year            integer,
  exp5_duration_months integer,
  exp5_how_obtained    text,
  exp5_converted_to_ft text,

  -- Signals + meta (7)
  signals                  text[]   not null default '{}',
  extra_experiences_notes  text,
  path_summary             text,
  data_source              text     not null
    check (data_source in ('linkedin','interview','survey','public_bio','third_party')),
  data_confidence          text     not null
    check (data_confidence in ('high','medium','low')),
  notes                    text,
  date_added               date     not null,

  -- expN CHECK constraints — applied to every slot uniformly.
  -- Each slot is either entirely null OR all required fields populated.

  constraint exp1_type_ck             check (exp1_type            is null or exp1_type            in ('summer_internship','winter_internship','penultimate_internship','internship','part_time','full_time','casual','grad_program')),
  constraint exp1_firm_tier_ck        check (exp1_firm_tier       is null or exp1_firm_tier       in ('bb','elite_boutique_and_mm','boutique','big4','private_equity','top_tier_law','corporate','startup','government','non_profit','other','unknown')),
  constraint exp1_industry_ck         check (exp1_industry        is null or exp1_industry        in ('ib','big4_advisory','big4_audit','corporate','law','private_equity','capital_markets','consulting','government','non_profit','other')),
  constraint exp1_role_function_ck    check (exp1_role_function   is null or exp1_role_function   in ('ib_coverage','ib_product','transaction_services','advisory','audit','corp_finance','sales_trading','pe_investment','law','consulting','other')),
  constraint exp1_role_relevance_ck   check (exp1_role_relevance  is null or exp1_role_relevance  between 1 and 5),
  constraint exp1_how_obtained_ck     check (exp1_how_obtained    is null or exp1_how_obtained    in ('cold_email','society_referral','ocr','online_application','internal_referral','networking_event','alumni_network','family_connection','recruiter','co_op_program','scholarship','graduate_program','conversion','return_offer','lateral','promotion','unknown','NA')),
  constraint exp1_converted_to_ft_ck  check (exp1_converted_to_ft is null or exp1_converted_to_ft in ('TRUE','FALSE','NA')),

  constraint exp2_type_ck             check (exp2_type            is null or exp2_type            in ('summer_internship','winter_internship','penultimate_internship','internship','part_time','full_time','casual','grad_program')),
  constraint exp2_firm_tier_ck        check (exp2_firm_tier       is null or exp2_firm_tier       in ('bb','elite_boutique_and_mm','boutique','big4','private_equity','top_tier_law','corporate','startup','government','non_profit','other','unknown')),
  constraint exp2_industry_ck         check (exp2_industry        is null or exp2_industry        in ('ib','big4_advisory','big4_audit','corporate','law','private_equity','capital_markets','consulting','government','non_profit','other')),
  constraint exp2_role_function_ck    check (exp2_role_function   is null or exp2_role_function   in ('ib_coverage','ib_product','transaction_services','advisory','audit','corp_finance','sales_trading','pe_investment','law','consulting','other')),
  constraint exp2_role_relevance_ck   check (exp2_role_relevance  is null or exp2_role_relevance  between 1 and 5),
  constraint exp2_how_obtained_ck     check (exp2_how_obtained    is null or exp2_how_obtained    in ('cold_email','society_referral','ocr','online_application','internal_referral','networking_event','alumni_network','family_connection','recruiter','co_op_program','scholarship','graduate_program','conversion','return_offer','lateral','promotion','unknown','NA')),
  constraint exp2_converted_to_ft_ck  check (exp2_converted_to_ft is null or exp2_converted_to_ft in ('TRUE','FALSE','NA')),

  constraint exp3_type_ck             check (exp3_type            is null or exp3_type            in ('summer_internship','winter_internship','penultimate_internship','internship','part_time','full_time','casual','grad_program')),
  constraint exp3_firm_tier_ck        check (exp3_firm_tier       is null or exp3_firm_tier       in ('bb','elite_boutique_and_mm','boutique','big4','private_equity','top_tier_law','corporate','startup','government','non_profit','other','unknown')),
  constraint exp3_industry_ck         check (exp3_industry        is null or exp3_industry        in ('ib','big4_advisory','big4_audit','corporate','law','private_equity','capital_markets','consulting','government','non_profit','other')),
  constraint exp3_role_function_ck    check (exp3_role_function   is null or exp3_role_function   in ('ib_coverage','ib_product','transaction_services','advisory','audit','corp_finance','sales_trading','pe_investment','law','consulting','other')),
  constraint exp3_role_relevance_ck   check (exp3_role_relevance  is null or exp3_role_relevance  between 1 and 5),
  constraint exp3_how_obtained_ck     check (exp3_how_obtained    is null or exp3_how_obtained    in ('cold_email','society_referral','ocr','online_application','internal_referral','networking_event','alumni_network','family_connection','recruiter','co_op_program','scholarship','graduate_program','conversion','return_offer','lateral','promotion','unknown','NA')),
  constraint exp3_converted_to_ft_ck  check (exp3_converted_to_ft is null or exp3_converted_to_ft in ('TRUE','FALSE','NA')),

  constraint exp4_type_ck             check (exp4_type            is null or exp4_type            in ('summer_internship','winter_internship','penultimate_internship','internship','part_time','full_time','casual','grad_program')),
  constraint exp4_firm_tier_ck        check (exp4_firm_tier       is null or exp4_firm_tier       in ('bb','elite_boutique_and_mm','boutique','big4','private_equity','top_tier_law','corporate','startup','government','non_profit','other','unknown')),
  constraint exp4_industry_ck         check (exp4_industry        is null or exp4_industry        in ('ib','big4_advisory','big4_audit','corporate','law','private_equity','capital_markets','consulting','government','non_profit','other')),
  constraint exp4_role_function_ck    check (exp4_role_function   is null or exp4_role_function   in ('ib_coverage','ib_product','transaction_services','advisory','audit','corp_finance','sales_trading','pe_investment','law','consulting','other')),
  constraint exp4_role_relevance_ck   check (exp4_role_relevance  is null or exp4_role_relevance  between 1 and 5),
  constraint exp4_how_obtained_ck     check (exp4_how_obtained    is null or exp4_how_obtained    in ('cold_email','society_referral','ocr','online_application','internal_referral','networking_event','alumni_network','family_connection','recruiter','co_op_program','scholarship','graduate_program','conversion','return_offer','lateral','promotion','unknown','NA')),
  constraint exp4_converted_to_ft_ck  check (exp4_converted_to_ft is null or exp4_converted_to_ft in ('TRUE','FALSE','NA')),

  constraint exp5_type_ck             check (exp5_type            is null or exp5_type            in ('summer_internship','winter_internship','penultimate_internship','internship','part_time','full_time','casual','grad_program')),
  constraint exp5_firm_tier_ck        check (exp5_firm_tier       is null or exp5_firm_tier       in ('bb','elite_boutique_and_mm','boutique','big4','private_equity','top_tier_law','corporate','startup','government','non_profit','other','unknown')),
  constraint exp5_industry_ck         check (exp5_industry        is null or exp5_industry        in ('ib','big4_advisory','big4_audit','corporate','law','private_equity','capital_markets','consulting','government','non_profit','other')),
  constraint exp5_role_function_ck    check (exp5_role_function   is null or exp5_role_function   in ('ib_coverage','ib_product','transaction_services','advisory','audit','corp_finance','sales_trading','pe_investment','law','consulting','other')),
  constraint exp5_role_relevance_ck   check (exp5_role_relevance  is null or exp5_role_relevance  between 1 and 5),
  constraint exp5_how_obtained_ck     check (exp5_how_obtained    is null or exp5_how_obtained    in ('cold_email','society_referral','ocr','online_application','internal_referral','networking_event','alumni_network','family_connection','recruiter','co_op_program','scholarship','graduate_program','conversion','return_offer','lateral','promotion','unknown','NA')),
  constraint exp5_converted_to_ft_ck  check (exp5_converted_to_ft is null or exp5_converted_to_ft in ('TRUE','FALSE','NA'))
);

-- Helpful indexes for the scoring engine pool filter.
create index if not exists professionals_geo_tier_idx
  on professionals (current_geography, current_firm_tier);
create index if not exists professionals_years_idx
  on professionals (years_to_current_role);
