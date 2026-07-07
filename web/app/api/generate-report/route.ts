import { NextResponse } from 'next/server';
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server';

// Scoring engine — shared workspace package (lib/ → @trajectoryos/core).
// The LLM step runs separately in POST /api/reports/[id]/process.
import { score } from '@trajectoryos/core/scoring';
import type { StudentProfile, Professional } from '@trajectoryos/core/scoring/types';
import type { OnboardData } from '@/lib/onboard/types';
import { OnboardDataSchema } from '@/lib/onboard/schema';
import { getTier, normalizeUniversityName } from '@/lib/onboard/universities';

// ─── Derivation helpers ───────────────────────────────────────

function deriveRoleFunction(industry: string): string {
  const map: Record<string, string> = {
    ib: 'ib_coverage',
    big4_advisory: 'transaction_services',
    big4_audit: 'audit',
    private_equity: 'pe_investment',
    capital_markets: 'sales_trading',
    consulting: 'consulting',
    law: 'law',
    corporate: 'corp_finance',
    government: 'other',
    non_profit: 'other',
    other: 'other',
  };
  return map[industry] ?? 'other';
}

function deriveRelevance(firmTier: string, industry: string): number {
  if (firmTier === 'bb' && industry === 'ib') return 5;
  if ((firmTier === 'elite_boutique' || firmTier === 'mid_market') && industry === 'ib') return 5;
  if (firmTier === 'boutique' && industry === 'ib') return 4;
  if (firmTier === 'big4' && ['big4_advisory', 'big4_audit'].includes(industry)) return 3;
  if (firmTier === 'private_equity') return 4;
  if (industry === 'consulting') return 3;
  if (industry === 'capital_markets') return 3;
  return 2;
}

function buildStudentProfile(form: OnboardData, userId: string, email: string): StudentProfile {
  const universityName = normalizeUniversityName(form.university);
  const universityTier = getTier(universityName) as StudentProfile['university_tier'];

  // Auto-derive signals from WAM and co-op
  const autoSignals: string[] = [...form.signals];
  if (form.wam_band === 'hd') autoSignals.push('wam_hd');
  else if (form.wam_band === 'd') autoSignals.push('wam_distinction');
  if (form.is_co_op) autoSignals.push('co_op_program');
  if (form.atar_band === '99_plus') autoSignals.push('atar_99_plus');

  // Auto-derive signals from experiences
  for (const exp of form.experiences) {
    if (exp.industry === 'private_equity') autoSignals.push('has_pe_internship');
    if (exp.industry === 'big4_audit') autoSignals.push('has_big4_audit');
    if (exp.industry === 'big4_advisory') autoSignals.push('has_big4_advisory');
    if (exp.industry === 'consulting') autoSignals.push('has_consulting_experience');
    if (exp.how_obtained === 'society_referral') autoSignals.push('fin_society_committee');
  }

  const uniqueSignals = [...new Set(autoSignals)] as StudentProfile['signals'];

  // Expected graduation year: current year of study + remaining years
  // (assume 4-year co-op or 3-year bachelor from now)
  const currentCalendarYear = new Date().getFullYear();
  const degreeLength = form.is_co_op
    ? 4
    : form.degree_type === 'double_degree'
    ? 5
    : form.degree_type === 'combined_degree'
    ? 4
    : form.degree_type === 'bachelor'
    ? 3
    : 4;
  // Clamp to at least 1 remaining year — an extended-duration student
  // (e.g. Year 6 on a nominally 3-4 year degree) shouldn't get a graduation
  // year in the past.
  const expectedGradYear = currentCalendarYear + Math.max(degreeLength - form.current_year, 1);

  const experiences: StudentProfile['experiences'] = form.experiences.map((exp) => ({
    type: exp.type as StudentProfile['experiences'][number]['type'],
    firm: exp.firm,
    firm_tier: exp.firm_tier as StudentProfile['experiences'][number]['firm_tier'],
    industry: exp.industry as StudentProfile['experiences'][number]['industry'],
    role_function: deriveRoleFunction(exp.industry) as StudentProfile['experiences'][number]['role_function'],
    role_relevance: deriveRelevance(exp.firm_tier, exp.industry),
    year: exp.year,
    duration_months: exp.duration_months,
    how_obtained: exp.how_obtained as StudentProfile['experiences'][number]['how_obtained'],
    converted_to_ft: exp.converted_to_ft,
  }));

  return {
    id: userId,
    email,
    university: universityName,
    university_tier: universityTier,
    degree: form.degree,
    degree_type: form.degree_type as StudentProfile['degree_type'],
    majors: form.majors,
    current_year: form.current_year,
    expected_graduation_year: expectedGradYear,
    wam_band: form.wam_band as StudentProfile['wam_band'],
    has_honours: form.degree_type === 'honours',
    has_masters_or_second_degree: ['masters', 'mba', 'double_degree'].includes(form.degree_type),
    high_school: null,
    high_school_type: form.high_school_type as StudentProfile['high_school_type'],
    atar_band: form.atar_band as StudentProfile['atar_band'],
    experiences,
    signals: uniqueSignals,
    target_role: 'ib_analyst',
    target_firm_tier: form.target_firm_tier as StudentProfile['target_firm_tier'],
    target_geography: form.target_geography as StudentProfile['target_geography'],
    is_lateral_candidate: form.is_lateral_candidate,
    current_external_role: form.current_external_role || undefined,
  };
}

