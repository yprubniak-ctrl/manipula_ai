import {
  BaseAgent,
  AIModelClient,
  createArtifact,
  parseJSONSafely,
} from '@manipula/agent-sdk';
import {
  AgentType,
  AgentInput,
  AgentOutput,
  ProjectPhase,
} from '@manipula/shared';
import { createStatePatch } from '@manipula/state-manager';

// ============================================================================
// Idea/Specification Agent
// ============================================================================

export class IdeaSpecAgent extends BaseAgent {
  private aiClient: AIModelClient;

  constructor(config: {
    openai_key?: string;
    anthropic_key?: string;
  }) {
    super(AgentType.IDEA_SPEC);
    this.aiClient = new AIModelClient(config);
  }

  /**
   * Execute specification generation
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

      // Generate technical specification
      const techSpecResult = await this.generateTechnicalSpec(prdResult.prd);

      // Create artifacts
      const artifacts = [
        createArtifact('file', 'docs/PRD.md', prdResult.prd.markdown),
        createArtifact(
          'file',
          'docs/TECHNICAL_SPEC.md',
          techSpecResult.spec.markdown
        ),
        createArtifact(
          'file',
          'docs/ARCHITECTURE.md',
          techSpecResult.spec.architecture
        ),
      ];

      // Create state patches
      const patches = [
        createStatePatch('specification.prd', 'set', prdResult.prd),
        createStatePatch('specification.technical', 'set', techSpecResult.spec),
        createStatePatch('phase', 'set', ProjectPhase.BACKEND_DEVELOPMENT),
      ];

      const totalCost = prdResult.cost_usd + techSpecResult.cost_usd;

      return this.createSuccessOutput(patches, artifacts, totalCost);
    } catch (error: any) {
      return this.createErrorOutput(error.message);
    }
  }

  /**
   * Generate Product Requirements Document
   */
  private async generatePRD(requirements: any): Promise<{
    prd: any;
    cost_usd: number;
  }> {
    const prompt = this.buildPRDPrompt(requirements);

    const result = await this.aiClient.generateText({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      system: PRD_SYSTEM_PROMPT,
      prompt,
      max_tokens: 8000,
    });

    const prdData = parseJSONSafely(result.text);
    if (!prdData) {
      throw new Error('Failed to parse PRD JSON from AI response');
    }

    return {
      prd: {
        ...prdData,
        markdown: this.formatPRDMarkdown(prdData),
      },
      cost_usd: result.cost_usd,
    };
  }

  /**
   * Generate Technical Specification
   */
  private async generateTechnicalSpec(prd: any): Promise<{
    spec: any;
    cost_usd: number;
  }> {
    const prompt = this.buildTechSpecPrompt(prd);

    const result = await this.aiClient.generateText({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      system: TECH_SPEC_SYSTEM_PROMPT,
      prompt,
      max_tokens: 8000,
    });

    const specData = parseJSONSafely(result.text);
    if (!specData) {
      throw new Error('Failed to parse technical spec JSON from AI response');
    }

    return {
      spec: {
        ...specData,
        markdown: this.formatTechSpecMarkdown(specData),
        architecture: this.formatArchitectureMarkdown(specData),
      },
      cost_usd: result.cost_usd,
    };
  }

  // ============================================================================
  // Prompt Builders
  // ============================================================================

  private buildPRDPrompt(requirements: any): string {
    return `
Generate a comprehensive Product Requirements Document (PRD) for the following project:

**Project Name:** ${requirements.name}
**Description:** ${requirements.description}

**Requirements:**
${requirements.requirements.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}

${requirements.tech_stack ? `**Preferred Tech Stack:**
- Backend: ${requirements.tech_stack.backend?.join(', ') || 'Not specified'}
- Frontend: ${requirements.tech_stack.frontend?.join(', ') || 'Not specified'}
- Database: ${requirements.tech_stack.database || 'Not specified'}
` : ''}

${requirements.constraints ? `**Constraints:**
- Budget: $${requirements.constraints.budget_usd || 'Not specified'}
- Timeline: ${requirements.constraints.timeline_days || 'Not specified'} days
- Team Size: ${requirements.constraints.team_size || 'Not specified'}
` : ''}

Generate a structured PRD with:
1. Executive Summary
2. Problem Statement
3. Goals & Objectives
4. User Personas
5. Features & Requirements (must-have vs nice-to-have)
6. User Stories
7. Success Metrics
8. Technical Constraints
9. Timeline & Milestones

Return ONLY valid JSON with this structure:
{
  "title": "string",
  "executive_summary": "string",
  "problem_statement": "string",
  "goals": ["string"],
  "user_personas": [{"name": "string", "description": "string", "needs": ["string"]}],
  "features": [{"name": "string", "description": "string", "priority": "must-have|nice-to-have", "user_stories": ["string"]}],
  "success_metrics": [{"metric": "string", "target": "string"}],
  "technical_constraints": ["string"],
  "timeline": {"total_weeks": number, "milestones": [{"name": "string", "week": number}]}
}
`;
  }

