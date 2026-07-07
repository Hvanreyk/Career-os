import { z } from 'zod';
import type { StudentProfile } from '../scoring/types';

// ============================================================
// Course diagnostic
//
// A short questionnaire taken when starting a course. Answers are
// scored deterministically by readiness.ts (no LLM). Pure module —
// same conventions as lib/scoring.
// ============================================================

export const DIMENSIONS = [
  'ib_understanding',
  'technical',
  'recruiting_process',
  'profile',
  'networking',
  'timeline',
] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const DIMENSION_LABELS: Record<Dimension, string> = {
  ib_understanding: 'Industry understanding',
  technical: 'Technical knowledge',
  recruiting_process: 'Recruiting process',
  profile: 'Profile strength',
  networking: 'Networking traction',
  timeline: 'Timeline position',
};

export interface DiagnosticOption {
  id: string;
  text: string;
  /** 0 (weakest) – 4 (strongest) contribution to the dimension. */
  points: number;
}

export interface DiagnosticQuestion {
  id: string;
  dimension: Dimension;
  prompt: string;
  options: DiagnosticOption[];
}

// Two questions per dimension, options ordered weakest → strongest.
export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  // ── Industry understanding ─────────────────────────────────
  {
    id: 'ib_explain',
    dimension: 'ib_understanding',
    prompt: 'If someone asked you "what does an investment bank actually do?", how would you go?',
    options: [
      { id: 'a', text: "I couldn't really answer it", points: 0 },
      { id: 'b', text: 'I could give a vague answer about finance and deals', points: 1 },
      { id: 'c', text: 'I could explain M&A advisory and capital raising at a high level', points: 3 },
      { id: 'd', text: 'I could explain the divisions, fee model and how banks differ confidently', points: 4 },
    ],
  },
  {
    id: 'ib_deals',
    dimension: 'ib_understanding',
    prompt: 'How well do you understand how a deal (e.g. a company sale or an IPO) actually runs?',
    options: [
      { id: 'a', text: "I don't know what the stages of a deal are", points: 0 },
      { id: 'b', text: "I know deals happen but couldn't describe the process", points: 1 },
      { id: 'c', text: 'I could sketch the main stages of a sale process or IPO', points: 3 },
      { id: 'd', text: 'I could walk through a process end-to-end, including the documents involved', points: 4 },
    ],
  },
  // ── Technical knowledge ────────────────────────────────────
  {
    id: 'tech_accounting',
    dimension: 'technical',
    prompt: 'How comfortable are you with the three financial statements and how they link?',
    options: [
      { id: 'a', text: "I haven't studied them", points: 0 },
      { id: 'b', text: 'I know what each statement shows but not how they connect', points: 1 },
      { id: 'c', text: 'I can walk through how they link (e.g. depreciation through all three)', points: 3 },
      { id: 'd', text: 'I can handle applied scenarios and interview-style accounting questions', points: 4 },
    ],
  },
  {
    id: 'tech_valuation',
    dimension: 'technical',
    prompt: 'Could you explain the main valuation methods (DCF, comparable companies, precedent transactions)?',
    options: [
      { id: 'a', text: "I couldn't name them", points: 0 },
      { id: 'b', text: 'I could name them but not explain how they work', points: 1 },
      { id: 'c', text: 'I could explain each method and when it is used', points: 3 },
      { id: 'd', text: 'I could discuss trade-offs, multiples and why methods disagree', points: 4 },
    ],
  },
  // ── Recruiting process ─────────────────────────────────────
  {
    id: 'rec_timeline',
    dimension: 'recruiting_process',
    prompt: 'Do you know when internship / graduate applications open and close for your target firms?',
    options: [
      { id: 'a', text: 'No idea', points: 0 },
      { id: 'b', text: 'Rough idea of the time of year', points: 2 },
      { id: 'c', text: 'I know the windows and which cycle applies to my year', points: 3 },
      { id: 'd', text: 'I track specific firms’ dates and deadlines already', points: 4 },
    ],
  },
  {
    id: 'rec_stages',
    dimension: 'recruiting_process',
    prompt: 'How familiar are you with the stages of IB recruiting (online application, psychometric tests, video/phone interviews, assessment centres, final rounds)?',
    options: [
      { id: 'a', text: "I don't know the stages", points: 0 },
      { id: 'b', text: "I've heard of them but don't know what each involves", points: 1 },
      { id: 'c', text: 'I know the stages and roughly what each assesses', points: 3 },
      { id: 'd', text: "I've been through parts of the process before", points: 4 },
    ],
  },
  // ── Profile strength ───────────────────────────────────────
  {
    id: 'prof_experience',
    dimension: 'profile',
    prompt: 'What is your most relevant experience so far?',
    options: [
      { id: 'a', text: 'No work experience yet', points: 0 },
      { id: 'b', text: 'Non-finance work (retail, hospitality, tutoring, etc.)', points: 1 },
      { id: 'c', text: 'Finance-adjacent activity (society committee, case comps, student fund)', points: 2 },
      { id: 'd', text: 'A finance internship (accounting, consulting, wealth, corporate)', points: 3 },
      { id: 'e', text: 'An IB, PE or similar front-office finance internship', points: 4 },
    ],
  },
  {
    id: 'prof_resume',
    dimension: 'profile',
    prompt: 'If an application closed tomorrow, could you submit a strong one-page resume?',
    options: [
      { id: 'a', text: "I don't have a resume", points: 0 },
      { id: 'b', text: 'I have one but it needs serious work', points: 1 },
      { id: 'c', text: "I have a decent one-pager that hasn't been reviewed by anyone in finance", points: 2 },
      { id: 'd', text: 'I have a polished, finance-formatted resume that has been reviewed', points: 4 },
    ],
  },
  // ── Networking traction ────────────────────────────────────
  {
    id: 'net_conversations',
    dimension: 'networking',
    prompt: 'How many people working in (or recently out of) investment banking have you actually spoken to?',
    options: [
      { id: 'a', text: 'None', points: 0 },
      { id: 'b', text: 'One or two brief conversations', points: 2 },
      { id: 'c', text: 'Several conversations (coffee chats, events, alumni)', points: 3 },
      { id: 'd', text: 'An ongoing network I keep in touch with', points: 4 },
    ],
  },
  {
    id: 'net_presence',
    dimension: 'networking',
    prompt: 'Could you introduce yourself professionally right now (LinkedIn profile + a 30-second intro)?',
    options: [
      { id: 'a', text: 'No LinkedIn profile and no prepared intro', points: 0 },
      { id: 'b', text: 'A basic LinkedIn profile, no prepared intro', points: 1 },
      { id: 'c', text: 'A solid profile and a rough intro I could improvise', points: 3 },
      { id: 'd', text: 'A polished profile and a practised introduction', points: 4 },
    ],
  },
  // ── Timeline position ──────────────────────────────────────
  {
    id: 'time_year',
    dimension: 'timeline',
    prompt: 'Where are you relative to penultimate year (when the main internship applications happen)?',
    options: [
      { id: 'a', text: 'Penultimate year now — applications are imminent or open', points: 1 },
      { id: 'b', text: 'Final year or graduated (targeting grad roles or off-cycle)', points: 1 },
      { id: 'c', text: 'One year before penultimate year', points: 3 },
      { id: 'd', text: 'Two or more years before penultimate year', points: 4 },
    ],
  },
  {
    id: 'time_started',
    dimension: 'timeline',
    prompt: 'How far along is your preparation relative to your next application window?',
    options: [
      { id: 'a', text: "Haven't started and the window is close", points: 0 },
      { id: 'b', text: 'Just starting', points: 1 },
      { id: 'c', text: 'Underway — some prep done, gaps remain', points: 3 },
      { id: 'd', text: 'Well underway — resume, networking and technicals all moving', points: 4 },
    ],
  },
];

