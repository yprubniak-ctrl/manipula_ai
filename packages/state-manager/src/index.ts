import { produce } from 'immer';
import { get, set, unset } from 'lodash';
import {
  ProjectState,
  StatePatch,
  StateValidationError,
  ProjectStateSchema,
} from '@manipula/shared';

// ============================================================================
// State Manager Class
// ============================================================================

export class StateManager {
  private states: Map<string, ProjectState[]> = new Map();
  private currentVersions: Map<string, number> = new Map();

  /**
   * Initialize a new project state
   */
  initialize(state: ProjectState): void {
    this.validateState(state);
    const projectId = state.id;

    this.states.set(projectId, [state]);
    this.currentVersions.set(projectId, state.version);
  }

  /**
   * Get current state for a project
   */
  getState(projectId: string): ProjectState | undefined {
    const versions = this.states.get(projectId);
    if (!versions || versions.length === 0) {
      return undefined;
    }

    const currentVersion = this.currentVersions.get(projectId) || 1;
    return versions.find((s) => s.version === currentVersion);
  }

  /**
   * Get specific version of state
   */
  getStateVersion(projectId: string, version: number): ProjectState | undefined {
    const versions = this.states.get(projectId);
    if (!versions) {
      return undefined;
    }

    return versions.find((s) => s.version === version);
  }

  /**
   * Get all versions for a project
   */
  getStateHistory(projectId: string): ProjectState[] {
    return this.states.get(projectId) || [];
  }

  /**
   * Apply patches to create new state version
   */
  applyPatches(projectId: string, patches: StatePatch[]): ProjectState {
    const currentState = this.getState(projectId);
    if (!currentState) {
      throw new StateValidationError(`Project ${projectId} not found`);
    }

    // Create new state with patches applied
    const newState = produce(currentState, (draft) => {
      for (const patch of patches) {
        this.applyPatch(draft, patch);
      }

      // Update version and timestamp
      draft.version += 1;
      draft.updated_at = new Date();
    });

    // Validate new state
    this.validateState(newState);

    // Store new version
    const versions = this.states.get(projectId) || [];
    versions.push(newState);
    this.states.set(projectId, versions);
    this.currentVersions.set(projectId, newState.version);

    return newState;
  }

  /**
   * Rollback to a previous version
   */
  rollback(projectId: string, version: number): ProjectState {
    const targetState = this.getStateVersion(projectId, version);
    if (!targetState) {
      throw new StateValidationError(
        `Version ${version} not found for project ${projectId}`
      );
    }

    this.currentVersions.set(projectId, version);
    return targetState;
  }

  /**
   * Create a snapshot of current state
   */
  snapshot(projectId: string): ProjectState {
    const state = this.getState(projectId);
    if (!state) {
      throw new StateValidationError(`Project ${projectId} not found`);
    }

    return JSON.parse(JSON.stringify(state)); // Deep clone
  }

  /**
   * Delete project state (cleanup)
   */
  delete(projectId: string): void {
    this.states.delete(projectId);
    this.currentVersions.delete(projectId);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private applyPatch(state: any, patch: StatePatch): void {
    const { path, operation, value } = patch;

    switch (operation) {
      case 'set':
        set(state, path, value);
        break;

      case 'merge':
        const existing = get(state, path, {});
        if (typeof existing !== 'object' || Array.isArray(existing)) {
          throw new StateValidationError(
            `Cannot merge into non-object at path: ${path}`
          );
        }
        set(state, path, { ...existing, ...value });
        break;

      case 'delete':
        unset(state, path);
        break;

      case 'push':
        const array = get(state, path, []);
        if (!Array.isArray(array)) {
          throw new StateValidationError(`Cannot push to non-array at path: ${path}`);
        }
        array.push(value);
        set(state, path, array);
        break;

      default:
        throw new StateValidationError(`Unknown operation: ${operation}`);
    }
  }

  private validateState(state: ProjectState): void {
    try {
      ProjectStateSchema.parse(state);
    } catch (error: any) {
      throw new StateValidationError('Invalid project state', {
        errors: error.errors,
      });
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const stateManager = new StateManager();

// ============================================================================
// Helper Functions
// ============================================================================

export function createStatePatch(
  path: string,
  operation: StatePatch['operation'],
  value: any
): StatePatch {
  return { path, operation, value };
}

export function diffStates(
  oldState: ProjectState,
  newState: ProjectState
): StatePatch[] {
  const patches: StatePatch[] = [];

  // This is a simplified diff - in production, you'd want a more sophisticated
  // algorithm to generate minimal patches
  if (JSON.stringify(oldState) !== JSON.stringify(newState)) {
    patches.push({
      path: '',
      operation: 'set',
      value: newState,
    });
  }

  return patches;
}

export function validatePatches(patches: StatePatch[]): boolean {
  for (const patch of patches) {
    if (!patch.path || !patch.operation) {
      return false;
    }

    if (!['set', 'merge', 'delete', 'push'].includes(patch.operation)) {
      return false;
    }
  }

  return true;
}
