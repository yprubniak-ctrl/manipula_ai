# Manipula — Agentic Orchestration Engine

Manipula is a TypeScript monorepo building an agent-orchestrated pipeline for
end-to-end software development: idea → spec → architecture → backend →
frontend → QA → deploy. Specialized AI agents advance a single versioned
project state through a deterministic stage pipeline, with budget control and
a QA feedback loop.

**Current status: the orchestration engine works; the agents don't exist yet.**
This README describes what is actually in the repo — see the
[roadmap](./ROADMAP.md) for what comes next.

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
- 38 unit tests

`packages/shared` (`@manipula/shared`) — types, pipeline/stage definitions,
budget and failure policies shared across packages.

## What is not implemented yet

- **Stage agents** (`IdeaAgent`, `ArchAgent`, `BackendAgent`, …) — the agent
  registry is empty, so the pipeline cannot run end-to-end yet
- **State persistence** — `StateStore` is an interface with no implementation
- **CLI / API / UI** — nothing user-facing yet

The cloud client reads its API key from `ModelRouterConfig.cloudApiKey` —
pass `process.env.ANTHROPIC_API_KEY` when constructing the router (see
`.env.example`).

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
