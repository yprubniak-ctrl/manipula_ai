# Manipula API Reference

Base URL: `https://api.manipula.dev` (production) or `http://localhost:3000` (local)

## Authentication

All API requests require authentication using a JWT token in the `Authorization` header:

```
Authorization: Bearer <your_token>
```

### Get API Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

## Projects

### Create Project

Initialize a new project with requirements.

```http
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My SaaS App",
  "description": "A project management tool for remote teams",
  "requirements": [
    "User authentication and authorization",
    "Real-time collaboration features",
    "Payment integration with Stripe",
    "Analytics dashboard"
  ],
  "tech_stack": {
    "backend": ["Node.js", "Express", "PostgreSQL"],
    "frontend": ["React", "Next.js", "TailwindCSS"],
    "database": "PostgreSQL",
    "deployment": "Vercel + AWS"
  },
  "constraints": {
    "budget_usd": 500,
    "timeline_days": 14,
    "team_size": 1
  }
}
```

**Response:**
```json
{
  "project_id": "proj_xyz789",
  "status": "initializing",
  "created_at": "2025-02-12T10:30:00Z",
  "estimated_cost_usd": 45.50,
  "estimated_duration_minutes": 120
}
```

### Get Project Status

Retrieve current status and progress of a project.

```http
GET /api/projects/:projectId/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "proj_xyz789",
  "name": "My SaaS App",
  "phase": "backend_development",
  "version": 3,
  "progress": {
    "current_agent": "backend-gen",
    "completion_percentage": 45,
    "estimated_time_remaining_minutes": 35
  },
  "executions": [
    {
      "id": "exec_abc123",
      "agent_type": "idea-spec",
      "status": "completed",
      "started_at": "2025-02-12T10:30:00Z",
      "completed_at": "2025-02-12T10:35:00Z",
      "cost_usd": 3.25
    },
    {
      "id": "exec_def456",
      "agent_type": "backend-gen",
      "status": "running",
      "started_at": "2025-02-12T10:36:00Z",
      "cost_usd": 8.75
    }
  ],
  "total_cost_usd": 11.50,
  "created_at": "2025-02-12T10:30:00Z",
  "updated_at": "2025-02-12T10:40:00Z"
}
```

### Get Project Details

Get complete project state including specifications, code, and artifacts.

```http
GET /api/projects/:projectId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "proj_xyz789",
  "name": "My SaaS App",
  "phase": "backend_development",
  "version": 3,
  "specification": {
    "prd": {
      "title": "My SaaS App - Product Requirements",
      "executive_summary": "...",
      "features": [...]
    },
    "technical": {
      "architecture": {...},
      "tech_stack": {...},
      "database_schema": {...}
    }
  },
  "backend": {
    "architecture": {...},
    "api": {
      "endpoints": [...]
    },
    "database": {
      "tables": [...]
    }
  },
  "artifacts": [
    {
      "id": "artifact_1",
      "type": "file",
      "path": "docs/PRD.md",
      "size_bytes": 15234,
      "url": "/api/projects/proj_xyz789/artifacts/artifact_1"
    }
  ],
  "metadata": {...}
}
```

### Get Execution Logs

Retrieve detailed logs for project execution.

```http
GET /api/projects/:projectId/logs
Authorization: Bearer <token>

Query Parameters:
  - agent_type (optional): Filter by agent type
  - status (optional): Filter by execution status
  - limit (optional): Number of logs to return (default: 100)
  - offset (optional): Pagination offset
```

**Response:**
```json
{
  "logs": [
    {
      "timestamp": "2025-02-12T10:30:15Z",
      "level": "info",
      "agent": "idea-spec",
      "execution_id": "exec_abc123",
      "message": "Starting specification generation",
      "metadata": {}
    },
    {
      "timestamp": "2025-02-12T10:32:45Z",
      "level": "info",
      "agent": "idea-spec",
      "execution_id": "exec_abc123",
      "message": "Generated PRD with 12 features",
      "metadata": {
        "features_count": 12,
        "pages": 8
      }
    }
  ],
  "total": 45,
  "limit": 100,
  "offset": 0
}
```

### Download Artifacts

Download generated code and documentation.

```http
GET /api/projects/:projectId/artifacts/:artifactId
Authorization: Bearer <token>
```

**Response:** Binary file download

Or download all artifacts as ZIP:

```http
GET /api/projects/:projectId/download
Authorization: Bearer <token>
```

**Response:** ZIP file containing all project artifacts

### Rollback Project

Revert project to a previous version.

```http
POST /api/projects/:projectId/rollback
Authorization: Bearer <token>
Content-Type: application/json

{
  "version": 2,
  "reason": "Backend generation produced incorrect API structure"
}
```

**Response:**
```json
{
  "success": true,
  "project_id": "proj_xyz789",
  "previous_version": 3,
  "current_version": 2,
  "rolled_back_at": "2025-02-12T11:00:00Z"
}
```

### Pause/Resume Project

Pause an ongoing project execution.

```http
POST /api/projects/:projectId/pause
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "project_id": "proj_xyz789",
  "status": "paused",
  "paused_at": "2025-02-12T11:05:00Z"
}
```

Resume a paused project:

```http
POST /api/projects/:projectId/resume
Authorization: Bearer <token>
```

### Delete Project

Permanently delete a project and all associated data.

