import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ProfessionalDataError,
  parseProfessionalRowsOrThrow,
} from '@trajectoryos/core/scoring/professional-adapter';
import type { Professional } from '@trajectoryos/core/scoring/types';
import { getProfessionalSourceMode, type ProfessionalSourceMode } from './mode';

export type { ProfessionalSourceMode } from './mode';

export interface LoadedProfessionalSources {
  mode: ProfessionalSourceMode;
  professionals: Professional[];
  shadowProfessionals?: Professional[];
  shadowError?: 'query_failed' | 'validation_failed' | 'empty_source';
}

export class ProfessionalSourceError extends Error {
  constructor(
    public readonly source: 'legacy' | 'normalized',
    public readonly reason: 'query_failed' | 'validation_failed' | 'empty_source',
  ) {
    super(`Unable to load ${source} professional source (${reason})`);
    this.name = 'ProfessionalSourceError';
  }
}

async function fetchRows(
  serviceClient: SupabaseClient,
  source: 'legacy' | 'normalized',
): Promise<Professional[]> {
  const table = source === 'legacy' ? 'professionals' : 'professional_scoring_input_v1';
  const { data, error } = await serviceClient.from(table).select('*');
  if (error || !data) throw new ProfessionalSourceError(source, 'query_failed');
  try {
    return parseProfessionalRowsOrThrow(data, source);
  } catch (error) {
    if (error instanceof ProfessionalDataError) {
      throw new ProfessionalSourceError(source, 'validation_failed');
    }
    throw new ProfessionalSourceError(source, 'empty_source');
  }
}

export async function loadProfessionalSources(
  serviceClient: SupabaseClient,
  mode = getProfessionalSourceMode(),
): Promise<LoadedProfessionalSources> {
  if (mode === 'legacy') {
    return { mode, professionals: await fetchRows(serviceClient, 'legacy') };
  }
  if (mode === 'normalized') {
    return { mode, professionals: await fetchRows(serviceClient, 'normalized') };
  }

  const [legacyResult, normalizedResult] = await Promise.allSettled([
    fetchRows(serviceClient, 'legacy'),
    fetchRows(serviceClient, 'normalized'),
  ]);
  if (legacyResult.status === 'rejected') throw legacyResult.reason;
  if (normalizedResult.status === 'fulfilled') {
    return {
      mode,
      professionals: legacyResult.value,
      shadowProfessionals: normalizedResult.value,
    };
  }

  const error = normalizedResult.reason;
  return {
    mode,
    professionals: legacyResult.value,
    shadowError: error instanceof ProfessionalSourceError ? error.reason : 'query_failed',
  };
}
