import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { OptimisticLockError } from '@manipula/shared';
import { FileStateStore, ProjectNotFoundError } from '../state/file-state-store';
import { makeProjectState } from './helpers/state-fixture';

describe('FileStateStore', () => {
  let dir: string;
  let store: FileStateStore;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'manipula-store-'));
    store = new FileStateStore(dir);
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('save then load round-trips the state', async () => {
    const state = makeProjectState({ id: 'proj_rt' });
    await store.save(state, 1);
    const loaded = await store.load('proj_rt');
    expect(loaded).toEqual(state);
  });

  test('load throws ProjectNotFoundError for unknown project', async () => {
    await expect(store.load('proj_missing')).rejects.toThrow(ProjectNotFoundError);
  });

  test('save succeeds when expectedVersion matches the stored version', async () => {
    const state = makeProjectState({ id: 'proj_v' });
    await store.save(state, 1);

    const next = { ...state, meta: { ...state.meta, version: 3 } };
    await store.save(next, 1);
    expect((await store.load('proj_v')).meta.version).toBe(3);
  });

  test('save throws OptimisticLockError on version mismatch', async () => {
    const state = makeProjectState({ id: 'proj_conflict' });
    await store.save(state, 1);

    const next = { ...state, meta: { ...state.meta, version: 3 } };
    await expect(store.save(next, 2)).rejects.toThrow(OptimisticLockError);
  });

  test('rejects project ids that are not filesystem-safe', () => {
    expect(() => store.fileFor('../escape')).toThrow(/Invalid project id/);
  });

  test('exists reports presence of a project', async () => {
    expect(await store.exists('proj_e')).toBe(false);
    await store.save(makeProjectState({ id: 'proj_e' }), 1);
    expect(await store.exists('proj_e')).toBe(true);
  });
});
