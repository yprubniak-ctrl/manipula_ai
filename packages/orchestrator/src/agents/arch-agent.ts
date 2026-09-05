/**
 * ArchAgent — ARCHITECTING stage. Designs the system architecture from the
 * product spec, written to the `architecture` state key.
 */

import { OrchestratorProjectState, AgentResponse } from '@manipula/shared';
import { JsonStageAgent } from './json-stage-agent';

const SYSTEM_PROMPT = `You are a senior software architect. You design pragmatic, buildable architectures for MVPs.

Your architectures are:
- As simple as the spec allows — a single deployable service unless the spec clearly demands more
- Built on widely-used, boring technology
- Specific: concrete endpoints, concrete entities, concrete technology choices
- Sized for a small team to implement quickly`;

export const ARCHITECTURE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'pattern', 'components', 'tech_stack', 'data_model', 'api_endpoints'],
  properties: {
    summary: { type: 'string' },
    pattern: { type: 'string', description: 'e.g. monolith, client-server' },
    components: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'purpose', 'tech'],
        properties: {
          name: { type: 'string' },
          purpose: { type: 'string' },
          tech: { type: 'string' },
        },
      },
    },
    tech_stack: {
      type: 'object',
      additionalProperties: false,
      required: ['backend', 'frontend', 'database'],
      properties: {
        backend: {
          type: 'object',
          additionalProperties: false,
          required: ['language', 'framework'],
          properties: {
            language: { type: 'string' },
            framework: { type: 'string' },
          },
        },
        frontend: {
          type: 'object',
          additionalProperties: false,
          required: ['framework'],
          properties: { framework: { type: 'string' } },
        },
        database: {
          type: 'object',
          additionalProperties: false,
          required: ['type'],
          properties: { type: { type: 'string' } },
        },
      },
    },
    data_model: {
      type: 'object',
      additionalProperties: false,
      required: ['entities'],
      properties: {
        entities: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'fields'],
            properties: {
              name: { type: 'string' },
              fields: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['name', 'type'],
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    api_endpoints: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['method', 'path', 'description'],
        properties: {
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
          path: { type: 'string' },
          description: { type: 'string' },
        },
      },
    },
  },
};

export class ArchAgent extends JsonStageAgent {
  readonly OWNED_KEYS = ['architecture'];

  async execute(state: OrchestratorProjectState): Promise<AgentResponse> {
    const user = [
      'Design the architecture for this specified product:',
      '',
      '**Product specification:**',
      JSON.stringify(state.spec, null, 2),
      '',
      'Cover: overall pattern, components, tech stack (backend language/framework, frontend framework, database), ' +
        'data model entities with fields, and the concrete REST API endpoints the must-have features need.',
    ].join('\n');

    return this.runJsonStage('architecture', SYSTEM_PROMPT, user, ARCHITECTURE_SCHEMA, 'high');
  }
}
