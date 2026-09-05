import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ManipulaError } from '@manipula/shared';
import { writeProjectArtifacts } from '../artifacts/writer';
import { makeProjectState } from './helpers/state-fixture';
import { BACKEND_FIXTURE, FRONTEND_FIXTURE, INFRA_FIXTURE } from './helpers/fixtures';

describe('writeProjectArtifacts', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'manipula-artifacts-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('writes backend, frontend, and infra files into per-section subdirs', async () => {
    const state = makeProjectState({ id: 'proj_art' });
    state.backend = BACKEND_FIXTURE as unknown as Record<string, unknown>;
    state.frontend = FRONTEND_FIXTURE as unknown as Record<string, unknown>;
    state.infra = INFRA_FIXTURE as unknown as Record<string, unknown>;

    const result = await writeProjectArtifacts(state, dir);

    expect(result.root).toBe(path.resolve(dir, 'proj_art'));
    expect(result.files.sort()).toEqual(
      [
        path.join('backend', 'package.json'),
        path.join('backend', 'src', 'index.js'),
        path.join('frontend', 'index.html'),
        path.join('infra', 'Dockerfile'),
        path.join('infra', 'docker-compose.yml'),
      ].sort()
    );
    expect(fs.readFileSync(path.join(result.root, 'backend', 'src', 'index.js'), 'utf-8')).toBe(
      'console.log("api")'
    );
  });

  test('returns empty result when no sections carry files', async () => {
    const result = await writeProjectArtifacts(makeProjectState({ id: 'proj_empty' }), dir);
    expect(result.files).toEqual([]);
  });

  test('rejects path traversal outside the section directory', async () => {
    const state = makeProjectState({ id: 'proj_evil' });
    state.backend = {
      files: [{ path: '../../escape.txt', content: 'nope' }],
    };

    await expect(writeProjectArtifacts(state, dir)).rejects.toThrow(ManipulaError);
    expect(fs.existsSync(path.join(dir, 'escape.txt'))).toBe(false);
  });
});
