# Roadmap

The repo was reset to an honest baseline: a working orchestration engine with
no agents. The path to a first end-to-end run:

## Step 2 — Real cloud LLM client ✅ (done)

- ~~Implement `CloudLLMClient.complete()` with `@anthropic-ai/sdk`, using
  structured output driven by the existing `responseSchema` parameter~~
- ~~Replace placeholder model IDs in `MODEL_TIERS` / `MODEL_COSTS_PER_TOKEN`
  with real, current model IDs and prices~~ (Opus 5 / Sonnet 5 / Haiku 4.5)
- ~~Unit tests with a mocked SDK~~

## Step 3 — First agent, persistence, minimal runner

- `IdeaAgent` for the `SPECIFYING` stage on the engine's `BaseAgent`
  (prompt starting point: `docs/legacy/idea-spec-prompts.md`)
- A simple `StateStore` implementation (file-based or SQLite) so runs survive
  a process restart
- Register agents in `AgentRegistry`; a minimal CLI entry point that takes a
  raw idea and runs the pipeline until the first missing agent

## Step 4 — Full pipeline

- Remaining agents: `ArchAgent`, `BackendAgent`, `FrontendAgent`, `QAAgent`,
  `DeployAgent`
- Integration test: full pipeline run against a mock LLM
- Artifact output: write generated code to a workspace directory

## Later

- Postgres-backed `StateStore` and a real `DistributedLock`
- HTTP API and dashboard
- Deployment automation for generated projects
