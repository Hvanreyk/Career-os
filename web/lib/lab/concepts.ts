/**
 * Registry of the MappedLabs landing-page concepts served at /v1–/v5.
 *
 * /design-lab builds its comparison from this, and ConceptSwitcher uses it to
 * move between concepts. Adding a concept means adding a route plus an entry.
 */

export interface Concept {
  /** Route slug — the URL is `/${id}`. */
  id: string;
  /** Direction name, as briefed. */
  name: string;
  /** The aesthetic in one line. */
  aesthetic: string;
  /** The visual premise — what this direction argues the page should be. */
  premise: string;
  /** Typefaces committed to. */
  type: string;
  /** Palette chips, ground first. */
  swatches: string[];
  ground: string;
  ink: string;
  accent: string;
  /** Where the direction is strongest. */
  strength: string;
  /** The honest risk of shipping it. */
  risk: string;
}

export const concepts: Concept[] = [
  {
    id: 'v1',
    name: 'Mapped Paper',
    aesthetic: 'Print-tech cartography × analytical publication',
    premise:
      'The page is a survey document about one student. Contour terrain, route notation and field annotations carry the argument that a career can be plotted and measured.',
    type: 'Archivo · Newsreader · JetBrains Mono',
    swatches: ['#DDE2D5', '#16241C', '#C8452A', '#8B9384'],
    ground: '#DDE2D5',
    ink: '#16241C',
    accent: '#C8452A',
    strength:
      'The only direction where the brand name, the product metaphor and the visual system are the same idea. Warmest and most ownable.',
    risk: 'Paper and contour texture can read as craft rather than rigour if the data is not specific.',
  },
  {
    id: 'v2',
    name: 'Signal Landscape',
    aesthetic: 'Cinematic data texture × institutional intelligence',
    premise:
      'Entering the page should feel like entering an intelligence system. Data becomes terrain; narrow columns and precise readouts replace card grids entirely.',
    type: 'Archivo · JetBrains Mono',
    swatches: ['#0A1416', '#E8E4DC', '#E0A040', '#1D3238'],
    ground: '#0A1416',
    ink: '#E8E4DC',
    accent: '#E0A040',
    strength:
      'Highest perceived seriousness and scale. The atmospheric transitions give the page real pacing.',
    risk: 'Dark institutional surfaces are the most crowded look in fintech; it must earn the darkness.',
  },
  {
    id: 'v3',
    name: 'Quiet Institution',
    aesthetic: 'Editorial minimalism × architectural confidence',
    premise:
      'Authority through restraint. Enormous whitespace, one monumental monochrome image, almost no borders or chrome, and typography doing all the work.',
    type: 'Newsreader · Archivo',
    swatches: ['#F2F1EE', '#16181A', '#1F4B99', '#8A8D91'],
    ground: '#F2F1EE',
    ink: '#16181A',
    accent: '#1F4B99',
    strength:
      'Reads as the most credible to a sceptical parent. Ages the best and is the cheapest to maintain.',
    risk: 'Restraint can tip into blandness; without a strong image it has nothing to hold onto.',
  },
  {
    id: 'v4',
    name: 'Dithered Intelligence',
    aesthetic: 'Brutalist editorial × bitmap research terminal',
    premise:
      'Deliberate visual tension. Hard dividers, cropped type, 1-bit imagery and compressed information bands — a research instrument that refuses to be friendly.',
    type: 'Archivo · JetBrains Mono',
    swatches: ['#0B0B0C', '#EDEAE3', '#E5482B', '#3A3A3D'],
    ground: '#0B0B0C',
    ink: '#EDEAE3',
    accent: '#E5482B',
    strength:
      'By far the most distinctive and the most memorable. Signals that this was made by people with a point of view.',
    risk: 'The rawness that appeals to the student may read as unserious to the parent paying for it.',
  },
  {
    id: 'v5',
    name: 'The Career Atlas',
    aesthetic: 'Classical knowledge × contemporary analytical editorial',
    premise:
      'Career Compass as a modern field guide. Chapters, marginalia and engraved diagrams frame recruiting as a discipline to be studied rather than a game to be hacked.',
    type: 'Newsreader · Archivo · JetBrains Mono',
    swatches: ['#F6F2EA', '#1B2B4B', '#8C2F2F', '#3C4757'],
    ground: '#F6F2EA',
    ink: '#1B2B4B',
    accent: '#8C2F2F',
    strength:
      'Best balance of warmth and rigour. The chapter structure handles long explanatory copy better than any other direction.',
    risk: 'Classical references can drift toward pastiche if the interaction patterns are not kept modern.',
  },
];

export const conceptIds = concepts.map((c) => c.id);
