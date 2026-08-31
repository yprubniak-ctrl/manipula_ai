import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Orchestrator } from '../engine/orchestrator';
import { AgentRegistry } from '../agents/registry';
import { registerDefaultAgents } from '../agents/defaults';
import { IModelRouter, LLMClient } from '../agents/interfaces';
import { FileStateStore } from '../state/file-state-store';
import { makeProjectState } from './helpers/state-fixture';

const SPEC_JSON = JSON.stringify({
  title: 'Team Todo',
  summary: 's',
  problem_statement: 'p',
  goals: [],
  target_users: [],
  features: [],
  success_metrics: [],
  assumptions: [],
  open_questions: [],
});

function makeRouter(): IModelRouter {
  const client: LLMClient = {
    modelId: 'claude-sonnet-5',
    complete: jest.fn().mockResolvedValue({
      content: SPEC_JSON,
      usage: { model: 'claude-sonnet-5', input_tokens: 1200, output_tokens: 600 },
    }),
  };
  return {
    select: jest.fn().mockResolvedValue(client),
    forceTier: jest.fn(),
    resetForcedTier: jest.fn(),
  };
}

describe('pipeline run with FileStateStore and IdeaAgent', () => {
  let dir: string;
  let store: FileStateStore;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'manipula-run-'));
    store = new FileStateStore(dir);
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('runs SPECIFYING, persists the spec, and stops at the first unimplemented agent', async () => {
    const registry = new AgentRegistry();
    registerDefaultAgents(registry);

    const initial = makeProjectState({ id: 'proj_e2e' });
    await store.save(initial, 1);

    const orchestrator = new Orchestrator({
      registry,
      router: makeRouter(),
      stateStore: store,
    });

    await expect(orchestrator.executeProject('proj_e2e')).rejects.toThrow(
      /No agent registered for stage: ArchAgent/
    );

    const persisted = await store.load('proj_e2e');
    expect(persisted.status.completed_stages).toContain('SPECIFYING');
    expect(persisted.spec).toMatchObject({ title: 'Team Todo' });
    expect(persisted.budget.spent_usd).toBeCloseTo(1200 * 0.000002 + 600 * 0.00001);
    expect(persisted.meta.version).toBeGreaterThan(initial.meta.version);
    expect(persisted.history.length).toBeGreaterThan(0);
  });

  test('resumed project skips the completed SPECIFYING stage', async () => {
    const registry = new AgentRegistry();
    registerDefaultAgents(registry);
    const router = makeRouter();

    const initial = makeProjectState({ id: 'proj_resume' });
    await store.save(initial, 1);

    const orchestrator = new Orchestrator({ registry, router, stateStore: store });
    await expect(orchestrator.executeProject('proj_resume')).rejects.toThrow(/ArchAgent/);

    const selectCallsAfterFirstRun = (router.select as jest.Mock).mock.calls.length;
    await expect(orchestrator.executeProject('proj_resume')).rejects.toThrow(/ArchAgent/);

    expect((router.select as jest.Mock).mock.calls.length).toBe(selectCallsAfterFirstRun);
  });
});
