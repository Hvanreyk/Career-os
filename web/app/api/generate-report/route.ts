import { NextResponse } from 'next/server';
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server';

// Scoring engine — shared workspace package (lib/ → @trajectoryos/core).
// The LLM step runs separately in POST /api/reports/[id]/process.
import { score } from '@trajectoryos/core/scoring';
import type { StudentProfile } from '@trajectoryos/core/scoring/types';
import {
  deriveAutoSignals,
  deriveRelevance,
  deriveRoleFunction,
} from '@trajectoryos/core/career-compass/taxonomy';
import type { OnboardData } from '@/lib/onboard/types';
import { OnboardDataSchema } from '@/lib/onboard/schema';
import { getTier, normalizeUniversityName } from '@/lib/onboard/universities';
import { loadProfessionalSources, ProfessionalSourceError } from '@/lib/professionals/source';
import {
  summarizeProfessionalParity,
  summarizeScoringParity,
} from '@/lib/professionals/parity';

// ─── Derivation helpers ───────────────────────────────────────

export function buildStudentProfile(form: OnboardData, userId: string, email: string): StudentProfile {
  const universityName = normalizeUniversityName(form.university);
  const universityTier = getTier(universityName) as StudentProfile['university_tier'];

  const autoSignals = deriveAutoSignals({
    wamBand: form.wam_band,
    isCoOp: form.is_co_op,
    atarBand: form.atar_band,
    experiences: form.experiences.map((experience) => ({
      industry: experience.industry,
      howObtained: experience.how_obtained,
    })),
  });
  const uniqueSignals: StudentProfile['signals'] = [...new Set([
    ...form.signals,
    ...autoSignals,
  ])];
  const hasHonoursSignal = uniqueSignals.includes('honours');

  // Expected graduation year: current year of study + remaining years
  // (assume 4-year co-op or 3-year bachelor from now; an Honours year adds
  // one to the bachelor length, since Honours is no longer a degree_type)
  const currentCalendarYear = new Date().getFullYear();
  const degreeLength = form.is_co_op
    ? 4
    : form.degree_type === 'double_degree'
    ? 5
    : form.degree_type === 'combined_degree'
    ? 4
    : form.degree_type === 'bachelor'
    ? (hasHonoursSignal ? 4 : 3)
    : 4;
  // Clamp to at least 1 remaining year — an extended-duration student
  // (e.g. Year 6 on a nominally 3-4 year degree) shouldn't get a graduation
  // year in the past.
  const expectedGradYear = currentCalendarYear + Math.max(degreeLength - form.current_year, 1);

  const experiences: StudentProfile['experiences'] = form.experiences.map((exp) => ({
    type: exp.type,
    firm: exp.firm,
    firm_tier: exp.firm_tier,
    industry: exp.industry,
    role_function: deriveRoleFunction(exp.industry),
    role_relevance: deriveRelevance(exp.firm_tier, exp.industry),
    year: exp.year,
    duration_months: exp.duration_months,
    how_obtained: exp.how_obtained,
    converted_to_ft: exp.converted_to_ft,
  }));

  return {
    id: userId,
    email,
    university: universityName,
    university_tier: universityTier,
    degree: form.degree,
    degree_type: form.degree_type,
    majors: form.majors,
    current_year: form.current_year,
    expected_graduation_year: expectedGradYear,
    wam_band: form.wam_band,
    has_honours: hasHonoursSignal,
    has_masters_or_second_degree: ['masters', 'mba', 'double_degree'].includes(form.degree_type),
    high_school: null,
    high_school_type: form.high_school_type,
    atar_band: form.atar_band,
    experiences,
    signals: uniqueSignals,
    target_role: 'ib_analyst',
    target_firm_tier: form.target_firm_tier,
    target_geography: form.target_geography,
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

    // 4. Load the selected professional source. Normalized mode fails closed
    // on any rejected row; shadow mode returns the legacy result while
    // comparing both sources without logging professional identifiers.
    let loadedProfessionals;
    try {
      loadedProfessionals = await loadProfessionalSources(serviceClient);
    } catch (error) {
      const reason = error instanceof ProfessionalSourceError ? error.reason : 'query_failed';
      console.error('generate-report: professional source unavailable', { reason });
      return NextResponse.json({ error: 'Failed to load professional database' }, { status: 500 });
    }

    // 5. Run scoring engine (fast, in-memory — safe to do inline).
    const scoringNow = new Date();
    const scoringOutput = score(profile, loadedProfessionals.professionals, { now: scoringNow });

    if (loadedProfessionals.mode === 'shadow') {
      if (loadedProfessionals.shadowProfessionals) {
        const normalizedOutput = score(profile, loadedProfessionals.shadowProfessionals, { now: scoringNow });
        console.info('professional-source-parity', {
          ...summarizeProfessionalParity(
            loadedProfessionals.professionals,
            loadedProfessionals.shadowProfessionals,
          ),
          scoring: summarizeScoringParity(scoringOutput, normalizedOutput),
        });
      } else {
        console.warn('professional-source-parity', {
          exact: false,
          normalized_source_error: loadedProfessionals.shadowError ?? 'query_failed',
        });
      }
    }

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
