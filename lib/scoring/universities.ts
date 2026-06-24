/**
 * Per-university society / investment fund recommendations.
 * Used by S0/S1 action generators to render specific names instead
 * of generic "join a finance society" advice. Names sourced from
 * student-org rosters; expand as data improves.
 */

export interface UniversityOrgs {
  finance_societies: string[];
  investment_funds: string[];
}

const FALLBACK: UniversityOrgs = {
  finance_societies: ['your campus finance society'],
  investment_funds: ['your campus student investment fund'],
};

const TABLE: Record<string, UniversityOrgs> = {
  // UNSW
  'UNSW': {
    finance_societies: ['FMAA UNSW', 'UNSW Finance Society'],
    investment_funds: ['ASAM (Australian Students Asset Management)'],
  },
  'University of New South Wales': {
    finance_societies: ['FMAA UNSW', 'UNSW Finance Society'],
    investment_funds: ['ASAM (Australian Students Asset Management)'],
  },

  // USYD
  'USYD': {
    finance_societies: ['Sydney University Finance Society (SUFS)', 'FMAA USYD'],
    investment_funds: ['SUITS (Sydney Uni Investment Trading Society)', 'ASAM'],
  },
  'University of Sydney': {
    finance_societies: ['Sydney University Finance Society (SUFS)', 'FMAA USYD'],
    investment_funds: ['SUITS (Sydney Uni Investment Trading Society)', 'ASAM'],
  },

  // UMelb
  'UMelb': {
    finance_societies: ['Melbourne University Finance Students Association (MUFSA)'],
    investment_funds: ['MUTIS (Melbourne University Trading and Investment Society)'],
  },
  'University of Melbourne': {
    finance_societies: ['Melbourne University Finance Students Association (MUFSA)'],
    investment_funds: ['MUTIS (Melbourne University Trading and Investment Society)'],
  },

  // Monash
  'Monash': {
    finance_societies: ['Monash University Finance Society (MUFS)'],
    investment_funds: ['MIFA (Monash Investment Fund Association)'],
  },
  'Monash University': {
    finance_societies: ['Monash University Finance Society (MUFS)'],
    investment_funds: ['MIFA (Monash Investment Fund Association)'],
  },

  // UQ
  'UQ': {
    finance_societies: ['UQ Finance & Economics Society (UQFES)'],
    investment_funds: ['UQ Investment Society'],
  },
  'University of Queensland': {
    finance_societies: ['UQ Finance & Economics Society (UQFES)'],
    investment_funds: ['UQ Investment Society'],
  },
  'The University of Queensland': {
    finance_societies: ['UQ Finance & Economics Society (UQFES)'],
    investment_funds: ['UQ Investment Society'],
  },

  // ANU
  'ANU': {
    finance_societies: ['ANU Finance Society'],
    investment_funds: ['ANU Investment Club'],
  },
  'Australian National University': {
    finance_societies: ['ANU Finance Society'],
    investment_funds: ['ANU Investment Club'],
  },

  // UWA
  'UWA': {
    finance_societies: ['UWA Finance Club', 'BCom Society UWA'],
    investment_funds: ['UWA Investment Club'],
  },
  'University of Western Australia': {
    finance_societies: ['UWA Finance Club', 'BCom Society UWA'],
    investment_funds: ['UWA Investment Club'],
  },
  'The University of Western Australia': {
    finance_societies: ['UWA Finance Club', 'BCom Society UWA'],
    investment_funds: ['UWA Investment Club'],
  },

  // UTS
  'UTS': {
    finance_societies: ['UTS Finance Society'],
    investment_funds: ['UTS Bull & Bear (Investment Society)'],
  },
  'University of Technology Sydney': {
    finance_societies: ['UTS Finance Society'],
    investment_funds: ['UTS Bull & Bear (Investment Society)'],
  },
};

export function orgsFor(university: string): UniversityOrgs {
  return TABLE[university] ?? FALLBACK;
}

export function societyRecommendationText(university: string): string {
  const o = orgsFor(university);
  return (
    `Join ${o.finance_societies.join(' or ')} (committee role if you can) ` +
    `and apply to ${o.investment_funds[0] ?? 'your campus investment fund'}. ` +
    `Both feature prominently in matched career paths.`
  );
}
