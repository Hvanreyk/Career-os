import { describe, expect, it } from 'vitest';

import { reconstructAtStage } from '../../lib/scoring/snapshot.js';
import type { Professional } from '../../lib/scoring/types.js';
import { loadPros } from './fixtures.js';

function professionalWithTimedAchievements(): Professional {
  return {
    ...structuredClone(loadPros()[0]!),
    graduation_year: 2026,
    current_role_start_year: 2027,
    signals: ['scholarship', 'deans_list', 'modelling_course'],
    achievements: [
      { tag: 'scholarship', effective_year: 2023, date_precision: 'year' },
      { tag: 'deans_list', effective_year: 2025, date_precision: 'year' },
      { tag: 'modelling_course', effective_year: null, date_precision: 'unknown' },
    ],
  };
}

describe('professional achievement stage reconstruction', () => {
  it('credits known achievements only after their effective year', () => {
    const professional = professionalWithTimedAchievements();

    expect(reconstructAtStage(professional, 'S0').signals).toEqual(['scholarship']);
    expect(reconstructAtStage(professional, 'S1').signals)
      .toEqual(['scholarship', 'modelling_course']);
    expect(reconstructAtStage(professional, 'S2').signals)
      .toEqual(['scholarship', 'deans_list', 'modelling_course']);
  });

  it('retains the S1-and-later fallback for signals without timing metadata', () => {
    const professional = professionalWithTimedAchievements();
    professional.achievements = [];

    expect(reconstructAtStage(professional, 'S0').signals).toEqual([]);
    expect(reconstructAtStage(professional, 'S1').signals).toEqual(professional.signals);
  });

  it('includes achievement-only tags without duplicating existing signals', () => {
    const professional = professionalWithTimedAchievements();
    professional.signals = ['scholarship'];
    professional.achievements!.push({
      tag: 'scholarship',
      effective_year: 2023,
      date_precision: 'year',
    });

    expect(reconstructAtStage(professional, 'S2').signals)
      .toEqual(['scholarship', 'deans_list', 'modelling_course']);
  });
});
