/**
 * Hero variants for the selected direction, Dithered Intelligence.
 *
 * The direction is settled — /v1–/v5 now all render the SAME page
 * (components/lab/dithered/DitheredHome.tsx) and differ only in the hero plate,
 * so the remaining decision is purely which image to ship. /design-lab compares
 * them; ConceptSwitcher moves between them.
 *
 * Earlier this registry held five different design directions; those pages are
 * recoverable from commit a2b02c7 if a direction ever needs revisiting.
 */

export interface Concept {
  /** Route slug — the URL is `/${id}`. */
  id: string;
  /** Short name for the switcher. */
  name: string;
  /** Base slug for the hero asset in /public/hero. */
  slug: string;
  /** What the plate depicts, and why it might be the right one. */
  premise: string;
  /** Alt text — describes the image, not the brand. */
  alt: string;
  /** Marginalia caption rendered over the plate. */
  caption: string;
  /** object-position for the desktop crop. */
  position: string;
  /** The argument for shipping this one. */
  strength: string;
  /** The honest risk. */
  risk: string;
}

export const concepts: Concept[] = [
  {
    id: 'v1',
    name: 'Window',
    slug: 'h1-window',
    premise:
      'A figure at a window above a dense city grid at night. The vantage point is the idea — you cannot plan a route through a system you cannot see from above.',
    alt: 'One-bit dithered plate: a lone figure seen from behind at a tall window, looking out over a dense grid of city blocks far below at night.',
    caption: 'PLATE 01 · 1-BIT · OBSERVED',
    position: '72% 40%',
    strength: 'The most immediately legible of the five, and the only one that reads as aspiration without tipping into corporate cliché.',
    risk: 'Figure-at-window is a familiar composition; it works hard but does not surprise.',
  },
  {
    id: 'v2',
    name: 'Desk',
    slug: 'h2-desk',
    premise:
      'Overhead: hands among printed charts and annotated pages. The closest of the five to what the product actually is — analysis on paper, mid-thought.',
    alt: 'One-bit dithered plate: an overhead view of hands resting among printed charts, plotted graphs and annotated sheets on a plain desk.',
    caption: 'PLATE 02 · 1-BIT · OVERHEAD',
    position: '60% 55%',
    strength: 'Most honest to the product. No aspirational staging — just the work, which suits the direction’s refusal to flatter.',
    risk: 'Quietest of the five; carries less weight as a monumental anchor at large sizes.',
  },
  {
    id: 'v3',
    name: 'Atrium',
    slug: 'h3-atrium',
    premise:
      'A small figure crossing an enormous brutalist atrium. Scale as the argument: the institution is vast, structured, and navigable if you can read it.',
    alt: 'One-bit dithered plate: a single small figure walking through an enormous empty brutalist concrete atrium with a cantilevered staircase receding into darkness.',
    caption: 'PLATE 03 · 1-BIT · STRUCTURE',
    position: '64% 62%',
    strength: 'The strongest architectural presence, and the best match for the direction’s hard geometry and heavy rules.',
    risk: 'Can read as intimidating or alienating to the exact student the product is meant to help.',
  },
  {
    id: 'v4',
    name: 'Network',
    slug: 'h4-network',
    premise:
      'No figure at all — a dense field of branching route lines and junction nodes. The map itself, rendered as terrain rather than illustrated.',
    alt: 'One-bit dithered plate: a dense field of branching plotted route lines and junction nodes receding into depth, like a vast wall schematic.',
    caption: 'PLATE 04 · 1-BIT · TRACE',
    position: '62% 50%',
    strength: 'Ties directly to the brand mark and the word "mapped". Ages best and never dates through clothing or setting.',
    risk: 'Abstraction with no human presence can read as cold — the one thing the direction can least afford.',
  },
  {
    id: 'v5',
    name: 'Theatre',
    slug: 'h5-theatre',
    premise:
      'A figure alone in the back row of an empty lecture theatre. The student’s actual world, seen at a moment of solitude rather than achievement.',
    alt: 'One-bit dithered plate: a single figure seated alone in the back row of a vast empty tiered lecture theatre, rows receding toward a distant lit board.',
    caption: 'PLATE 05 · 1-BIT · OBSERVED',
    position: '62% 68%',
    strength: 'The most specific to the audience. A student recognises this room instantly, which buys trust the others have to earn.',
    risk: 'Empty-lecture-theatre can read as isolation or as being behind, rather than as focus.',
  },
];

export const conceptIds = concepts.map((c) => c.id);

export function getConcept(id: string): Concept | undefined {
  return concepts.find((c) => c.id === id);
}
