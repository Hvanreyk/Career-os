// ============================================================
// Activation — the compound event that says the loop is running:
// a contact exists, real outreach happened, and the next action is
// scheduled. Creating a contact alone is setup, not activation.
// Pure module — no I/O.
// ============================================================

export interface ActivationState {
  hasContact: boolean;
  hasLoggedOutreach: boolean;
  hasScheduledFollowUp: boolean;
}

export interface ActivationResult {
  activated: boolean;
  missing: string[];
}

/**
 * Computes whether the user has completed networking activation.
 *
 * @param state - Which of the three activation steps exist
 * @returns Activation flag plus human-readable missing steps
 */
export function computeActivation(state: ActivationState): ActivationResult {
  const missing: string[] = [];
  if (!state.hasContact) missing.push('Add or import your first contact');
  if (!state.hasLoggedOutreach) missing.push('Send or log your first outreach');
  if (!state.hasScheduledFollowUp) missing.push('Schedule the next follow-up');
  return { activated: missing.length === 0, missing };
}
