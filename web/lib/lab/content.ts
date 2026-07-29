/**
 * Shared product truth for the MappedLabs landing-page concepts at /v1–/v5.
 *
 * All five concepts render the SAME facts in different visual systems, so
 * /design-lab compares design directions rather than copy.
 *
 * Nothing here claims usage figures, success rates, partnerships, customer
 * counts, bank or university endorsements, or press coverage. The one profile
 * readout is a constructed example and is labelled as such everywhere it
 * appears — see `sampleProfile.disclaimer`.
 */

export const brand = {
  name: 'MappedLabs',
  eyebrow: 'Career intelligence for high finance',
  headline: 'Map your route into investment banking.',
  support:
    'MappedLabs benchmarks your profile, identifies the gaps and turns recruiting timelines into a ranked plan of what to do next.',
  short: 'Know where you stand, understand what matters, and receive a mapped path forward.',
} as const;

/** The primary conversion action. Wording is fixed across all five concepts. */
export const primaryCta = {
  label: 'Build My Career Map',
  href: '/onboard',
} as const;

export const secondaryCtas = {
  how: { label: 'See How It Works', href: '#how' },
  compass: { label: 'Explore Career Compass', href: '/tools/career-compass' },
  sample: { label: 'View a Sample Career Map', href: '#sample' },
} as const;

/**
 * Section 2 — the problem. Deliberately six items, not three: the point is that
 * the uncertainty is broad and compounding, which three icon cards would flatten.
 */
export const problem = {
  heading: 'Technical knowledge is not the hard part.',
  body: 'Most students who miss out on high finance are not short on effort. They are working without a reference point — unable to see how they compare, what stage they are at, or which of the twenty things on their list actually moves the outcome.',
  unknowns: [
    { q: 'How do I compare?', a: 'No visibility into the standard candidates are actually held to.' },
    { q: 'What stage am I at?', a: 'Recruiting stages are unwritten, and each one expects different evidence.' },
    { q: 'Which gaps matter?', a: 'A missing modelling course and a missing society role are not equivalent.' },
    { q: 'When do I apply?', a: 'Australian penultimate windows open earlier than most students expect.' },
    { q: 'What is high impact?', a: 'Effort spread evenly across everything is effort spent on the wrong things.' },
    { q: 'Am I moving fast enough?', a: 'Progress is invisible without something to measure it against.' },
  ],
} as const;

/** Section 3 — the eight readouts Career Compass produces. */
export const compassReadouts = [
  { key: 'stage', label: 'Current Stage', note: 'Where you sit in the recruiting sequence' },
  { key: 'strength', label: 'Profile Strength', note: 'Benchmarked against mapped professional paths' },
  { key: 'interview', label: 'Interview Readiness', note: 'Valuation, LBO and deal mechanics fluency' },
  { key: 'network', label: 'Network Coverage', note: 'Breadth and depth of relevant professional contact' },
  { key: 'pipeline', label: 'Application Pipeline', note: 'Firms, rounds and status in one register' },
  { key: 'actions', label: 'Priority Actions', note: 'Ranked by modelled impact and urgency' },
  { key: 'deadlines', label: 'Recruiting Deadlines', note: 'The windows that constrain your sequence' },
  { key: 'deals', label: 'Deal Knowledge', note: 'Commercial awareness you can actually discuss' },
] as const;

export const compass = {
  name: 'Career Compass',
  href: '/tools/career-compass',
  heading: 'A decision system, not a questionnaire.',
  body: 'Career Compass takes your profile and experience, scores it against a database of mapped professional paths, and returns a structured read of where you stand and what to do next. It is the same output every time for the same inputs.',
} as const;

/** Section 4 — how the system thinks. An analytical method, not an onboarding strip. */
export const method = {
  heading: 'How the system thinks',
  body: 'Five stages, run in order. Each one narrows what the next has to consider.',
  steps: [
    {
      n: '01',
      title: 'Intake',
      body: 'You supply your degree, year, results, experience and the signals you have accumulated so far.',
    },
    {
      n: '02',
      title: 'Positioning',
      body: 'Your profile is scored against mapped professional paths to establish where you currently sit rather than where you feel you sit.',
    },
    {
      n: '03',
      title: 'Gap identification',
      body: 'The difference between your profile and the paths you are targeting is decomposed into specific, nameable gaps.',
    },
    {
      n: '04',
      title: 'Ranking',
      body: 'Gaps are ordered by modelled impact and by how soon the relevant recruiting window closes. Not everything is worth doing.',
    },
    {
      n: '05',
      title: 'Revision',
      body: 'As you close gaps and your stage changes, the ranking is recomputed. The plan is a live document, not a one-off result.',
    },
  ],
} as const;

/** Section 5 — core capabilities. Eight, presented as an index rather than a card grid. */
export const capabilities = [
  { id: 'B-01', title: 'Profile benchmarking', body: 'Your positioning measured against mapped professional paths, not against a generic rubric.' },
  { id: 'B-02', title: 'Technical interview preparation', body: 'Valuation, LBO modelling and deal mechanics, sequenced against your current readiness.' },
  { id: 'B-03', title: 'Networking strategy', body: 'Who to approach, in what order, and what a conversation should actually be for.' },
  { id: 'B-04', title: 'Recruiting timeline management', body: 'Australian windows mapped to your year of study so nothing opens without warning.' },
  { id: 'B-05', title: 'Application tracking', body: 'Firms, rounds and outcomes in one register, so the pipeline stays legible under pressure.' },
  { id: 'B-06', title: 'Commercial and deal awareness', body: 'The market context you are expected to hold an opinion on, kept current.' },
  { id: 'B-07', title: 'Prioritised weekly actions', body: 'A short, ranked list. The constraint is the point — everything cannot be first.' },
  { id: 'B-08', title: 'Educational resources', body: 'Reference material attached to the gap it closes, rather than a course library to browse.' },
] as const;

/**
 * Section 6 — evidence. A constructed example, labelled as such.
 * These figures describe no real person and are not outcome claims.
 */
export const sampleProfile = {
  label: 'Illustrative sample profile',
  disclaimer:
    'Constructed example. Figures illustrate the shape of a Career Compass output and do not describe a real student or predict an outcome.',
  ref: 'SAMPLE-01',
  student: 'Y2 · Commerce · Australian university',
  stage: { value: 'S1', label: 'Building' },
  metrics: [
    { label: 'Profile Strength', value: 62 },
    { label: 'Interview Readiness', value: 48 },
    { label: 'Network Coverage', value: 35 },
    { label: 'Application Pipeline', value: 20 },
  ],
  actions: [
    { rank: 1, action: 'Complete a financial modelling course', impact: 'High', window: 'Open now' },
    { rank: 2, action: 'Take an executive role in a finance society', impact: 'High', window: 'Feb intake' },
    { rank: 3, action: 'Apply to spring insight programs', impact: 'Medium', window: 'Mar' },
    { rank: 4, action: 'Hold four substantive conversations with analysts', impact: 'Medium', window: 'Rolling' },
    { rank: 5, action: 'Build a defensible view on two live deals', impact: 'Medium', window: 'Weekly' },
  ],
  nextWindow: { label: 'Penultimate summer applications', when: 'Opens July' },
} as const;

/** Section 7 — the close. */
export const close = {
  heading: 'The next move should never be unclear.',
  body: 'Build your career map, see where you stand today, and get the ranked sequence that follows from it.',
} as const;

/** Hero image metadata per direction — alt text is written per concept, not shared. */
export interface HeroAsset {
  slug: string;
  alt: string;
}
