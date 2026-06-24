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
  { name: 'Other Australian University', tier: 'other_au' },
];

export function getTier(universityName: string): UniversityTier {
  const lower = universityName.toLowerCase();
  const match = UNIVERSITIES.find(
    (u) =>
      u.name.toLowerCase() === lower ||
      u.aliases?.some((a) => a.toLowerCase() === lower),
  );
  return match?.tier ?? 'other_au';
}

export function searchUniversities(query: string): University[] {
  if (!query.trim()) return UNIVERSITIES;
  const lower = query.toLowerCase();
  return UNIVERSITIES.filter(
    (u) =>
      u.name.toLowerCase().includes(lower) ||
      u.aliases?.some((a) => a.toLowerCase().includes(lower)),
  );
}
