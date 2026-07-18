import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { Professional } from '../../lib/scoring/types';
import { loadPros } from '../scoring/fixtures';

vi.mock('server-only', () => ({}));

type QueryResult = {
  data: unknown[] | null;
  error: { message: string } | null;
  count?: number | null;
};

interface MockClientOptions {
  expectedCount?: number;
  pages?: unknown[][];
  failTable?: string;
}

function normalizedRow(professional: Professional, id: string): Record<string, unknown> {
  const canonical = structuredClone(professional);
  if (canonical.current_firm_tier === 'elite_boutique_and_mm') {
    canonical.current_firm_tier = 'mid_market';
  }
  canonical.experiences = canonical.experiences.map((experience) => ({
    ...experience,
    type: experience.type === 'internship'
      ? 'summer_internship'
      : experience.type === 'casual' ? 'part_time' : experience.type,
    firm_tier: experience.firm_tier === 'elite_boutique_and_mm'
      ? 'mid_market'
      : experience.firm_tier,
    industry: experience.industry === 'capital_markets'
      ? 'global_markets'
      : experience.industry,
  }));
  return {
    ...canonical,
    id,
    taxonomy_version: '2026-07-15.1',
    derivation_version: '2026-07-15.1',
    feature_version: 'professional-v2',
  };
}

function mockClient(
  rows: readonly Record<string, unknown>[],
  options: MockClientOptions = {},
): SupabaseClient {
  let pageIndex = 0;

  return {
    from(table: string) {
      let limit = 1_000;
      let afterId: string | undefined;
      let geographies: readonly string[] | undefined;

      const evaluate = (): QueryResult => {
        if (options.failTable === table) {
          return { data: null, error: { message: 'query failed' }, count: null };
        }
        const geographicallyFiltered = geographies?.length
          ? rows.filter((row) => geographies!.includes(String(row.current_geography)))
          : [...rows];
        if (table === 'professional_scoring_readiness') {
          return {
            data: null,
            error: null,
            count: options.expectedCount ?? geographicallyFiltered.length,
          };
        }
        if (table !== 'professional_scoring_input') {
          return { data: null, error: { message: 'unexpected table' } };
        }
        if (options.pages) {
          return { data: options.pages[pageIndex++] ?? [], error: null };
        }
        const page = geographicallyFiltered
          .filter((row) => !afterId || String(row.id) > afterId)
          .sort((left, right) => String(left.id).localeCompare(String(right.id)))
          .slice(0, limit);
        return { data: page, error: null };
      };

      const builder = {
        select() {
          return builder;
        },
        eq() {
          return builder;
        },
        in(_column: string, values: readonly string[]) {
          geographies = values;
          return builder;
        },
        order() {
          return builder;
        },
        limit(value: number) {
          limit = value;
          return builder;
        },
        gt(_column: string, value: string) {
          afterId = value;
          return builder;
        },
        then<TResult1 = QueryResult, TResult2 = never>(
          onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) {
          return Promise.resolve(evaluate()).then(onfulfilled, onrejected);
        },
      };
      return builder;
    },
  } as unknown as SupabaseClient;
}

let loadProfessionals: typeof import('../../web/lib/professionals/source')['loadProfessionals'];
let ProfessionalSourceError:
  typeof import('../../web/lib/professionals/source')['ProfessionalSourceError'];

beforeAll(async () => {
  ({ loadProfessionals, ProfessionalSourceError } = await import(
    '../../web/lib/professionals/source'
  ));
});

describe('normalized professional source loader', () => {
  it('loads more than 1,000 rows with ordered keyset pages', async () => {
    const base = loadPros()[0]!;
    const rows = Array.from({ length: 1_001 }, (_, index) =>
      normalizedRow(base, `P${String(index + 1).padStart(5, '0')}`));

    const professionals = await loadProfessionals(mockClient(rows));

    expect(professionals).toHaveLength(1_001);
    expect(professionals[0]!.id).toBe('P00001');
    expect(professionals.at(-1)!.id).toBe('P01001');
  });

  it('applies the same explicit geography filter to readiness and data', async () => {
    const base = loadPros()[0]!;
    const rows = [
      normalizedRow({ ...base, current_geography: 'sydney' }, 'P01001'),
      normalizedRow({ ...base, current_geography: 'melbourne' }, 'P01002'),
    ];

    const professionals = await loadProfessionals(mockClient(rows), {
      geographies: ['melbourne'],
    });

    expect(professionals.map((professional) => professional.id)).toEqual(['P01002']);
  });

  it('fails closed on malformed rows', async () => {
    const row = normalizedRow(loadPros()[0]!, 'P01001');
    row.current_role = 'not_a_role';

    await expect(loadProfessionals(mockClient([row])))
      .rejects.toMatchObject({ reason: 'validation_failed' });
  });

  it('rejects compatibility-only values from the canonical scoring view', async () => {
    const base = loadPros()[0]!;
    const row = normalizedRow(base, 'P01001');
    row.current_firm_tier = 'elite_boutique_and_mm';

    await expect(loadProfessionals(mockClient([row])))
      .rejects.toMatchObject({ reason: 'validation_failed' });
  });

  it('fails closed when pagination ends before the readiness count', async () => {
    const row = normalizedRow(loadPros()[0]!, 'P01001');

    await expect(loadProfessionals(mockClient([row], { expectedCount: 2 })))
      .rejects.toMatchObject({ reason: 'count_mismatch' });
  });

  it('fails closed on duplicate or out-of-order page identifiers', async () => {
    const row = normalizedRow(loadPros()[0]!, 'P01001');

    await expect(loadProfessionals(mockClient([row], {
      expectedCount: 2,
      pages: [[row, row]],
    }))).rejects.toMatchObject({ reason: 'duplicate_id' });
  });

  it('distinguishes query failure and an empty scoring cohort', async () => {
    await expect(loadProfessionals(mockClient([], {
      failTable: 'professional_scoring_readiness',
    }))).rejects.toBeInstanceOf(ProfessionalSourceError);
    await expect(loadProfessionals(mockClient([])))
      .rejects.toMatchObject({ reason: 'empty_source' });
  });
});