  private buildTechSpecPrompt(prd: any): string {
    return `
Based on this Product Requirements Document, generate a detailed Technical Specification:

**PRD Summary:**
${JSON.stringify(prd, null, 2)}

Generate a technical specification with:
1. System Architecture
2. Technology Stack (specific versions)
3. Database Schema
4. API Endpoints
5. Security Requirements
6. Performance Requirements
7. Third-party Integrations
8. Development Environment Setup
9. Deployment Strategy

Return ONLY valid JSON with this structure:
{
  "architecture": {
    "pattern": "string (e.g., microservices, monolith)",
    "components": [{"name": "string", "purpose": "string", "tech": "string"}]
  },
  "tech_stack": {
    "backend": {"language": "string", "framework": "string", "version": "string"},
    "frontend": {"framework": "string", "version": "string", "libraries": ["string"]},
    "database": {"type": "string", "version": "string"},
    "infrastructure": ["string"]
  },
  "database_schema": {
    "tables": [{"name": "string", "columns": [{"name": "string", "type": "string", "constraints": "string"}]}]
  },
  "api_endpoints": [{"method": "string", "path": "string", "description": "string", "auth": boolean}],
  "security": ["string"],
  "performance": {"targets": ["string"], "optimizations": ["string"]},
  "integrations": [{"service": "string", "purpose": "string"}],
  "deployment": {"strategy": "string", "platform": "string", "ci_cd": "string"}
}
`;
  }

  // ============================================================================
  // Markdown Formatters
  // ============================================================================

  private formatPRDMarkdown(prd: any): string {
    return `# ${prd.title}

## Executive Summary
${prd.executive_summary}

## Problem Statement
${prd.problem_statement}

## Goals & Objectives
${prd.goals.map((g: string) => `- ${g}`).join('\n')}

## User Personas
${prd.user_personas.map((p: any) => `
### ${p.name}
${p.description}

**Needs:**
${p.needs.map((n: string) => `- ${n}`).join('\n')}
`).join('\n')}

## Features & Requirements
${prd.features.map((f: any) => `
### ${f.name} (${f.priority})
${f.description}

**User Stories:**
${f.user_stories.map((s: string) => `- ${s}`).join('\n')}
`).join('\n')}

## Success Metrics
${prd.success_metrics.map((m: any) => `- **${m.metric}:** ${m.target}`).join('\n')}

## Technical Constraints
${prd.technical_constraints.map((c: string) => `- ${c}`).join('\n')}

## Timeline
**Total Duration:** ${prd.timeline.total_weeks} weeks

${prd.timeline.milestones.map((m: any) => `- **Week ${m.week}:** ${m.name}`).join('\n')}
`;
  }

  private formatTechSpecMarkdown(spec: any): string {
    return `# Technical Specification

## Technology Stack

### Backend
- Language: ${spec.tech_stack.backend.language}
- Framework: ${spec.tech_stack.backend.framework} ${spec.tech_stack.backend.version}

### Frontend
- Framework: ${spec.tech_stack.frontend.framework} ${spec.tech_stack.frontend.version}
- Libraries: ${spec.tech_stack.frontend.libraries.join(', ')}

### Database
- Type: ${spec.tech_stack.database.type}
- Version: ${spec.tech_stack.database.version}

### Infrastructure
${spec.tech_stack.infrastructure.map((i: string) => `- ${i}`).join('\n')}

## Database Schema
${spec.database_schema.tables.map((t: any) => `
### ${t.name}
${t.columns.map((c: any) => `- ${c.name}: ${c.type} ${c.constraints || ''}`).join('\n')}
`).join('\n')}

## API Endpoints
${spec.api_endpoints.map((e: any) => `- **${e.method}** \`${e.path}\` - ${e.description} ${e.auth ? '🔒' : ''}`).join('\n')}

## Security Requirements
${spec.security.map((s: string) => `- ${s}`).join('\n')}

## Performance Targets
${spec.performance.targets.map((t: string) => `- ${t}`).join('\n')}

**Optimizations:**
${spec.performance.optimizations.map((o: string) => `- ${o}`).join('\n')}

## Third-party Integrations
${spec.integrations.map((i: any) => `- **${i.service}:** ${i.purpose}`).join('\n')}

## Deployment
- Strategy: ${spec.deployment.strategy}
- Platform: ${spec.deployment.platform}
- CI/CD: ${spec.deployment.ci_cd}
`;
  }

  private formatArchitectureMarkdown(spec: any): string {
    return `# System Architecture

## Pattern
${spec.architecture.pattern}

## Components
${spec.architecture.components.map((c: any) => `
### ${c.name}
**Purpose:** ${c.purpose}
**Technology:** ${c.tech}
`).join('\n')}

## Architecture Diagram

\`\`\`
┌─────────────────────────────────────────────────────────┐
│                      Frontend                           │
│         (${spec.tech_stack.frontend.framework})                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    API Gateway                          │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴──────────┬─────────────┐
         ▼                      ▼             ▼
┌──────────────┐      ┌──────────────┐  ┌──────────────┐
│   Backend    │      │   Database   │  │    Cache     │
│   Services   │      │              │  │              │
└──────────────┘      └──────────────┘  └──────────────┘
\`\`\`
`;
  }
}

// ============================================================================
// Prompts
// ============================================================================

const PRD_SYSTEM_PROMPT = `You are an expert product manager and technical writer. Your role is to transform high-level product ideas into comprehensive, actionable Product Requirements Documents (PRDs).

Your PRDs should be:
- Clear and unambiguous
- Detailed enough for development teams
- Focused on user value and business outcomes
- Structured and well-organized
- Include specific acceptance criteria

Always return valid JSON matching the requested schema.`;

const TECH_SPEC_SYSTEM_PROMPT = `You are a senior software architect with expertise in system design, scalability, and modern development practices.

Your technical specifications should be:
- Detailed and implementable
- Based on industry best practices
- Scalable and maintainable
- Security-conscious
- Include specific technology versions and configurations

Always return valid JSON matching the requested schema.`;
