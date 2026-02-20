import {
  BaseAgent,
  AIModelClient,
  createArtifact,
  parseJSONSafely,
} from '@manipula/agent-sdk';
import { createStatePatch } from '@manipula/state-manager';
import { AgentType, AgentInput, AgentOutput } from '@manipula/shared';

// ============================================================================
// Product Agent
// ============================================================================

export class ProductAgent extends BaseAgent {
  private aiClient: AIModelClient;

  constructor(config: {
    openai_key?: string;
    anthropic_key?: string;
  }) {
    super(AgentType.PRODUCT);
    this.aiClient = new AIModelClient(config);
  }

  /**
   * Execute PRD generation from a raw product idea
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    try {
      this.validateInput(input);

      const requirements = input.state.metadata?.requirements;
      if (!requirements) {
        return this.createErrorOutput('Missing requirements in project metadata');
      }

      // Generate PRD using AI
      const prdResult = await this.generatePRD(requirements);

      // Create artifact
      const artifacts = [
        createArtifact(
          'file',
          'docs/PRD.json',
          JSON.stringify(prdResult.prd, null, 2)
        ),
      ];

      // Create state patch
      const patches = [
        createStatePatch('specification.prd', 'set', prdResult.prd),
      ];

      return this.createSuccessOutput(patches, artifacts, prdResult.cost_usd);
    } catch (error: any) {
      return this.createErrorOutput(error.message);
    }
  }

  /**
   * Generate Product Requirements Document from raw idea
   */
  private async generatePRD(requirements: any): Promise<{
    prd: any;
    cost_usd: number;
  }> {
    const prompt = this.buildPRDPrompt(requirements);

    const result = await this.aiClient.generateText({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      system: PRODUCT_AGENT_SYSTEM_PROMPT,
      prompt,
      max_tokens: 8000,
    });

    const prdData = parseJSONSafely(result.text);
    if (!prdData) {
      throw new Error('Failed to parse PRD JSON from AI response');
    }

    return {
      prd: prdData,
      cost_usd: result.cost_usd,
    };
  }

  // ============================================================================
  // Prompt Builder
  // ============================================================================

  private buildPRDPrompt(requirements: any): string {
    const ideaParts: string[] = [];

    if (requirements.name) {
      ideaParts.push(`Product name: ${requirements.name}`);
    }
    if (requirements.description) {
      ideaParts.push(`Description: ${requirements.description}`);
    }
    if (requirements.requirements?.length > 0) {
      ideaParts.push(
        `Requirements:\n${requirements.requirements
          .map((r: string, i: number) => `${i + 1}. ${r}`)
          .join('\n')}`
      );
    }

    const constraintParts: string[] = [];
    if (requirements.constraints?.budget_usd) {
      constraintParts.push(`Budget: $${requirements.constraints.budget_usd}`);
    }
    if (requirements.constraints?.timeline_days) {
      constraintParts.push(
        `Timeline: ${requirements.constraints.timeline_days} days`
      );
    }
    if (requirements.constraints?.team_size) {
      constraintParts.push(
        `Team size: ${requirements.constraints.team_size}`
      );
    }

    const constraintsSection =
      constraintParts.length > 0
        ? `\n\nKnown constraints:\n${constraintParts.join('\n')}`
        : '';

    return `Raw product idea:

${ideaParts.join('\n\n')}${constraintsSection}

Generate a Product Requirements Document as valid JSON matching this exact structure:

${JSON.stringify(PRD_OUTPUT_SCHEMA, null, 2)}`;
  }
}

// ============================================================================
// System Prompt
// ============================================================================

const PRODUCT_AGENT_SYSTEM_PROMPT = `You are a Product Agent operating inside an agentic AI platform for end-to-end software development.

Your task: Transform a raw product idea into a structured, execution-ready Product Requirements Document (PRD).

Your responsibilities:
- Define what the product is
- Define who it is for
- Define the problem it solves
- Define the value proposition
- Define MVP scope and boundaries
- Define success criteria

You must NOT:
- Propose technical architecture
- Choose technologies
- Design UI or screens
- Write code
- Describe implementation details

Rules:
- Do not ask questions
- Do not include explanations or commentary
- Do not use buzzwords or vague language
- If information is missing, make minimal reasonable assumptions and list them explicitly in the assumptions field
- Output must be valid JSON only
- Follow the exact output structure provided
- Do not add extra fields`;

// ============================================================================
// PRD Output Schema (used as a template in the prompt)
// ============================================================================

const PRD_OUTPUT_SCHEMA = {
  meta: {
    product_name: 'string',
    product_type: 'saas | service | internal_tool',
    product_stage: 'mvp',
    confidence_level: 'low | medium | high',
  },
  problem_statement: {
    core_problem: 'string',
    who_experiences_it: 'string',
    current_alternatives: ['string'],
    why_they_fail: ['string'],
  },
  target_users: [
    {
      role: 'string',
      job_to_be_done: 'string',
      pain_points: ['string'],
    },
  ],
  buyers_and_stakeholders: [
    {
      role: 'string',
      decision_power: 'buyer | influencer | stakeholder',
    },
  ],
  value_proposition: {
    primary_value: 'string',
    secondary_values: ['string'],
    differentiators: ['string'],
  },
  use_cases: [
    {
      name: 'string',
      trigger: 'string',
      successful_outcome: 'string',
    },
  ],
  features: [
    {
      name: 'string',
      description: 'string',
      priority: 'must | should | could',
    },
  ],
  mvp_scope: {
    included_features: ['string'],
    excluded_features: ['string'],
    explicitly_not_now: ['string'],
  },
  non_functional_requirements: {
    performance: 'string',
    scalability: 'string',
    security: 'string',
    reliability: 'string',
    compliance: 'string',
  },
  constraints: {
    budget: 'string',
    timeline: 'string',
    team: 'string',
  },
  assumptions: ['string'],
  success_metrics: [
    {
      metric: 'string',
      definition: 'string',
    },
  ],
};
