/**
 * DeployAgent — DEPLOYING stage. Produces containerization and deployment
 * files for the generated project, written to the `infra` state key.
 */

import { OrchestratorProjectState, AgentResponse } from '@manipula/shared';
import { JsonStageAgent } from './json-stage-agent';
import { codeOutputSchema } from './schemas';

const SYSTEM_PROMPT = `You are a pragmatic DevOps engineer. You produce the minimal deployment setup that runs a small project reliably.

Rules for your output:
- A Dockerfile per service and one docker-compose.yml wiring them together
- Match the project's actual run instructions and dependencies — do not invent build steps
- Keep it minimal: no Kubernetes, no cloud-specific IaC unless the architecture demands it`;

export const INFRA_SCHEMA = codeOutputSchema();

export class DeployAgent extends JsonStageAgent {
  readonly OWNED_KEYS = ['infra'];

  async execute(state: OrchestratorProjectState): Promise<AgentResponse> {
    const backend = (state.backend ?? {}) as Record<string, unknown>;
    const frontend = (state.frontend ?? {}) as Record<string, unknown>;

    const user = [
      'Produce the deployment setup for this project.',
      '',
      '**Architecture:**',
      JSON.stringify(state.architecture, null, 2),
      '',
      '**Backend (summary, dependencies, run instructions, file paths):**',
      JSON.stringify(
        {
          summary: backend.summary,
          dependencies: backend.dependencies,
          run_instructions: backend.run_instructions,
          files: Array.isArray(backend.files)
            ? (backend.files as Array<{ path: string }>).map((f) => f.path)
            : [],
        },
        null,
        2
      ),
      '',
      '**Frontend (summary, dependencies, run instructions, file paths):**',
      JSON.stringify(
        {
          summary: frontend.summary,
          dependencies: frontend.dependencies,
          run_instructions: frontend.run_instructions,
          files: Array.isArray(frontend.files)
            ? (frontend.files as Array<{ path: string }>).map((f) => f.path)
            : [],
        },
        null,
        2
      ),
      '',
      'Note: backend files live under backend/, frontend files under frontend/, and your files under infra/ ' +
        'in the project workspace. Output the file list (path + full content), dependencies (if any), and ' +
        'step-by-step run instructions.',
    ].join('\n');

    return this.runJsonStage('infra', SYSTEM_PROMPT, user, INFRA_SCHEMA, 'low');
  }
}
