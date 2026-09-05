/**
 * IdeaAgent — SPECIFYING stage. Turns a raw idea into a structured product
 * specification written to the `spec` state key.
 */

import { OrchestratorProjectState, AgentResponse } from '@manipula/shared';
import { JsonStageAgent } from './json-stage-agent';

const SYSTEM_PROMPT = `You are an expert product manager and technical writer. You transform high-level product ideas into comprehensive, actionable product specifications.

Your specifications are:
- Clear and unambiguous
- Detailed enough for an architecture and development team to act on
- Focused on user value and business outcomes
- Honest about assumptions and open questions

Ground every part of the specification in the idea and constraints you are given; do not invent requirements that contradict them.`;

// Response schema for structured output — the shape of the `spec` state key.
export const SPEC_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'summary',
    'problem_statement',
    'goals',
    'target_users',
    'features',
    'success_metrics',
    'assumptions',
    'open_questions',
  ],
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    problem_statement: { type: 'string' },
    goals: { type: 'array', items: { type: 'string' } },
    target_users: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'description', 'needs'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          needs: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    features: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'description', 'priority', 'user_stories'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['must-have', 'nice-to-have'] },
          user_stories: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    success_metrics: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['metric', 'target'],
        properties: {
          metric: { type: 'string' },
          target: { type: 'string' },
        },
      },
    },
    assumptions: { type: 'array', items: { type: 'string' } },
    open_questions: { type: 'array', items: { type: 'string' } },
  },
};

export class IdeaAgent extends JsonStageAgent {
  readonly OWNED_KEYS = ['spec'];

  async execute(state: OrchestratorProjectState): Promise<AgentResponse> {
    const idea = state.inputs.raw_idea?.trim() ?? '';
    if (idea.length < 10) {
      return this.buildNeedsInfoResponse(
        'The raw idea is missing or too short to specify. Provide at least a sentence describing what should be built.'
      );
    }

    return this.runJsonStage(
      'spec',
      SYSTEM_PROMPT,
      this.buildUserPrompt(state.inputs),
      SPEC_SCHEMA,
      'medium'
    );
  }

  private buildUserPrompt(inputs: OrchestratorProjectState['inputs']): string {
    const sections = [
      `Produce a product specification for the following idea:\n\n**Idea:** ${inputs.raw_idea.trim()}`,
    ];

    if (inputs.constraints.length > 0) {
      sections.push(`**Constraints:**\n${inputs.constraints.map((c) => `- ${c}`).join('\n')}`);
    }

    if (inputs.target_users) {
      sections.push(`**Intended users:** ${inputs.target_users}`);
    }

    if (Object.keys(inputs.tech_preferences).length > 0) {
      sections.push(`**Tech preferences:**\n${JSON.stringify(inputs.tech_preferences, null, 2)}`);
    }

    sections.push(
      'Cover: executive summary, problem statement, goals, target user personas with their needs, ' +
        'features split into must-have and nice-to-have with user stories, measurable success metrics, ' +
        'the assumptions you made, and open questions that need a human decision.'
    );

    return sections.join('\n\n');
  }
}
