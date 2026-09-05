/**
 * QAAgent — QA_VALIDATION stage. Reviews the generated code against the spec
 * and architecture, written to the `qa` state key. The QA feedback loop
 * routes reported issues back to the responsible stage via `agent_target`.
 */

import { OrchestratorProjectState, AgentResponse } from '@manipula/shared';
import { JsonStageAgent } from './json-stage-agent';

const SYSTEM_PROMPT = `You are a rigorous QA engineer reviewing generated code before release.

How you judge:
- Check that every must-have feature from the spec is actually implemented
- Check the backend and frontend agree: same endpoints, same data shapes
- Check the run instructions plausibly work with the given files and dependencies
- Set passed=true ONLY when there are no critical or high severity issues
- Report each problem as one issue with the correct agent_target so it can be routed for a fix`;

export const QA_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['passed', 'summary', 'issues'],
  properties: {
    passed: { type: 'boolean' },
    summary: { type: 'string' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'severity', 'agent_target', 'description', 'resolved'],
        properties: {
          id: { type: 'string', description: 'Short unique id, e.g. QA-1' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          agent_target: { type: 'string', enum: ['backend', 'frontend', 'both', 'infra', 'spec'] },
          description: { type: 'string' },
          file_path: { type: 'string' },
          suggested_fix: { type: 'string' },
          resolved: { type: 'boolean', description: 'Always false for newly reported issues' },
        },
      },
    },
  },
};

export class QAAgent extends JsonStageAgent {
  readonly OWNED_KEYS = ['qa'];

  async execute(state: OrchestratorProjectState): Promise<AgentResponse> {
    const user = [
      'Review this generated project.',
      '',
      '**Product specification:**',
      JSON.stringify(state.spec, null, 2),
      '',
      '**Architecture:**',
      JSON.stringify(state.architecture, null, 2),
      '',
      '**Generated backend:**',
      JSON.stringify(state.backend, null, 2),
      '',
      '**Generated frontend:**',
      JSON.stringify(state.frontend, null, 2),
      '',
      'Return your verdict (passed), a short summary, and the list of issues found.',
    ].join('\n');

    return this.runJsonStage('qa', SYSTEM_PROMPT, user, QA_SCHEMA, 'medium');
  }
}
