// ============================================================
// Australian IB recruiting timeline — static reference data.
//
// Used by Module 6 lessons (rendered with the last_reviewed date
// visible) and included in the roadmap LLM input so generated plans
// anchor to real application windows.
//
// IMPORTANT: these are typical patterns, not guaranteed deadlines.
// Firms move dates every cycle — the UI must always show
// last_reviewed and tell students to verify with each firm.
// ============================================================

export interface RecruitingCycle {
  id: string;
  name: string;
  audience: string;
  /** Typical application window (month-level, AU calendar). */
  typical_open: string;
  typical_close: string;
  /** When the program itself runs. */
  program_period: string;
  notes: string;
}

export const AU_TIMELINE_LAST_REVIEWED = '2026-07-07';

export const AU_RECRUITING_CYCLES: RecruitingCycle[] = [
  {
    id: 'summer_internship',
    name: 'Summer internships (penultimate-year vacation programs)',
    audience: 'Penultimate-year students (second-last year of study)',
    typical_open: 'February–March',
    typical_close: 'March–April (many close early or assess on a rolling basis)',
    program_period: 'November–February (Australian summer)',
    notes:
      'The main pipeline into IB analyst roles at major banks — strong performers ' +
      'receive graduate return offers. Apply early: rolling assessment means late ' +
      'applications can miss out even before the stated deadline.',
  },
  {
    id: 'winter_internship',
    name: 'Winter vacation programs',
    audience: 'Mostly penultimate-year students; varies by firm',
    typical_open: 'January–March',
    typical_close: 'March–April',
    program_period: 'June–July (Australian winter)',
    notes:
      'Offered by some banks and advisory firms as a smaller counterpart to summer ' +
      'programs. A useful entry point, especially for students on non-standard ' +
      'timetables.',
  },
  {
    id: 'graduate_program',
    name: 'Graduate analyst programs',
    audience: 'Final-year students and recent graduates',
    typical_open: 'February–March',
    typical_close: 'April (varies)',
    program_period: 'Start the following year',
    notes:
      'Many graduate seats are filled by returning interns first, so open market ' +
      'spots are limited — competition is harder than for internships. Some firms ' +
      'only open graduate applications if interns did not fill the class.',
  },
  {
    id: 'off_cycle',
    name: 'Off-cycle internships and boutique hiring',
    audience: 'Any year; especially useful for non-penultimate students',
    typical_open: 'Year-round',
    typical_close: 'Year-round (ad hoc)',
    program_period: 'Flexible, often during semester',
    notes:
      'Boutiques and mid-market firms hire when they need someone, usually through ' +
      'networking and direct approaches rather than portals. Often the most ' +
      'realistic first IB experience — and a strong signal for later structured ' +
      'applications.',
  },
  {
    id: 'insight_programs',
    name: 'Insight / early-talent programs (first and second year)',
    audience: 'First-year and second-year students (some target specific cohorts)',
    typical_open: 'Varies by firm (often early in the calendar year)',
    typical_close: 'Varies by firm',
    program_period: 'Short programs (days) during the year',
    notes:
      'Pre-internship exposure programs at several major firms. Low time cost, ' +
      'valuable network and a foot in the door for the internship cycle. Check ' +
      'each firm’s early-careers page for current offerings.',
  },
];
