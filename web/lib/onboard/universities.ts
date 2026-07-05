// Australian university list with tier classification.
// Mirrors the UniversityTier enum in lib/scoring/types.ts.

export type UniversityTier =
  | 'go8_top' | 'go8_other' | 'atn' | 'other_au'
  | 'top_global' | 'international_top' | 'other_global';

interface University {
  name: string;
  tier: UniversityTier;
  aliases?: string[];
}

export const UNIVERSITIES: University[] = [
  // Go8 Top (most relevant for Sydney IB recruiting)
  { name: 'UNSW Sydney', tier: 'go8_top', aliases: ['UNSW', 'University of New South Wales'] },
  { name: 'University of Sydney', tier: 'go8_top', aliases: ['USYD', 'Sydney Uni'] },
  { name: 'University of Melbourne', tier: 'go8_top', aliases: ['Melbourne Uni', 'UniMelb'] },
  { name: 'Australian National University', tier: 'go8_top', aliases: ['ANU'] },

  // Go8 Other
  { name: 'University of Queensland', tier: 'go8_other', aliases: ['UQ'] },
  { name: 'Monash University', tier: 'go8_other' },
  { name: 'University of Western Australia', tier: 'go8_other', aliases: ['UWA'] },
  { name: 'University of Adelaide', tier: 'go8_other', aliases: ['Adelaide Uni'] },

  // ATN
  { name: 'University of Technology Sydney', tier: 'atn', aliases: ['UTS'] },
  { name: 'RMIT University', tier: 'atn', aliases: ['RMIT'] },
  { name: 'Curtin University', tier: 'atn' },
  { name: 'Queensland University of Technology', tier: 'atn', aliases: ['QUT'] },
  { name: 'University of South Australia', tier: 'atn', aliases: ['UniSA'] },

  // Other AU
  { name: 'Macquarie University', tier: 'other_au' },
  { name: 'University of Newcastle', tier: 'other_au' },
  { name: 'University of Wollongong', tier: 'other_au' },
  { name: 'Deakin University', tier: 'other_au' },
  { name: 'La Trobe University', tier: 'other_au' },
  { name: 'Griffith University', tier: 'other_au' },
  { name: 'Bond University', tier: 'other_au' },
  { name: 'Australian Catholic University', tier: 'other_au', aliases: ['ACU'] },
  { name: 'University of Canberra', tier: 'other_au' },
  { name: 'Swinburne University', tier: 'other_au' },
  { name: 'Western Sydney University', tier: 'other_au' },
  { name: 'Murdoch University', tier: 'other_au' },
  { name: 'Edith Cowan University', tier: 'other_au', aliases: ['ECU'] },
  { name: 'Flinders University', tier: 'other_au' },
  { name: 'Other Australian University', tier: 'other_au' },
];

// Case/whitespace/punctuation-insensitive key for matching user-typed input
// against the list above. Deliberately not fuzzy/typo-tolerant — an
// unrecognised name just falls through to the 'other_au' tier as free text.
function normalize(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ');
}

function findUniversity(universityName: string): University | undefined {
  const norm = normalize(universityName);
  if (!norm) return undefined;
  return UNIVERSITIES.find(
    (u) =>
      normalize(u.name) === norm ||
      u.aliases?.some((a) => normalize(a) === norm),
  );
}

export function getTier(universityName: string): UniversityTier {
  return findUniversity(universityName)?.tier ?? 'other_au';
}

// Snaps a recognised (but differently-cased/worded) university name to its
// canonical spelling, so two students who type variants of the same
// institution end up with an identical stored value. Unrecognised input is
// returned trimmed, unchanged, so free-typed universities still work.
export function canonicalizeUniversityName(universityName: string): string {
  const trimmed = universityName.trim();
  return findUniversity(trimmed)?.name ?? trimmed;
}
