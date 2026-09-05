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

  test('concurrent saves with the same expected version: exactly one wins', async () => {
    const state = makeProjectState({ id: 'proj_race' });
    await store.save(state, 1);

    const writerA = JSON.parse(JSON.stringify(state));
    writerA.meta.version = 2;
    writerA.status.stage = 'SPECIFYING';
    const writerB = JSON.parse(JSON.stringify(state));
    writerB.meta.version = 2;
    writerB.status.stage = 'FAILED';

    const results = await Promise.allSettled([
      store.save(writerA, 1),
      store.save(writerB, 1),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected'
    );
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(OptimisticLockError);
    expect((await store.load('proj_race')).meta.version).toBe(2);
  });

  test('a stale lock file does not wedge saves forever', async () => {
    const state = makeProjectState({ id: 'proj_stale' });
    const lockPath = `${store.fileFor('proj_stale')}.lock`;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(lockPath, '');
    const past = new Date(Date.now() - 60_000);
    fs.utimesSync(lockPath, past, past);

    await store.save(state, 1);
    expect((await store.load('proj_stale')).meta.id).toBe('proj_stale');
  });
});