```http
DELETE /api/projects/:projectId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "project_id": "proj_xyz789",
  "deleted_at": "2025-02-12T11:10:00Z"
}
```

## Agents

### List Available Agents

Get information about available agents and their capabilities.

```http
GET /api/agents
Authorization: Bearer <token>
```

**Response:**
```json
{
  "agents": [
    {
      "type": "idea-spec",
      "name": "Idea & Specification Agent",
      "description": "Transforms product ideas into PRDs and technical specs",
      "version": "1.0.0",
      "estimated_cost_range": "$2-5",
      "estimated_duration_minutes": "5-10"
    },
    {
      "type": "backend-gen",
      "name": "Backend Generation Agent",
      "description": "Generates backend API, database schema, and business logic",
      "version": "1.0.0",
      "estimated_cost_range": "$10-25",
      "estimated_duration_minutes": "15-30"
    }
  ]
}
```

### Get Agent Details

Get detailed information about a specific agent.

```http
GET /api/agents/:agentType
Authorization: Bearer <token>
```

**Response:**
```json
{
  "type": "backend-gen",
  "name": "Backend Generation Agent",
  "description": "Generates complete backend code including APIs, database, authentication",
  "version": "1.0.0",
  "capabilities": [
    "REST API generation",
    "GraphQL API generation",
    "Database schema design",
    "Authentication/Authorization",
    "Business logic implementation"
  ],
  "supported_tech_stacks": {
    "languages": ["Node.js", "Python", "Go"],
    "frameworks": ["Express", "Fastify", "Django", "FastAPI", "Gin"],
    "databases": ["PostgreSQL", "MySQL", "MongoDB"]
  },
  "configuration_options": {...}
}
```

## Webhooks

### Register Webhook

Register a webhook to receive real-time updates about project events.

```http
POST /api/webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://yourapp.com/webhooks/manipula",
  "events": [
    "project.created",
    "project.phase_changed",
    "project.completed",
    "project.failed",
    "agent.started",
    "agent.completed",
    "agent.failed"
  ],
  "secret": "your_webhook_secret"
}
```

**Response:**
```json
{
  "webhook_id": "webhook_abc123",
  "url": "https://yourapp.com/webhooks/manipula",
  "events": [...],
  "created_at": "2025-02-12T11:15:00Z"
}
```

### Webhook Payload Example

```json
{
  "event": "agent.completed",
  "timestamp": "2025-02-12T11:20:00Z",
  "data": {
    "project_id": "proj_xyz789",
    "execution_id": "exec_abc123",
    "agent_type": "backend-gen",
    "status": "completed",
    "cost_usd": 12.50,
    "duration_seconds": 180
  },
  "signature": "sha256=..."
}
```

## Analytics

### Get Usage Stats

Retrieve usage statistics for your account.

```http
GET /api/analytics/usage
Authorization: Bearer <token>

Query Parameters:
  - start_date: ISO date (e.g., 2025-02-01)
  - end_date: ISO date (e.g., 2025-02-12)
```

**Response:**
```json
{
  "period": {
    "start": "2025-02-01T00:00:00Z",
    "end": "2025-02-12T23:59:59Z"
  },
  "projects": {
    "total": 15,
    "completed": 12,
    "failed": 2,
    "in_progress": 1
  },
  "costs": {
    "total_usd": 567.50,
    "by_agent": {
      "idea-spec": 45.00,
      "backend-gen": 285.00,
      "frontend-gen": 185.00,
      "qa-validation": 32.50,
      "devops": 20.00
    }
  },
  "executions": {
    "total": 75,
    "successful": 68,
    "failed": 7,
    "average_duration_minutes": 18.5
  }
}
```

## Rate Limits

All API endpoints are rate-limited:

- **Free tier**: 10 requests per minute, 100 per hour
- **Pro tier**: 60 requests per minute, 1000 per hour
- **Enterprise**: Custom limits

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1644673200
```

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Project not found",
    "details": {
      "project_id": "proj_xyz789"
    }
  }
}
```

### Common Error Codes

- `AUTHENTICATION_REQUIRED` (401)
- `INSUFFICIENT_PERMISSIONS` (403)
- `RESOURCE_NOT_FOUND` (404)
- `VALIDATION_ERROR` (400)
- `RATE_LIMIT_EXCEEDED` (429)
- `INTERNAL_SERVER_ERROR` (500)
- `COST_LIMIT_EXCEEDED` (402)
- `AGENT_EXECUTION_FAILED` (500)

## SDKs

Official SDKs available:

- **JavaScript/TypeScript**: `npm install @manipula/sdk`
- **Python**: `pip install manipula-sdk`
- **Go**: `go get github.com/manipula/sdk-go`

Example using JavaScript SDK:

```javascript
import { Manipula } from '@manipula/sdk';

const client = new Manipula({
  apiKey: process.env.MANIPULA_API_KEY
});

const project = await client.projects.create({
  name: 'My App',
  description: 'A todo list app',
  requirements: [
    'User authentication',
    'CRUD operations for todos',
    'Real-time sync'
  ]
});

console.log('Project created:', project.id);

// Monitor progress
const status = await client.projects.getStatus(project.id);
console.log('Phase:', status.phase);
console.log('Progress:', status.progress.completion_percentage);
```

## Support

- Documentation: https://docs.manipula.dev
- API Status: https://status.manipula.dev
- Support Email: support@manipula.dev
- Discord: https://discord.gg/manipula