// JSON-stable equality. Postgres jsonb re-orders object keys, so a plain
// JSON.stringify comparison against a freshly built profile always differs;
// sorting keys recursively makes the comparison order-independent.
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

// ─── Professional row mapping ─────────────────────────────────

// Map a flat DB row (expN_* columns) into the engine's Professional shape.
// Returns null for rows missing the essential fields scoring relies on, so the
// caller can skip them rather than feeding garbage into the engine.
function mapProfessionalRow(row: Record<string, unknown>): Professional | null {
  try {
    const id = row['id'];
    const current_firm_tier = row['current_firm_tier'];
    const university_tier = row['university_tier'];
    if (!id || !current_firm_tier || !university_tier) return null;

    const experiences = [];
    for (const i of [1, 2, 3, 4, 5]) {
      const type = row[`exp${i}_type`];
      if (!type) continue;
      experiences.push({
        type,
        firm: row[`exp${i}_firm`],
        firm_tier: row[`exp${i}_firm_tier`],
        industry: row[`exp${i}_industry`],
        role_function: row[`exp${i}_role_function`],
        role_relevance: row[`exp${i}_role_relevance`],
        year: row[`exp${i}_year`],
        duration_months: row[`exp${i}_duration_months`],
        how_obtained: row[`exp${i}_how_obtained`],
        converted_to_ft: row[`exp${i}_converted_to_ft`] === 'TRUE'
          ? true
          : row[`exp${i}_converted_to_ft`] === 'FALSE'
          ? false
          : 'NA',
      });
    }

    const signals: string[] = (() => {
      const raw = row['signals'];
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch { return []; }
      }
      return [];
    })();

    return {
      id: row['id'],
      full_name_internal: row['full_name_internal'],
      current_role: row['current_role'],
      current_firm: row['current_firm'],
      current_firm_tier: row['current_firm_tier'],
      current_geography: row['current_geography'],
      current_role_start_year: row['current_role_start_year'],
      years_to_current_role: row['years_to_current_role'],
      university: row['university'],
      university_tier: row['university_tier'],
      degree: row['degree'],
      degree_type: row['degree_type'],
      majors: row['majors'],
      wam_band: row['wam_band'],
      graduation_year: row['graduation_year'],
      has_honours: row['has_honours'],
      has_masters_or_second_degree: row['has_masters_or_second_degree'],
      high_school: row['high_school'],
      high_school_type: row['high_school_type'],
      atar_band: row['atar_band'],
      experiences,
      signals,
      path_summary: row['path_summary'],
      data_source: row['data_source'],
      data_confidence: row['data_confidence'],
    } as Professional;
  } catch {
    return null;
  }
}

