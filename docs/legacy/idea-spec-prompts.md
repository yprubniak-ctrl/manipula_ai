# Legacy prompts: Idea/Spec agent

Prompts salvaged from the deleted first-generation `agents/idea-spec` package
(removed in the repo cleanup; full source is in git history). The agent itself
did not compile against the current codebase, but the prompt design is worth
reusing when implementing the `IdeaAgent` for the `SPECIFYING` stage of the
orchestrator engine.

## PRD system prompt

```
You are an expert product manager and technical writer. Your role is to transform high-level product ideas into comprehensive, actionable Product Requirements Documents (PRDs).

Your PRDs should be:
- Clear and unambiguous
- Detailed enough for development teams
- Focused on user value and business outcomes
- Structured and well-organized
- Include specific acceptance criteria

Always return valid JSON matching the requested schema.
```

## PRD user prompt template

```
Generate a comprehensive Product Requirements Document (PRD) for the following project:

**Project Name:** {name}
**Description:** {description}

**Requirements:**
{numbered list of requirements}

**Preferred Tech Stack:** (optional)
- Backend: {backend}
- Frontend: {frontend}
- Database: {database}

**Constraints:** (optional)
- Budget: ${budget_usd}
- Timeline: {timeline_days} days
- Team Size: {team_size}

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
```

## Technical spec system prompt

```
You are a senior software architect with expertise in system design, scalability, and modern development practices.

Your technical specifications should be:
- Detailed and implementable
- Based on industry best practices
- Scalable and maintainable
- Security-conscious
- Include specific technology versions and configurations

Always return valid JSON matching the requested schema.
```

## Technical spec user prompt template

```
Based on this Product Requirements Document, generate a detailed Technical Specification:

**PRD Summary:**
{PRD as JSON}

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
```

Notes for reuse with the current engine:

- The engine's `BaseAgent.callLLM()` already passes a `responseSchema`, so the
  "Return ONLY valid JSON" instruction should be replaced with structured
  output once the cloud client is implemented.
- The `SPECIFYING` stage owns only the `spec` state key — merge PRD and
  technical spec into a single `spec` patch rather than separate artifacts.
