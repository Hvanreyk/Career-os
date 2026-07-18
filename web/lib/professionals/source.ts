import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ProfessionalDataError,
  parseProfessionalRowsOrThrow,
} from '@trajectoryos/core/scoring/professional-adapter';
import type {
  Geography,
  Professional,
} from '@trajectoryos/core/scoring/types';

export class ProfessionalSourceError extends Error {
  constructor(
    public readonly reason:
      | 'query_failed'
      | 'validation_failed'
      | 'empty_source'
      | 'duplicate_id'
      | 'count_mismatch',
  ) {
    super(`Unable to load normalized professional source (${reason})`);
    this.name = 'ProfessionalSourceError';
  }
}

export interface LoadProfessionalsOptions {
  /**
   * Explicit database prefilter. Callers remain responsible for supplying all
   * geographies that the pure TypeScript pool considers comparable.
   */
  geographies?: readonly Geography[];
  /** Test/diagnostic override. Production pages are capped at 1,000 rows. */
  pageSize?: number;
}

const MAX_PAGE_SIZE = 1_000;

async function fetchExpectedCount(
  serviceClient: SupabaseClient,
  geographies: readonly Geography[] | undefined,
): Promise<number> {
  let query = serviceClient
    .from('professional_scoring_readiness')
    .select('professional_id', { count: 'exact', head: true })
    .eq('is_ready', true);
  if (geographies?.length) {
    query = query.in('current_geography', geographies);
  }

  const { count, error } = await query;
  if (error || count === null) {
    throw new ProfessionalSourceError('query_failed');
  }
  return count;
}

function parsePageOrThrow(rows: readonly unknown[]): Professional[] {
  try {
    const professionals = parseProfessionalRowsOrThrow(rows, 'normalized');
    const containsCompatibilityOnlyValue = professionals.some((professional) =>
      professional.current_firm_tier === 'elite_boutique_and_mm'
      || professional.experiences.some((experience) =>
        experience.firm_tier === 'elite_boutique_and_mm'
        || experience.type === 'internship'
        || experience.type === 'casual'
        || experience.industry === 'capital_markets'));
    if (containsCompatibilityOnlyValue) {
      throw new ProfessionalSourceError('validation_failed');
    }
    return professionals;
  } catch (error) {
    if (error instanceof ProfessionalSourceError) throw error;
    if (error instanceof ProfessionalDataError) {
      throw new ProfessionalSourceError('validation_failed');
    }
    throw error;
  }
}

export async function loadProfessionals(
  serviceClient: SupabaseClient,
  options: LoadProfessionalsOptions = {},
): Promise<Professional[]> {
  const requestedPageSize = options.pageSize ?? MAX_PAGE_SIZE;
  if (!Number.isInteger(requestedPageSize) || requestedPageSize < 1) {
    throw new TypeError('pageSize must be a positive integer');
  }
  const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);
  const geographies = options.geographies
    ? [...new Set(options.geographies)].sort()
    : undefined;
  const expectedCount = await fetchExpectedCount(serviceClient, geographies);
  if (expectedCount === 0) {
    throw new ProfessionalSourceError('empty_source');
  }

  const professionals: Professional[] = [];
  const ids = new Set<string>();
  let lastId: string | undefined;

  while (professionals.length < expectedCount) {
    let query = serviceClient
      .from('professional_scoring_input')
      .select('*')
      .order('id', { ascending: true })
      .limit(pageSize);
    if (lastId) query = query.gt('id', lastId);
    if (geographies?.length) {
      query = query.in('current_geography', geographies);
    }

    const { data, error } = await query;
    if (error || !data) {
      throw new ProfessionalSourceError('query_failed');
    }
    if (data.length === 0) {
      throw new ProfessionalSourceError('count_mismatch');
    }

    const page = parsePageOrThrow(data);
    for (const professional of page) {
      if (ids.has(professional.id) || (lastId && professional.id <= lastId)) {
        throw new ProfessionalSourceError('duplicate_id');
      }
      ids.add(professional.id);
      professionals.push(professional);
      lastId = professional.id;
    }
  }

  if (professionals.length !== expectedCount) {
    throw new ProfessionalSourceError('count_mismatch');
  }
  return professionals;
}
