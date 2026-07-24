/**
 * Generates the SYNTHETIC professional fixture committed at
 * tests/scoring/professionals.snapshot.json.
 *
 * The real professional data lives in Supabase and contains real people —
 * including, in the education fields, named high schools that (combined with
 * university/firm/year) can be individually re-identifying even without a name
 * column. That data must never be committed to git. This generator produces
 * fully fabricated professionals with a realistic tier/geography/experience
 * distribution so the scoring test-suite has representative, hermetic,
 * PII-free data to run against. Deterministic (seeded RNG) so re-runs produce
 * a stable, reviewable diff.
 *
 * Regenerate with:  npx tsx scripts/generate-synthetic-professionals.ts
 *
 * For real-data-backed calibration, use scripts/snapshot-professionals.ts
 * instead — it writes to a git-ignored local-only path, never committed.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseProfessionalRowsOrThrow } from '../lib/scoring/professional-adapter.js';

// ----- Seeded RNG (mulberry32) for a stable, reviewable output -----
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260724);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
const chance = (p: number) => rand() < p;
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

const UNIS = [
  { name: 'UNSW', tier: 'go8_top' as const },
  { name: 'University of Sydney', tier: 'go8_top' as const },
  { name: 'University of Melbourne', tier: 'go8_top' as const },
  { name: 'Australian National University', tier: 'go8_top' as const },
  { name: 'Monash University', tier: 'go8_other' as const },
  { name: 'University of Queensland', tier: 'go8_other' as const },
  { name: 'University of Western Australia', tier: 'go8_other' as const },
  { name: 'University of Technology Sydney', tier: 'atn' as const },
  { name: 'Macquarie University', tier: 'other_au' as const },
];

const FIRMS_BB = ['Citi', 'Morgan Stanley', 'UBS', 'Goldman Sachs', 'Bank of America', 'J.P. Morgan'];
const FIRMS_EB = ['Greenhill & Co.', 'Moelis Australia', 'Lazard', 'Rothschild & Co', 'Evercore', 'Luminis Partners'];
const FIRMS_MM = ['Nomura', 'RBC Capital Markets', 'MA Financial Group', 'Jefferies', 'Houlihan Lokey', 'Jarden'];
// Fictional boutique names — deliberately not copied from any real firm list.
const FIRMS_BOUTIQUE = ['Southbank Capital Advisory', 'Meridian Corporate Finance', 'Wentworth Partners',
  'Ashgrove Advisory', 'Endeavour Capital Partners', 'Kestrel M&A Advisory'];
const FIRMS_BIG4 = ['KPMG', 'EY', 'PwC', 'Deloitte'];
const FIRMS_PE = ['Quadrant Private Equity', 'Archer Capital', 'Adamantem Capital'];

const HIGH_SCHOOL_TYPES = ['selective', 'independent_other', 'catholic', 'public_comprehensive', 'gps', 'unknown'] as const;
const SIGNAL_POOL = [
  'investment_society_member', 'investment_society_committee', 'investment_society_president',
  'fin_society_committee', 'modelling_course', 'deans_list', 'cfa_l1',
  'honours_first_class', 'society_committee', 'chartered_accountant', 'selective_school',
  'sports_volunteer', 'hsc_distinguished_achiever', 'consulting_society_member', 'wam_top_10',
];

interface Row extends Record<string, unknown> {
  id: string;
}

function experience(opts: {
  type: string; firm: string; firm_tier: string; industry: string;
  year: number; relevance: number; how_obtained: string; duration: number; convertedToFt: boolean | 'NA';
}) {
  return {
    type: opts.type, firm: opts.firm, firm_tier: opts.firm_tier, industry: opts.industry,
    role_function: 'ib_coverage', role_relevance: opts.relevance, year: opts.year,
    duration_months: opts.duration, how_obtained: opts.how_obtained, converted_to_ft: opts.convertedToFt,
  };
}

function buildProfessional(idNum: number): Row {
  const id = `P${String(idNum).padStart(3, '0')}`;
  const uni = pick(UNIS);
  const geography = chance(0.7) ? 'sydney' : chance(0.75) ? 'melbourne' : pick(['brisbane', 'perth', 'adelaide']);
  const tierRoll = rand();
  const tier = tierRoll < 0.28 ? 'bb' : tierRoll < 0.42 ? 'elite_boutique' : tierRoll < 0.67 ? 'mid_market' : 'boutique';
  const firm = tier === 'bb' ? pick(FIRMS_BB) : tier === 'elite_boutique' ? pick(FIRMS_EB)
    : tier === 'mid_market' ? pick(FIRMS_MM) : pick(FIRMS_BOUTIQUE);

  // Derive every date from ONE coherent timeline so a role can never start
  // before graduation. `isSenior` exercises the years_to_current_role > 3
  // cohort-exclusion filter: seniors graduated further back and were later
  // promoted into their current role; non-seniors' current role IS their
  // graduate role (roleStartYear == gradYear).
  const isSenior = chance(0.15);
  const gradYear = isSenior ? int(2016, 2021) : int(2023, 2025);
  const roleStartYear = isSenior ? gradYear + int(1, 3) : gradYear;
  const yearsToRole = 2026 - roleStartYear;
  const penultYear = gradYear - 1;
  const summerYear = gradYear - 2;

  const experiences: unknown[] = [];
  if (chance(0.5)) {
    experiences.push(experience({
      type: 'summer_internship', firm: pick(FIRMS_BIG4), firm_tier: 'big4', industry: 'big4_advisory',
      year: summerYear, relevance: 3, how_obtained: 'online_application', duration: 3, convertedToFt: false,
    }));
  }
  const penultTier = tier;
  const penultFirm = firm;
  experiences.push(experience({
    type: 'penultimate_internship', firm: penultFirm, firm_tier: penultTier, industry: 'ib',
    year: penultYear, relevance: 5, how_obtained: chance(0.5) ? 'online_application' : 'networking_event',
    duration: 3, convertedToFt: true,
  }));
  experiences.push(experience({
    type: 'full_time', firm, firm_tier: tier, industry: 'ib',
    year: gradYear, relevance: 5, how_obtained: 'return_offer', duration: 12, convertedToFt: 'NA',
  }));

  const wamBand = pick(['hd', 'hd', 'd', 'd', 'd', 'c'] as const);
  const signals: string[] = [];
  if (chance(0.4)) signals.push(pick(['investment_society_member', 'investment_society_committee', 'investment_society_president']));
  if (chance(0.4)) signals.push('fin_society_committee');
  if (chance(0.5)) signals.push('modelling_course');
  if (chance(0.3)) signals.push('deans_list');
  if (chance(0.15)) signals.push('cfa_l1');
  if (chance(0.2)) signals.push(pick(SIGNAL_POOL));

  return {
    id,
    current_role: yearsToRole >= 4 ? 'ib_associate' : 'ib_analyst',
    current_firm: firm,
    current_firm_tier: tier,
    current_geography: geography,
    current_role_start_year: roleStartYear,
    years_to_current_role: yearsToRole,
    university: uni.name,
    university_tier: uni.tier,
    degree: chance(0.15) ? 'Bachelor of Commerce (Co-op)' : 'Bachelor of Commerce',
    degree_type: 'bachelor',
    majors: pick(['Finance', 'Finance, Economics', 'Accounting, Finance', 'Finance, Econometrics']),
    wam_band: wamBand,
    graduation_year: gradYear,
    has_honours: chance(0.15),
    has_masters_or_second_degree: chance(0.05),
    high_school: null,
    high_school_type: pick(HIGH_SCHOOL_TYPES),
    atar_band: pick(['99_plus', '98_99', '95_98', '90_95', 'unknown'] as const),
    experiences,
    signals: [...new Set(signals)],
    achievements: [],
    path_summary:
      `${uni.name} ${uni.tier === 'go8_top' ? 'Commerce' : 'Business'} (${wamBand.toUpperCase()})`
      + ` -> ${penultTier.replace(/_/g, ' ')} penultimate at ${penultFirm} -> ${firm} FT analyst.`,
    data_source: pick(['linkedin', 'survey']),
    data_confidence: pick(['high', 'medium']),
    taxonomy_version: '2026-07-15.1',
    derivation_version: '2026-07-15.1',
    feature_version: 'professional-v1',
  };
}

const rows: Row[] = [];

// P001 is pinned to satisfy tests/scoring/computed.test.ts's explicit
// computeFields expectations (has_ib_experience, has_pe_experience,
// highest_firm_tier_reached=bb, has_conversion, has_smif, is_co_op_program).
rows.push({
  id: 'P001',
  current_role: 'ib_analyst', current_firm: 'Citi', current_firm_tier: 'bb',
  current_geography: 'sydney', current_role_start_year: 2023, years_to_current_role: 3,
  university: 'UNSW', university_tier: 'go8_top',
  degree: 'Bachelor of Commerce (Co-op)', degree_type: 'bachelor', majors: 'Accounting, Finance',
  wam_band: 'hd', graduation_year: 2023, has_honours: false, has_masters_or_second_degree: false,
  high_school: null, high_school_type: 'unknown', atar_band: '99_plus',
  experiences: [
    experience({ type: 'summer_internship', firm: 'Quadrant Private Equity', firm_tier: 'private_equity',
      industry: 'private_equity', year: 2021, relevance: 4, how_obtained: 'networking_event', duration: 3, convertedToFt: false }),
    experience({ type: 'penultimate_internship', firm: 'Citi', firm_tier: 'bb', industry: 'ib',
      year: 2022, relevance: 5, how_obtained: 'online_application', duration: 3, convertedToFt: true }),
    experience({ type: 'full_time', firm: 'Citi', firm_tier: 'bb', industry: 'ib',
      year: 2023, relevance: 5, how_obtained: 'return_offer', duration: 12, convertedToFt: 'NA' }),
  ],
  signals: ['investment_society_committee', 'co_op_program', 'modelling_course'],
  achievements: [],
  path_summary: 'UNSW Commerce Co-op (HD) -> PE insight (Quadrant) -> Citi penultimate -> Citi FT analyst (return offer).',
  data_source: 'linkedin', data_confidence: 'high',
  taxonomy_version: '2026-07-15.1', derivation_version: '2026-07-15.1', feature_version: 'professional-v1',
});

for (let i = 2; i <= 40; i++) rows.push(buildProfessional(i));

parseProfessionalRowsOrThrow(rows, 'normalized');
rows.sort((a, b) => String(a.id).localeCompare(String(b.id)));

const out = resolve('tests/scoring/professionals.snapshot.json');
writeFileSync(out, `${JSON.stringify(rows, null, 2)}\n`);
console.log(`Wrote ${rows.length} synthetic professionals to ${out}`);
