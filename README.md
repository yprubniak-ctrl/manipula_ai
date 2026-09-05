# Manipula — Agentic Orchestration Engine

Manipula is a TypeScript monorepo building an agent-orchestrated pipeline for
end-to-end software development: idea → spec → architecture → backend →
frontend → QA → deploy. Specialized AI agents advance a single versioned
project state through a deterministic stage pipeline, with budget control and
a QA feedback loop.

**Current status: the engine runs the first pipeline stage end-to-end.** A raw
idea goes through the `IdeaAgent` (SPECIFYING) and the resulting spec is
persisted to disk; the pipeline then stops at the first stage that has no
agent yet. See the [roadmap](./ROADMAP.md) for what comes next.

## What works today

`packages/orchestrator` (`@manipula/orchestrator-engine`) — the pipeline
engine, implemented against [manipula-orchestrator-spec.md](./manipula-orchestrator-spec.md):

- **State machine** with validated stage transitions
  (`IDLE → SPECIFYING → … → COMPLETE`)
- **Stage executor** with retries, exponential backoff, and timeouts
- **Patch ownership validation** — each stage may only write its own state keys
- **Budget controller** — per-project USD limit with downgrade / freeze /
  hard-stop thresholds
- **QA feedback loop** that routes issues back to the responsible stage
- **Model router** — tier-based selection across a real **Anthropic cloud
  client** (structured outputs via JSON schema, refusal fallbacks on Opus 5)
  and a local **Ollama** client
- **Snapshots & rollback** hooks, structured logging, Prometheus-style metrics
- **`IdeaAgent`** — the SPECIFYING stage: turns a raw idea into a structured
  product spec (goals, personas, features, metrics, open questions)
- **`FileStateStore`** — file-backed persistence with optimistic locking, so
  runs survive restarts and can be resumed
- **CLI runner** — `pnpm pipeline "<idea>"` starts a project,
  `pnpm pipeline --project <id>` resumes one
- 56 unit tests, including a full pipeline run against a stubbed LLM

`packages/shared` (`@manipula/shared`) — types, pipeline/stage definitions,
budget and failure policies shared across packages.

## What is not implemented yet

- **Remaining stage agents** — `ArchAgent`, `BackendAgent`, `FrontendAgent`,
  `QAAgent`, `DeployAgent`; the pipeline stops with a clear error when it
  reaches an unimplemented stage
- **API / UI** — the CLI is the only interface

## Running the pipeline

```bash
export ANTHROPIC_API_KEY=sk-ant-...   # or OLLAMA_ENABLED=true with local Ollama
pnpm pipeline "a todo app for remote teams with offline sync"
```

This creates a project, runs the SPECIFYING stage against a real model, saves
state under `.manipula/projects/<id>.json`, and stops at ARCHITECTING (no
agent yet). Resume later with `pnpm pipeline --project <id>`. Flags:
`--budget <usd>` (default 25), `--state-dir <dir>`.

## Quick start

Prerequisites: Node.js 18+, pnpm 8+.

```bash
pnpm install
pnpm build
pnpm test
pnpm type-check
```

All root scripts run through turbo with correct dependency ordering.

## Repository structure

```
├── packages/
│   ├── shared/            # @manipula/shared — types, pipeline & policy definitions
│   └── orchestrator/      # @manipula/orchestrator-engine — the engine
├── docs/
│   └── legacy/            # Prompts salvaged from the removed first-generation code
├── manipula-orchestrator-spec.md   # Design spec the engine implements
└── ROADMAP.md             # What gets built next
```

## Design

The engine follows [manipula-orchestrator-spec.md](./manipula-orchestrator-spec.md);
code comments reference spec sections (e.g. "Spec Section 7" for budgets).
The name comes from the Roman *manipulus* — the smallest self-sufficient
tactical unit.

## License

MIT — see [LICENSE](./LICENSE).
