/**
 * Shared product truth for the MappedLabs landing-page concepts at /v1–/v5.
 *
 * This mirrors what Career Compass ACTUALLY outputs today — a per-tier index
 * (0–100) with a band, a probability estimate, a signed list of score drivers,
 * and ranked moves. There is deliberately no "stage" model here: that concept
 * was abandoned, and the landing page must not advertise output the product
 * does not produce.
 *
 * Nothing here claims usage figures, success rates, partnerships, customer
 * counts, or endorsements. The one profile readout is a constructed example
 * and is labelled as such wherever it appears.
 */

export const brand = {
  name: 'MappedLabs',
  eyebrow: 'Career intelligence for high finance',
  headline: 'Map your route into investment banking.',
  support:
    'MappedLabs benchmarks your profile against real professional paths, scores you by firm tier, and turns the gaps into a ranked plan of what to do next.',
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
 * Section 2 — the problem. Six items, not three: the uncertainty is broad and
 * compounding, which three icon cards would flatten.
 */
export const problem = {
  heading: 'Technical knowledge is not the hard part.',
  body: 'Most students who miss out on high finance are not short on effort. They are working without a reference point — unable to see how they compare, which tier they are actually competitive for, or which of the twenty things on their list moves the outcome.',
  unknowns: [
    { q: 'How do I compare?', a: 'No visibility into the standard candidates are actually held to.' },
    { q: 'Which tier am I competitive for?', a: 'Bulge bracket, elite boutique and mid-market expect different evidence.' },
    { q: 'Which gaps matter?', a: 'A missing modelling course and a missing society role are not equivalent.' },
    { q: 'When do I apply?', a: 'Australian penultimate windows open earlier than most students expect.' },
    { q: 'What is high impact?', a: 'Effort spread evenly across everything is effort spent on the wrong things.' },
    { q: 'Am I moving fast enough?', a: 'Progress is invisible without something to measure it against.' },
  ],
} as const;

/** Section 3 — the eight readouts Career Compass produces. */
export const compassReadouts = [
  { key: 'index', label: 'Tier Index', note: 'A 0–100 score for each firm tier, with a competitiveness band' },
  { key: 'probability', label: 'Outcome Probability', note: 'Your modelled shot this cycle, against the typical serious candidate' },
  { key: 'drivers', label: 'Score Drivers', note: 'The signed factors moving your score, each traceable to something real' },
  { key: 'interview', label: 'Interview Readiness', note: 'Valuation, LBO and deal mechanics fluency' },
  { key: 'network', label: 'Network Coverage', note: 'Breadth and depth of relevant professional contact' },
  { key: 'pipeline', label: 'Application Pipeline', note: 'Firms, rounds and status in one register' },
  { key: 'actions', label: 'Priority Actions', note: 'Ranked by modelled point-impact, with an effort cost and a deadline' },
  { key: 'deadlines', label: 'Recruiting Windows', note: 'The dates that constrain the order you do things in' },
] as const;

export const compass = {
  name: 'Career Compass',
  href: '/tools/career-compass',
  heading: 'A decision system, not a questionnaire.',
  body: 'Career Compass scores your profile against a database of real professional paths and returns a per-tier index, the factors driving it, and the moves ranked by what they are actually worth. The same inputs return the same read, every time.',
} as const;

/** Section 4 — how the system thinks. An analytical method, not an onboarding strip. */
export const method = {
  heading: 'How the system thinks',
  body: 'Five steps, run in order. Each one narrows what the next has to consider.',
  steps: [
    {
      n: '01',
      title: 'Intake',
      body: 'You supply your degree, year, results, experience and the signals you have accumulated so far.',
    },
    {
      n: '02',
      title: 'Benchmarking',
      body: 'Your profile is scored against real professional paths to establish where you sit rather than where you feel you sit.',
    },
    {
      n: '03',
      title: 'Tier separation',
      body: 'You are scored separately for each firm tier, because a profile can be developing for bulge bracket and competitive for boutique at the same time.',
    },
    {
      n: '04',
      title: 'Attribution',
      body: 'The score is decomposed into signed drivers, so every point traces to something specific you did or have not done yet.',
    },
    {
      n: '05',
      title: 'Ranking',
      body: 'Gaps are ordered by modelled point-impact and by how soon the relevant window closes, then recomputed as you close them.',
    },
  ],
} as const;

/** Section 5 — core capabilities, presented as an index rather than a card grid. */
export const capabilities = [
  { id: 'B-01', title: 'Profile benchmarking', body: 'Your positioning measured against real professional paths, not a generic rubric.' },
  { id: 'B-02', title: 'Tier-by-tier scoring', body: 'Separate indices for bulge bracket, elite boutique, mid-market and boutique.' },
  { id: 'B-03', title: 'Technical interview preparation', body: 'Valuation, LBO modelling and deal mechanics, sequenced against your readiness.' },
  { id: 'B-04', title: 'Networking strategy', body: 'Who to approach, in what order, and what a conversation should actually be for.' },
  { id: 'B-05', title: 'Recruiting timeline management', body: 'Australian windows mapped to your year of study so nothing opens without warning.' },
  { id: 'B-06', title: 'Application tracking', body: 'Firms, rounds and outcomes in one register, so the pipeline stays legible.' },
  { id: 'B-07', title: 'Commercial and deal awareness', body: 'The market context you are expected to hold an opinion on, kept current.' },
  { id: 'B-08', title: 'Prioritised actions', body: 'A short, ranked list. The constraint is the point — everything cannot be first.' },
] as const;

/**
 * Section 6 — evidence. A constructed example matching the real report's shape.
 * These figures describe no real person and are not outcome claims.
 */
export const sampleProfile = {
  label: 'Illustrative sample profile',
  disclaimer:
    'Constructed example. Figures illustrate the shape of a Career Compass output and do not describe a real student or predict an outcome.',
  ref: 'SAMPLE-01',
  student: 'Y2 · Commerce · Australian university',

  /** Headline verdict, as the report phrases it. */
  verdict: "You're developing for Bulge Bracket — and closer than most.",
  headlineTier: 'Bulge Bracket',
  headlineIndex: 52,
  headlineBand: 'Developing',
  probability: {
    value: '~2.2%',
    multiple: '1.1×',
    note: 'shot at a front-office IB outcome this cycle, roughly 1.1× the typical serious candidate. Across the broader ladder, front-office probability is ~7.4%.',
  },

  /** Per-tier indices — one score is never the whole story. */
  tiers: [
    { tier: 'Bulge Bracket', index: 52, band: 'Developing', shot: '2.2%' },
    { tier: 'Elite Boutique', index: 58, band: 'Developing', shot: '2.6%' },
    { tier: 'Mid-Market', index: 64, band: 'Developing', shot: '3.3%' },
    { tier: 'Boutique', index: 72, band: 'Competitive', shot: '2.8%' },
  ],
  recommendedAim: {
    anchor: 'Boutique',
    stretch: 'Mid-Market',
  },

  /** Signed score drivers — every point traces to something real. */
  drivers: [
    { factor: 'No IB internship yet', points: -15 },
    { factor: 'Go8 target university', points: 8 },
    { factor: 'Distinction WAM', points: 5 },
    { factor: 'Student investment fund', points: 5 },
    { factor: 'Reached a Big 4 / boutique internship', points: 4 },
    { factor: "Dean's List", points: 3 },
  ],

  /** Ranked moves, by actual point-impact. */
  actions: [
    {
      rank: 1,
      action: 'Land your first relevant experience this cycle',
      detail:
        'Cold-email the most common starting points in your matched paths. Your first experience does not need prestige — it needs relevance.',
      effort: 'Medium',
      by: 'Oct 2026',
    },
    {
      rank: 2,
      action: 'Close a common gap: WAM below median for target',
      detail:
        'Every one of your matched boutique-reaching paths cleared the median WAM for their target, and you have not yet.',
      effort: 'Medium',
      by: 'Aug 2027',
    },
    {
      rank: 3,
      action: 'Network into Boutique coverage groups',
      detail:
        'Map and coffee-chat analysts at the firms your matched paths most often work at. Referrals move the needle more than any cold application.',
      effort: 'Medium',
      by: 'Aug 2027',
    },
  ],
} as const;

/** Section 7 — the close. */
export const close = {
  heading: 'The next move should never be unclear.',
  body: 'Build your career map, see where you stand across every tier today, and get the ranked sequence that follows from it.',
} as const;
