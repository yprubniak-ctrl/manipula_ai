/**
 * State rollback handler — restores state from a snapshot and nullifies
 * all downstream stage data.
 */

import { OrchestratorProjectState, OrchestratorStage, PIPELINE } from '@manipula/shared';
import { SnapshotManager } from './manager';

const STAGE_FIELD_MAP: Partial<Record<OrchestratorStage, keyof OrchestratorProjectState>> = {
  SPECIFYING:    'spec',
  ARCHITECTING:  'architecture',
  BACKEND_GEN:   'backend',
  FRONTEND_GEN:  'frontend',
  QA_VALIDATION: 'qa',
  DEPLOYING:     'infra',
};

function stagesAfter(stageName: OrchestratorStage): OrchestratorStage[] {
  const idx = PIPELINE.findIndex((s) => s.name === stageName);
  if (idx === -1) return [];
  return PIPELINE.slice(idx + 1).map((s) => s.name);
}

/**
 * Restores a project state from a snapshot, then nullifies all downstream
 * stage data so the pipeline can resume cleanly.
 */
export class RollbackHandler {
  constructor(private readonly snapshotManager: SnapshotManager) {}

  async rollback(
    _projectId: string,
    snapshotKey: string
  ): Promise<OrchestratorProjectState> {
    const state = await this.snapshotManager.load(snapshotKey);

    const downstream = stagesAfter(state.status.stage);
    for (const stage of downstream) {
      const field = STAGE_FIELD_MAP[stage];
      if (field) {
        (state[field] as unknown) = null;
      }
      const idx = state.status.completed_stages.indexOf(stage);
      if (idx !== -1) state.status.completed_stages.splice(idx, 1);
    }

    state.status.stage = 'PAUSED';
    state.status.stage_status = 'pending';
    state.meta.updated_at = new Date().toISOString();

    return state;
  }
}