// ─── Route handler ────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    // 1. Verify auth
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    // 2. Validate the client-controlled form payload (trust boundary)
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: 'Request body is not valid JSON' }, { status: 400 });
    }

    const parsed = OnboardDataSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid profile data',
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 },
      );
    }
    const formData: OnboardData = parsed.data;

    // 3. Build StudentProfile
    const profile = buildStudentProfile(formData, user.id, user.email!);

    const serviceClient = createServiceClient();

    // 3b. Idempotency guard: if this exact profile was already scored and has a
    // usable (non-error) report, return that report instead of regenerating.
    // Reports persist per user — they are only regenerated when the profile
    // actually changes.
    const { data: existingProfileRow } = await serviceClient
      .from('student_profiles')
      .select('id, profile')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingProfileRow && stableStringify(existingProfileRow.profile) === stableStringify(profile)) {
      const { data: existingReport } = await serviceClient
        .from('reports')
        .select('id')
        .eq('user_id', user.id)
        .eq('profile_id', existingProfileRow.id)
        .neq('status', 'error')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingReport) {
        return NextResponse.json({ reportId: existingReport.id, existing: true });
      }
    }

    // 4. Fetch professionals from Supabase
    const { data: profRows, error: profError } = await serviceClient
      .from('professionals')
      .select('*');

    if (profError || !profRows) {
      console.error('Failed to fetch professionals:', profError);
      return NextResponse.json({ error: 'Failed to load professional database' }, { status: 500 });
    }

    // Convert flat DB rows → Professional objects (collapse exp slots).
    // Defensive: a single malformed row is skipped, not allowed to crash the
    // whole request. We surface a warning if a meaningful fraction drop out.
    const professionals: Professional[] = [];
    let skipped = 0;
    for (const row of profRows as Record<string, unknown>[]) {
      const mapped = mapProfessionalRow(row);
      if (mapped) professionals.push(mapped);
      else skipped++;
    }
    if (skipped > 0) {
      console.warn(`generate-report: skipped ${skipped}/${profRows.length} malformed professional rows`);
    }
    if (professionals.length === 0) {
      return NextResponse.json(
        { error: 'Professional database is empty or unreadable' },
        { status: 500 },
      );
    }

    // 5. Run scoring engine (fast, in-memory — safe to do inline)
    const scoringOutput = score(profile, professionals, { now: new Date() });

    // 6. Persist the profile — one row per user. Updating (rather than
    //    inserting a new row each run) keeps the user's profile stable;
    //    old reports keep pointing at the same profile_id.
    let profileId: string;
    if (existingProfileRow) {
      const { error: profileError } = await serviceClient
        .from('student_profiles')
        .update({ email: user.email, profile })
        .eq('id', existingProfileRow.id);

      if (profileError) {
        console.error('Failed to update profile:', profileError);
        return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
      }
      profileId = existingProfileRow.id;
    } else {
      const { data: savedProfile, error: profileError } = await serviceClient
        .from('student_profiles')
        .insert({ user_id: user.id, email: user.email, profile })
        .select('id')
        .single();

      if (profileError || !savedProfile) {
        console.error('Failed to save profile:', profileError);
        return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
      }
      profileId = savedProfile.id;
    }

    // 7. Create the report in 'processing' state. The LLM step runs separately
    //    in POST /api/reports/[id]/process so neither request risks a timeout.
    const { data: savedReport, error: reportError } = await serviceClient
      .from('reports')
      .insert({
        user_id: user.id,
        profile_id: profileId,
        scoring_output: scoringOutput,
        llm_report: null,
        has_access: true,
        status: 'processing',
      })
      .select('id')
      .single();

    if (reportError || !savedReport) {
      console.error('Failed to save report:', reportError);
      return NextResponse.json({ error: 'Failed to save report' }, { status: 500 });
    }

    return NextResponse.json({ reportId: savedReport.id });
  } catch (err) {
    console.error('generate-report error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
