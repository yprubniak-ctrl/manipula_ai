/**
 * File-backed StateStore — one JSON file per project, optimistic locking on
 * meta.version, atomic writes via temp-file rename.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import {
  OrchestratorProjectState,
  OptimisticLockError,
  ManipulaError,
} from '@manipula/shared';
import { StateStore } from '../engine/orchestrator';

export class ProjectNotFoundError extends ManipulaError {
  constructor(projectId: string) {
    super(`Project ${projectId} not found in state store`, 'PROJECT_NOT_FOUND', {
      projectId,
    });
    this.name = 'ProjectNotFoundError';
  }
}

export class FileStateStore implements StateStore {
  constructor(private readonly baseDir: string = '.manipula/projects') {}

  async load(projectId: string): Promise<OrchestratorProjectState> {
    let raw: string;
    try {
      raw = await fs.readFile(this.fileFor(projectId), 'utf-8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new ProjectNotFoundError(projectId);
      }
      throw err;
    }
    return JSON.parse(raw) as OrchestratorProjectState;
  }

  async save(state: OrchestratorProjectState, expectedVersion: number): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true });
    const file = this.fileFor(state.meta.id);

    let stored: OrchestratorProjectState | null = null;
    try {
      stored = JSON.parse(await fs.readFile(file, 'utf-8')) as OrchestratorProjectState;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }

    if (stored && stored.meta.version !== expectedVersion) {
      throw new OptimisticLockError(
        `Stored version ${stored.meta.version} does not match expected ${expectedVersion} ` +
          `for project ${state.meta.id}`
      );
    }

    const tmp = `${file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(state, null, 2), 'utf-8');
    await fs.rename(tmp, file);
  }

  async exists(projectId: string): Promise<boolean> {
    try {
      await fs.access(this.fileFor(projectId));
      return true;
    } catch {
      return false;
    }
  }

  fileFor(projectId: string): string {
    if (!/^[A-Za-z0-9_-]+$/.test(projectId)) {
      throw new ManipulaError(`Invalid project id: ${projectId}`, 'INVALID_PROJECT_ID');
    }
    return path.join(this.baseDir, `${projectId}.json`);
  }
}
