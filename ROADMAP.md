# Roadmap

The repo was reset to an honest baseline: a working orchestration engine with
no agents. The path to a first end-to-end run:

## Step 2 — Real cloud LLM client ✅ (done)

- ~~Implement `CloudLLMClient.complete()` with `@anthropic-ai/sdk`, using
  structured output driven by the existing `responseSchema` parameter~~
- ~~Replace placeholder model IDs in `MODEL_TIERS` / `MODEL_COSTS_PER_TOKEN`
  with real, current model IDs and prices~~ (Opus 5 / Sonnet 5 / Haiku 4.5)
- ~~Unit tests with a mocked SDK~~

## Step 3 — First agent, persistence, minimal runner ✅ (done)

- ~~`IdeaAgent` for the `SPECIFYING` stage on the engine's `BaseAgent`~~
- ~~A simple `StateStore` implementation (file-based) so runs survive a
  process restart~~ (`FileStateStore`, optimistic locking, atomic writes)
- ~~Register agents in `AgentRegistry`; a minimal CLI entry point~~
  (`pnpm pipeline "<idea>"` / `--project <id>` to resume)

## Step 4 — Full pipeline ✅ (done)

- ~~Remaining agents: `ArchAgent`, `BackendAgent`, `FrontendAgent`, `QAAgent`,
  `DeployAgent`~~
- ~~Integration test: full pipeline run against a mock LLM~~ (happy path and
  QA-failure retry loop)
- ~~Artifact output: write generated code to a workspace directory~~
  (`.manipula/workspace/<id>/`)

## Later

- Execute the generated project during QA (run it, hit the endpoints) instead
  of static review only
- CLI flag to require approval before DEPLOYING (engine already supports it)
- Postgres-backed `StateStore` and a real `DistributedLock`
- HTTP API and dashboard
- Deployment automation for generated projects
