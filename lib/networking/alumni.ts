// ============================================================
// Aggregate alumni intelligence from the professionals database.
//
// PRIVACY CONTRACT: this module receives professional rows via the
// service role but returns ONLY aggregates — counts, firm names and
// mixes. Individual professionals (names, LinkedIn URLs) must never
// leave the server; the dataset is real people (see migration 0005).
// A firm must have MIN_FIRM_TOTAL professionals before it appears at
// all, so a count of one cannot identify a person. Pure module.
// ============================================================

/** Minimum professionals at a firm before it appears in aggregates. */
export const MIN_FIRM_TOTAL = 2;

export interface AlumniProfessionalRow {
  current_firm: string;
  current_firm_tier: string;
  current_role: string;
  current_geography: string;
  university: string;
}

export interface FirmAlumniAggregate {
  firm: string;
  tier: string;
  total: number;
  alumniCount: number;
  roleMix: { analyst: number; associate: number; vp: number };
  topGeographies: string[];
}

export interface AlumniIntel {
  studentUniversity: string;
  universityMatchCount: number;
  totalProfessionals: number;
  firms: FirmAlumniAggregate[];
  /** Firms ranked by alumni density for the student's university. */
  topAlumniFirms: string[];
}

function normalizeUniversity(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/\s+/g, ' ');
}

/**
 * Aggregates the professionals dataset around the student's university.
 *
 * @param rows - Professional rows (service-role query, minimal columns)
 * @param studentUniversity - The student's university as they entered it
 * @returns Firm-level aggregates sorted by alumni count, then total size
 */
export function computeAlumniIntel(
  rows: AlumniProfessionalRow[],
  studentUniversity: string,
): AlumniIntel {
  const target = normalizeUniversity(studentUniversity);
  const byFirm = new Map<string, FirmAlumniAggregate & { geographies: Map<string, number> }>();
  let universityMatchCount = 0;

  for (const row of rows) {
    const firm = row.current_firm.trim();
    if (!firm) continue;
    const isAlum = target !== '' && normalizeUniversity(row.university) === target;
    if (isAlum) universityMatchCount += 1;

    let entry = byFirm.get(firm.toLowerCase());
    if (!entry) {
      entry = {
        firm,
        tier: row.current_firm_tier,
        total: 0,
        alumniCount: 0,
        roleMix: { analyst: 0, associate: 0, vp: 0 },
        topGeographies: [],
        geographies: new Map(),
      };
      byFirm.set(firm.toLowerCase(), entry);
    }
    entry.total += 1;
    if (isAlum) entry.alumniCount += 1;
    if (row.current_role === 'ib_analyst') entry.roleMix.analyst += 1;
    else if (row.current_role === 'ib_associate') entry.roleMix.associate += 1;
    else if (row.current_role === 'ib_vp') entry.roleMix.vp += 1;
    entry.geographies.set(row.current_geography, (entry.geographies.get(row.current_geography) ?? 0) + 1);
  }

  const firms = [...byFirm.values()]
    .filter((entry) => entry.total >= MIN_FIRM_TOTAL)
    .map(({ geographies, ...aggregate }) => ({
      ...aggregate,
      topGeographies: [...geographies.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([geo]) => geo),
    }))
    .sort((a, b) => b.alumniCount - a.alumniCount || b.total - a.total || a.firm.localeCompare(b.firm));

  return {
    studentUniversity,
    universityMatchCount,
    totalProfessionals: rows.length,
    firms,
    topAlumniFirms: firms.filter((f) => f.alumniCount > 0).slice(0, 5).map((f) => f.firm),
  };
}
