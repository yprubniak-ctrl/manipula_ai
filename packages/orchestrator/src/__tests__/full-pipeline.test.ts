import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Orchestrator } from '../engine/orchestrator';
import { AgentRegistry } from '../agents/registry';
import { registerDefaultAgents } from '../agents/defaults';
import { IModelRouter, LLMClient } from '../agents/interfaces';
import { FileStateStore } from '../state/file-state-store';
import { writeProjectArtifacts } from '../artifacts/writer';
import { makeProjectState } from './helpers/state-fixture';
import {
  SPEC_FIXTURE,
  ARCH_FIXTURE,
  BACKEND_FIXTURE,
  FRONTEND_FIXTURE,
  QA_PASS_FIXTURE,
  QA_FAIL_BACKEND_FIXTURE,
  INFRA_FIXTURE,
} from './helpers/fixtures';

interface SmartRouter {
  router: IModelRouter;
  callsByAgent: Record<string, number>;
}

function makeSmartRouter(qaResults: unknown[]): SmartRouter {
  const callsByAgent: Record<string, number> = {};
  let qaCall = 0;

  const complete = jest.fn(async (params: { system: string }) => {
    const sys = params.system;
    let agent: string;
    let fixture: unknown;

    if (sys.includes('product manager')) {
      agent = 'idea';
      fixture = SPEC_FIXTURE;
    } else if (sys.includes('software architect')) {
      agent = 'arch';
      fixture = ARCH_FIXTURE;
    } else if (sys.includes('backend engineer')) {
      agent = 'backend';
      fixture = BACKEND_FIXTURE;
    } else if (sys.includes('frontend engineer')) {
      agent = 'frontend';
      fixture = FRONTEND_FIXTURE;
    } else if (sys.includes('QA engineer')) {
      agent = 'qa';
      fixture = qaResults[Math.min(qaCall, qaResults.length - 1)];
      qaCall += 1;
    } else if (sys.includes('DevOps engineer')) {
      agent = 'deploy';
      fixture = INFRA_FIXTURE;
    } else {
      throw new Error(`Unrecognized system prompt: ${sys.slice(0, 60)}`);
    }

    callsByAgent[agent] = (callsByAgent[agent] ?? 0) + 1;
    return {
      content: JSON.stringify(fixture),
      usage: { model: 'claude-sonnet-5', input_tokens: 500, output_tokens: 300 },
    };
  });

  const client: LLMClient = { modelId: 'claude-sonnet-5', complete };
  const router: IModelRouter = {
    select: jest.fn().mockResolvedValue(client),
    forceTier: jest.fn(),
    resetForcedTier: jest.fn(),
  };
  return { router, callsByAgent };
}

describe('full pipeline run', () => {
  let dir: string;
  let store: FileStateStore;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'manipula-full-'));
    store = new FileStateStore(path.join(dir, 'projects'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('runs all six stages to COMPLETE and artifacts are writable', async () => {
    const registry = new AgentRegistry();
    registerDefaultAgents(registry);
    const { router, callsByAgent } = makeSmartRouter([QA_PASS_FIXTURE]);

    await store.save(makeProjectState({ id: 'proj_full' }), 1);
    const orchestrator = new Orchestrator({ registry, router, stateStore: store });

    const final = await orchestrator.executeProject('proj_full');

    expect(final.status.stage).toBe('COMPLETE');
    expect(final.status.stage_status).toBe('success');
    expect(final.status.completed_stages).toEqual([
      'SPECIFYING',
      'ARCHITECTING',
      'BACKEND_GEN',
      'FRONTEND_GEN',
      'QA_VALIDATION',
      'DEPLOYING',
    ]);
    expect((final.qa as Record<string, unknown>).passed).toBe(true);
    expect(callsByAgent).toEqual({ idea: 1, arch: 1, backend: 1, frontend: 1, qa: 1, deploy: 1 });

    // 6 LLM calls at 500 in / 300 out on claude-sonnet-5
    expect(final.budget.spent_usd).toBeCloseTo(6 * (500 * 0.000002 + 300 * 0.00001));

    const persisted = await store.load('proj_full');
    expect(persisted.status.stage).toBe('COMPLETE');
    expect(persisted.budget.spent_usd).toBeCloseTo(final.budget.spent_usd);

    const artifacts = await writeProjectArtifacts(final, path.join(dir, 'workspace'));
    expect(artifacts.files).toHaveLength(5);
    expect(fs.existsSync(path.join(artifacts.root, 'infra', 'docker-compose.yml'))).toBe(true);
  });

  test('QA failure re-runs the targeted stage, then the pipeline completes', async () => {
    const registry = new AgentRegistry();
    registerDefaultAgents(registry);
    const { router, callsByAgent } = makeSmartRouter([
      QA_FAIL_BACKEND_FIXTURE,
      QA_PASS_FIXTURE,
    ]);

    await store.save(makeProjectState({ id: 'proj_qaloop' }), 1);
    const orchestrator = new Orchestrator({ registry, router, stateStore: store });

    const final = await orchestrator.executeProject('proj_qaloop');

    expect(final.status.stage).toBe('COMPLETE');
    expect(callsByAgent.qa).toBe(2);
    expect(callsByAgent.backend).toBe(2);
    expect(callsByAgent.frontend).toBe(1);
    expect((final.qa as Record<string, unknown>).passed).toBe(true);
    expect(final.status.completed_stages).toContain('DEPLOYING');
  });
});
