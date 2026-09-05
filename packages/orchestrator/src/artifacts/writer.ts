/**
 * Writes generated files from project state (backend / frontend / infra) into
 * a workspace directory on disk.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { OrchestratorProjectState, ManipulaError } from '@manipula/shared';

export interface WrittenArtifacts {
  root: string;
  files: string[];
}

const SECTIONS = ['backend', 'frontend', 'infra'] as const;

export async function writeProjectArtifacts(
  state: OrchestratorProjectState,
  baseDir: string = '.manipula/workspace'
): Promise<WrittenArtifacts> {
  const root = path.resolve(baseDir, state.meta.id);
  const written: string[] = [];

  for (const section of SECTIONS) {
    const value = state[section] as Record<string, unknown> | null;
    if (!value || !Array.isArray(value.files)) continue;

    for (const file of value.files as Array<Record<string, unknown>>) {
      if (typeof file?.path !== 'string' || typeof file?.content !== 'string') continue;
      const target = safeResolve(root, section, file.path);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, file.content, 'utf-8');
      written.push(path.relative(root, target));
    }
  }

  return { root, files: written };
}

function safeResolve(root: string, section: string, relPath: string): string {
  const sectionRoot = path.resolve(root, section);
  const target = path.resolve(sectionRoot, relPath);
  if (target !== sectionRoot && !target.startsWith(sectionRoot + path.sep)) {
    throw new ManipulaError(`Unsafe artifact path: ${relPath}`, 'UNSAFE_ARTIFACT_PATH', {
      section,
    });
  }
  if (target === sectionRoot) {
    throw new ManipulaError(`Artifact path resolves to a directory: ${relPath}`, 'UNSAFE_ARTIFACT_PATH');
  }
  return target;
}
