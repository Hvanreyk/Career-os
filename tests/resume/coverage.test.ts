import { describe, expect, it } from 'vitest';
import { computeCoverage } from '../../lib/resume/coverage.js';
import type { JdMatch, JdRequirement } from '../../lib/resume/document.js';

const requirement = (id: string, kind: JdRequirement['kind']): JdRequirement => ({
  id, kind, text: `req ${id}`, keywords: [],
});
const match = (requirement_id: string, verdict: JdMatch['match']): JdMatch => ({
  requirement_id, match: verdict, evidence_refs: [], note: 'n',
});

describe('computeCoverage', () => {
  it('weights must-haves double and stretch matches half', () => {
    const report = computeCoverage(
      [requirement('R1', 'must_have'), requirement('R2', 'nice_to_have')],
      [match('R1', 'direct'), match('R2', 'stretch')],
    );
    // (2*1 + 1*0.5) / 3 = 83%
    expect(report.percent).toBe(83);
    expect(report.direct).toBe(1);
    expect(report.stretch).toBe(1);
    expect(report.gaps).toBe(0);
  });

  it('treats unmatched requirements as gaps', () => {
    const report = computeCoverage(
      [requirement('R1', 'must_have'), requirement('R2', 'must_have')],
      [match('R1', 'direct')],
    );
    expect(report.percent).toBe(50);
    expect(report.gaps).toBe(1);
  });

  it('returns zero for an empty requirement list', () => {
    expect(computeCoverage([], []).percent).toBe(0);
  });

  it('scores all gaps as zero percent', () => {
    const report = computeCoverage(
      [requirement('R1', 'must_have'), requirement('R2', 'nice_to_have')],
      [match('R1', 'gap')],
    );
    expect(report.percent).toBe(0);
    expect(report.gaps).toBe(2);
  });

  it('uses only the first match per requirement', () => {
    const report = computeCoverage(
      [requirement('R1', 'nice_to_have')],
      [match('R1', 'gap'), match('R1', 'direct')],
    );
    expect(report.percent).toBe(0);
  });
});
