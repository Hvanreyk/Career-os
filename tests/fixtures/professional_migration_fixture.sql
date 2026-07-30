insert into public.professionals (
  id, full_name_internal, linkedin_url_internal,
  "current_role", current_firm, current_firm_tier, current_geography,
  current_role_start_year, years_to_current_role,
  university, university_tier, degree, degree_type, majors, wam_band,
  graduation_year, has_honours, has_masters_or_second_degree,
  high_school, high_school_type, atar_band,
  exp1_type, exp1_firm, exp1_firm_tier, exp1_industry,
  exp1_role_function, exp1_role_relevance, exp1_year,
  exp1_duration_months, exp1_how_obtained, exp1_converted_to_ft,
  signals, extra_experiences_notes, path_summary,
  data_source, data_confidence, date_added
) values (
  'P900', 'Private Migration Fixture', 'https://example.com/private-fixture',
  'ib_analyst', 'Example Bank', 'elite_boutique_and_mm', 'sydney',
  2025, 2,
  'UNSW', 'go8_top', 'Bachelor of Commerce', 'bachelor', 'Finance', 'hd',
  2025, false, false,
  null, 'unknown', 'unknown',
  'internship', 'Example Bank', 'bb', 'capital_markets',
  'sales_trading', 5, 2024,
  null, 'return_offer', 'TRUE',
  array['deans_list', 'chartered_accountant'],
  'Additional role requires review.',
  'University to markets internship to investment banking.',
  'linkedin', 'high', '2026-07-15'
);
