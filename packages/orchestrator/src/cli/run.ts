#!/usr/bin/env node
/**
 * Minimal pipeline runner:
 *   pnpm pipeline "an idea for an app"           # start a new project
 *   pnpm pipeline --project proj_abc123          # resume a saved project
 *
 * Env: ANTHROPIC_API_KEY (cloud), OLLAMA_ENABLED / OLLAMA_NODES (local),
 * BUDGET_LIMIT_USD (default 25). Also see --budget and --state-dir flags.
 */

import { randomUUID } from 'crypto';
import { OrchestratorProjectState } from '@manipula/shared';
import { Orchestrator } from '../engine/orchestrator';
import { AgentRegistry } from '../agents/registry';
import { registerDefaultAgents } from '../agents/defaults';
import { ModelRouter } from '../routing/model-router';
import { FileStateStore } from '../state/file-state-store';
import { writeProjectArtifacts } from '../artifacts/writer';

interface CliOptions {
  idea: string;
  project?: string;
  budget: number;
  stateDir: string;
}

function parseArgs(argv: string[]): CliOptions {
  const ideaParts: string[] = [];
  const opts: CliOptions = {
    idea: '',
    budget: Number(process.env.BUDGET_LIMIT_USD ?? '25'),
    stateDir: '.manipula/projects',
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--project') opts.project = argv[++i];
    else if (arg === '--budget') opts.budget = Number(argv[++i]);
    else if (arg === '--state-dir') opts.stateDir = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else ideaParts.push(arg);
  }

  opts.idea = ideaParts.join(' ').trim();
  return opts;
}

function printUsage(): void {
  console.log(`Usage:
  pipeline "<raw idea>" [--budget <usd>] [--state-dir <dir>]
  pipeline --project <id> [--state-dir <dir>]

Environment:
  ANTHROPIC_API_KEY   cloud models (required unless OLLAMA_ENABLED=true)
  OLLAMA_ENABLED      "true" to allow local Ollama models
  OLLAMA_NODES        comma-separated Ollama URLs (default http://localhost:11434)
  BUDGET_LIMIT_USD    default budget limit (default 25)`);
}

function createInitialState(idea: string, budgetLimitUsd: number): OrchestratorProjectState {
  const now = new Date().toISOString();
  return {
    meta: {
      id: `proj_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
      version: 1,
      schema_version: '2.1.0',
      created_at: now,
      updated_at: now,
      owner_id: 'cli',
      project_name: idea.length > 60 ? `${idea.slice(0, 57)}...` : idea,
      snapshot_key: null,
      rollback_history: [],
    },
    status: {
      stage: 'IDLE',
      stage_status: 'pending',
      iteration: 0,
      max_iterations: 3,
      awaiting_approval: false,
      error: null,
      completed_stages: [],
      celery_task_id: null,
    },
    inputs: {
      raw_idea: idea,
      constraints: [],
      tech_preferences: {},
      approval_required_stages: [],
    },
    spec: null,
    architecture: null,
    backend: null,
    frontend: null,
    qa: null,
    infra: null,
    budget: Orchestrator.buildDefaultBudget(budgetLimitUsd),
    logs: [],
    history: [],
  };
}

function printSummary(state: OrchestratorProjectState, store: FileStateStore): void {
  console.log('');
  console.log(`Project:    ${state.meta.id} — ${state.meta.project_name}`);
  console.log(`Stage:      ${state.status.stage} (${state.status.stage_status})`);
  console.log(`Completed:  ${state.status.completed_stages.join(', ') || '(none)'}`);
  console.log(
    `Budget:     $${state.budget.spent_usd.toFixed(4)} spent of $${state.budget.limit_usd.toFixed(2)}`
  );
  if (state.status.error) {
    const label = state.status.stage === 'PENDING_REVIEW' ? 'Needs input' : 'Error';
    console.log(`${label}: ${state.status.error}`);
  }
  if (state.spec) {
    const spec = state.spec as Record<string, unknown>;
    const features = Array.isArray(spec.features) ? spec.features.length : 0;
    const questions = Array.isArray(spec.open_questions) ? spec.open_questions.length : 0;
    console.log(`Spec:       "${spec.title}" — ${features} feature(s), ${questions} open question(s)`);
  }
  console.log(`State file: ${store.fileFor(state.meta.id)}`);
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  if (!opts.idea && !opts.project) {
    printUsage();
    process.exit(1);
  }

  const cloudApiKey = process.env.ANTHROPIC_API_KEY ?? '';
  const ollamaEnabled = process.env.OLLAMA_ENABLED === 'true';
  if (!cloudApiKey && !ollamaEnabled) {
    console.error(
      'No model source configured: set ANTHROPIC_API_KEY, or OLLAMA_ENABLED=true with a running Ollama.'
    );
    process.exit(1);
  }

  const registry = new AgentRegistry();
  registerDefaultAgents(registry);

  const router = new ModelRouter({
    cloudApiKey,
    ollamaEnabled,
    ollamaNodes: (process.env.OLLAMA_NODES ?? 'http://localhost:11434')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  });

  const store = new FileStateStore(opts.stateDir);

  let projectId: string;
  if (opts.project) {
    projectId = opts.project;
  } else {
    const initial = createInitialState(opts.idea, opts.budget);
    await store.save(initial, 1);
    projectId = initial.meta.id;
    console.log(`Created project ${projectId}`);
  }

  const orchestrator = new Orchestrator({ registry, router, stateStore: store });

  try {
    const finalState = await orchestrator.executeProject(projectId);
    printSummary(finalState, store);
    if (finalState.status.stage === 'COMPLETE') {
      const artifacts = await writeProjectArtifacts(finalState);
      console.log(`Artifacts:  ${artifacts.files.length} file(s) written to ${artifacts.root}`);
    }
    process.exit(finalState.status.stage === 'FAILED' ? 1 : 0);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('No agent registered for stage')) {
      const state = await store.load(projectId);
      printSummary(state, store);
      console.log('');
      console.log(
        `Stopped: ${message}. That stage is not implemented yet — ` +
          `resume later with: pipeline --project ${projectId}`
      );
      process.exit(0);
    }
    console.error(`Pipeline failed: ${message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
