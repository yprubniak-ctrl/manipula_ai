/**
 * FrontendAgent — FRONTEND_GEN stage. Generates a frontend skeleton wired to
 * the backend's API, written to the `frontend` state key.
 */

import { OrchestratorProjectState, AgentResponse } from '@manipula/shared';
import { JsonStageAgent } from './json-stage-agent';
import { codeOutputSchema } from './schemas';

const SYSTEM_PROMPT = `You are a senior frontend engineer. You write small, working frontend skeletons against a given backend API.

Rules for your output:
- At most 8 files, each complete — no placeholder bodies
- Follow the architecture's frontend framework choice exactly
- Call the backend's actual API endpoints; do not invent new ones
- Cover the must-have features with minimal, clean UI`;

export const FRONTEND_SCHEMA = codeOutputSchema();

export class FrontendAgent extends JsonStageAgent {
  readonly OWNED_KEYS = ['frontend'];

  async execute(state: OrchestratorProjectState): Promise<AgentResponse> {
    const backend = (state.backend ?? {}) as Record<string, unknown>;
    const user = [
      'Generate the frontend skeleton for this project.',
      '',
      '**Product specification:**',
      JSON.stringify(state.spec, null, 2),
      '',
      '**Architecture (framework choice and API endpoints):**',
      JSON.stringify(state.architecture, null, 2),
      '',
      '**Backend summary and how it runs:**',
      JSON.stringify(
        { summary: backend.summary, run_instructions: backend.run_instructions },
        null,
        2
      ),
      '',
      'Output the file list (path + full content), the dependencies, and run instructions.',
    ].join('\n');

    return this.runJsonStage('frontend', SYSTEM_PROMPT, user, FRONTEND_SCHEMA, 'medium');
  }
}
