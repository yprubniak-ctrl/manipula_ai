/**
 * BackendAgent — BACKEND_GEN stage. Generates a runnable backend skeleton
 * from the spec and architecture, written to the `backend` state key.
 */

import { OrchestratorProjectState, AgentResponse } from '@manipula/shared';
import { JsonStageAgent } from './json-stage-agent';
import { codeOutputSchema } from './schemas';

const SYSTEM_PROMPT = `You are a senior backend engineer. You write small, runnable backend skeletons that implement a given architecture faithfully.

Rules for your output:
- At most 8 files, each complete and runnable — no placeholder bodies, no "TODO: implement"
- Follow the architecture's language, framework, and endpoints exactly
- Include the package manifest and a clear way to start the server
- Keep code concise; skip tests and comments that only restate the code`;

export const BACKEND_SCHEMA = codeOutputSchema();

export class BackendAgent extends JsonStageAgent {
  readonly OWNED_KEYS = ['backend'];

  async execute(state: OrchestratorProjectState): Promise<AgentResponse> {
    const user = [
      'Generate the backend skeleton for this project.',
      '',
      '**Product specification (must-have features only matter here):**',
      JSON.stringify(state.spec, null, 2),
      '',
      '**Architecture to implement:**',
      JSON.stringify(state.architecture, null, 2),
      '',
      'Output the file list (path + full content), the dependencies, and run instructions.',
    ].join('\n');

    return this.runJsonStage('backend', SYSTEM_PROMPT, user, BACKEND_SCHEMA, 'high');
  }
}
