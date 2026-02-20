/**
 * State machine with transition validation.
 */

import {
  OrchestratorProjectState,
  OrchestratorStage,
  VALID_TRANSITIONS,
  InvalidTransitionError,
} from '@manipula/shared';

/**
 * Validates and applies stage transitions to project state.
 */
export class StateMachine {
  transition(
    state: OrchestratorProjectState,
    targetStage: OrchestratorStage
  ): OrchestratorProjectState {
    const currentStage = state.status.stage;
    const allowedTransitions = VALID_TRANSITIONS[currentStage] ?? [];

    if (!allowedTransitions.includes(targetStage)) {
      throw new InvalidTransitionError(
        `Transition from ${currentStage} to ${targetStage} is not allowed. ` +
        `Allowed: ${allowedTransitions.join(', ')}`
      );
    }

    const next: OrchestratorProjectState = JSON.parse(JSON.stringify(state));
    next.status.stage = targetStage;
    next.meta.version += 1;
    next.meta.updated_at = new Date().toISOString();

    return next;
  }

  canTransition(fromStage: OrchestratorStage, toStage: OrchestratorStage): boolean {
    return (VALID_TRANSITIONS[fromStage] ?? []).includes(toStage);
  }

  getValidTransitions(stage: OrchestratorStage): OrchestratorStage[] {
    return VALID_TRANSITIONS[stage] ?? [];
  }
}
