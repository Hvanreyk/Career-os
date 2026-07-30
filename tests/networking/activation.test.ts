import { describe, expect, it } from 'vitest';
import { computeActivation } from '../../lib/networking/activation.js';

describe('computeActivation', () => {
  it('is not activated on contact creation alone', () => {
    const result = computeActivation({ hasContact: true, hasLoggedOutreach: false, hasScheduledFollowUp: false });
    expect(result.activated).toBe(false);
    expect(result.missing).toHaveLength(2);
  });

  it('is activated once all three steps are complete', () => {
    const result = computeActivation({ hasContact: true, hasLoggedOutreach: true, hasScheduledFollowUp: true });
    expect(result.activated).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('lists every missing step', () => {
    const result = computeActivation({ hasContact: false, hasLoggedOutreach: false, hasScheduledFollowUp: false });
    expect(result.missing).toHaveLength(3);
  });
});