// ─── Answers schema ──────────────────────────────────────────

/** {questionId: optionId} — every question answered with a valid option. */
export const DiagnosticAnswersSchema = z
  .record(z.string(), z.string())
  .superRefine((answers, ctx) => {
    for (const q of DIAGNOSTIC_QUESTIONS) {
      const chosen = answers[q.id];
      if (chosen === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `missing answer for question '${q.id}'`,
        });
      } else if (!q.options.some((o) => o.id === chosen)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `invalid option '${chosen}' for question '${q.id}'`,
        });
      }
    }
    const known = new Set(DIAGNOSTIC_QUESTIONS.map((q) => q.id));
    for (const key of Object.keys(answers)) {
      if (!known.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `unknown question '${key}'`,
        });
      }
    }
  });
export type DiagnosticAnswers = z.infer<typeof DiagnosticAnswersSchema>;

// ─── Prefill from the onboarding profile ─────────────────────

/**
 * Suggest diagnostic answers from an existing StudentProfile (the
 * onboarding data stored in student_profiles.profile). Returns a
 * partial map of {questionId: optionId} the wizard preselects — the
 * student can change anything before submitting.
 *
 * `now` is injected (same convention as score()) so behaviour is
 * deterministic in tests.
 */
export function prefillFromProfile(
  profile: StudentProfile,
  now: Date = new Date(),
): Partial<Record<string, string>> {
  const prefill: Partial<Record<string, string>> = {};

  // prof_experience — from the strongest experience on record.
  const tiers = new Set(profile.experiences.map((e) => e.firm_tier));
  const frontOffice = ['bb', 'elite_boutique', 'mid_market', 'elite_boutique_and_mm', 'boutique', 'private_equity'];
  const financeAdjacent = ['big4', 'top_tier_law', 'corporate'];
  const signals = new Set<string>(profile.signals);
  if (frontOffice.some((t) => tiers.has(t as never))) {
    prefill.prof_experience = 'e';
  } else if (financeAdjacent.some((t) => tiers.has(t as never))) {
    prefill.prof_experience = 'd';
  } else if (
    signals.has('investment_society_committee') ||
    signals.has('investment_society_president') ||
    signals.has('fin_society_committee') ||
    signals.has('case_comp_winner') ||
    signals.has('case_comp_finalist') ||
    signals.has('stock_pitch_winner')
  ) {
    prefill.prof_experience = 'c';
  } else if (profile.experiences.length > 0) {
    prefill.prof_experience = 'b';
  } else {
    prefill.prof_experience = 'a';
  }

  // time_year — penultimate year is the year before graduation year, i.e.
  // ~2 calendar years remaining. (Students can adjust in the wizard.)
  const yearsRemaining = profile.expected_graduation_year - now.getFullYear();
  if (yearsRemaining <= 1) {
    prefill.time_year = 'b'; // final year or graduated
  } else if (yearsRemaining === 2) {
    prefill.time_year = 'a'; // penultimate year now
  } else if (yearsRemaining === 3) {
    prefill.time_year = 'c';
  } else {
    prefill.time_year = 'd';
  }

  return prefill;
}
