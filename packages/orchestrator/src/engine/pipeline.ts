/**
 * Pipeline configuration and stage spec definitions.
 */

import {
  PIPELINE,
  VALID_TRANSITIONS,
  OrchestratorStage,
  StageSpec,
  StageComplexity,
} from '@manipula/shared';

export { PIPELINE, VALID_TRANSITIONS };
export type { StageSpec, StageComplexity };

export function findStageSpec(stageName: OrchestratorStage | string): StageSpec | undefined {
  return PIPELINE.find((s) => s.name === stageName);
}

export function getPipelineOrder(): OrchestratorStage[] {
  return PIPELINE.map((s) => s.name);
}

export function requiresApproval(stageName: OrchestratorStage | string): boolean {
  return findStageSpec(stageName)?.approvalCheckpoint === true;
}
