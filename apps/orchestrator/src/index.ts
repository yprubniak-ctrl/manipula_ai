import express from 'express';
import { Queue, Worker } from 'bull';
import { createLogger, format, transports } from 'winston';
import { stateManager } from '@manipula/state-manager';
import {
  AgentType,
  ProjectPhase,
  ExecutionStatus,
  createProjectState,
  createAgentExecution,
  ProjectRequirements,
} from '@manipula/shared';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// Logger Configuration
// ============================================================================

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});

// ============================================================================
// Orchestrator Class
// ============================================================================

export class Orchestrator {
  private agentQueue: Queue;
  private executionWorker: Worker;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    // Initialize Bull queue
    this.agentQueue = new Queue('agent-executions', redisUrl, {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });

    // Initialize worker
    this.executionWorker = new Worker(
      'agent-executions',
      async (job) => {
        return this.executeAgent(job.data);
      },
      {
        connection: {
          host: new URL(redisUrl).hostname,
          port: parseInt(new URL(redisUrl).port || '6379'),
        },
        concurrency: parseInt(process.env.MAX_CONCURRENT_AGENTS || '5'),
      }
    );

    this.setupWorkerHandlers();
  }

  /**
   * Initialize a new project and start orchestration
   */
  async initializeProject(requirements: ProjectRequirements): Promise<string> {
    logger.info('Initializing new project', { name: requirements.name });

    // Create initial project state
    const projectState = createProjectState(requirements);
    stateManager.initialize(projectState);

    // Queue first agent (Specification)
    await this.queueAgent(projectState.id, AgentType.IDEA_SPEC, {
      requirements,
    });

    logger.info('Project initialized', { projectId: projectState.id });
    return projectState.id;
  }

  /**
   * Queue an agent for execution
   */
  private async queueAgent(
    projectId: string,
    agentType: AgentType,
    input: Record<string, any>
  ): Promise<void> {
    const execution = createAgentExecution(agentType, input);
    const state = stateManager.getState(projectId);

    if (!state) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Add execution to state
    stateManager.applyPatches(projectId, [
      {
        path: 'executions',
        operation: 'push',
        value: execution,
      },
    ]);

    // Queue job
    await this.agentQueue.add(
      agentType,
      {
        projectId,
        executionId: execution.id,
        agentType,
        input,
      },
      {
        jobId: execution.id,
        priority: this.getAgentPriority(agentType),
      }
    );

    logger.info('Agent queued', { projectId, agentType, executionId: execution.id });
  }

  /**
   * Execute an agent
   */
  private async executeAgent(jobData: any): Promise<any> {
    const { projectId, executionId, agentType, input } = jobData;

    logger.info('Executing agent', { projectId, agentType, executionId });

    try {
      const state = stateManager.getState(projectId);
      if (!state) {
        throw new Error(`Project ${projectId} not found`);
      }

      // Update execution status to running
      const executionIndex = state.executions.findIndex((e) => e.id === executionId);
      if (executionIndex === -1) {
        throw new Error(`Execution ${executionId} not found`);
      }

      stateManager.applyPatches(projectId, [
        {
          path: `executions[${executionIndex}].status`,
          operation: 'set',
          value: ExecutionStatus.RUNNING,
        },
      ]);

      // Call agent runtime (this would be an HTTP call to the agents-runtime service)
      const agentResult = await this.callAgentRuntime(projectId, agentType, input);

      // Apply patches from agent
      if (agentResult.patches && agentResult.patches.length > 0) {
        stateManager.applyPatches(projectId, agentResult.patches);
      }

      // Update execution with results
      const updatedState = stateManager.getState(projectId);
      const updatedExecutionIndex = updatedState!.executions.findIndex(
        (e) => e.id === executionId
      );

      stateManager.applyPatches(projectId, [
        {
          path: `executions[${updatedExecutionIndex}]`,
          operation: 'merge',
          value: {
            status: agentResult.status,
            output: agentResult,
            completed_at: new Date(),
            cost_usd: agentResult.cost_usd || 0,
          },
        },
      ]);

      // Determine next agent based on phase
      await this.scheduleNextAgent(projectId);

      logger.info('Agent execution completed', {
        projectId,
        agentType,
        executionId,
        status: agentResult.status,
      });

      return agentResult;
    } catch (error: any) {
      logger.error('Agent execution failed', {
        projectId,
        agentType,
        executionId,
        error: error.message,
      });

      // Update execution with error
      const state = stateManager.getState(projectId);
      if (state) {
        const executionIndex = state.executions.findIndex((e) => e.id === executionId);
        if (executionIndex !== -1) {
          stateManager.applyPatches(projectId, [
            {
              path: `executions[${executionIndex}]`,
              operation: 'merge',
              value: {
                status: ExecutionStatus.FAILED,
                error: error.message,
                completed_at: new Date(),
              },
            },
          ]);
        }
      }

      throw error;
    }
  }

  /**
   * Schedule next agent based on current project phase
   */
  private async scheduleNextAgent(projectId: string): Promise<void> {
    const state = stateManager.getState(projectId);
    if (!state) return;

    const phaseTransitions: Record<ProjectPhase, AgentType | null> = {
      [ProjectPhase.SPECIFICATION]: AgentType.BACKEND_GEN,
      [ProjectPhase.BACKEND_DEVELOPMENT]: AgentType.FRONTEND_GEN,
      [ProjectPhase.FRONTEND_DEVELOPMENT]: AgentType.QA_VALIDATION,
      [ProjectPhase.QA_TESTING]: AgentType.DEVOPS,
      [ProjectPhase.DEPLOYMENT]: null,
      [ProjectPhase.COMPLETED]: null,
      [ProjectPhase.FAILED]: null,
    };

    const nextAgentType = phaseTransitions[state.phase];

    if (nextAgentType) {
      // Update phase
      const newPhase = this.getPhaseForAgent(nextAgentType);
      stateManager.applyPatches(projectId, [
        {
          path: 'phase',
          operation: 'set',
          value: newPhase,
        },
      ]);

      // Queue next agent
      await this.queueAgent(projectId, nextAgentType, {
        projectId,
        previousPhase: state.phase,
      });
    } else {
      // Project completed
      stateManager.applyPatches(projectId, [
        {
          path: 'phase',
          operation: 'set',
          value: ProjectPhase.COMPLETED,
        },
      ]);

      logger.info('Project completed', { projectId });
    }
  }

  /**
   * Call agent runtime service
   */
  private async callAgentRuntime(
    projectId: string,
    agentType: AgentType,
    input: Record<string, any>
  ): Promise<any> {
    const agentsRuntimeUrl =
      process.env.AGENTS_RUNTIME_URL || 'http://localhost:5000';
    const state = stateManager.getState(projectId);

    // This would be an actual HTTP call in production
    // For now, return mock response
    return {
      status: ExecutionStatus.COMPLETED,
      patches: [],
      artifacts: [],
      cost_usd: 0,
    };
  }

  /**
   * Get agent priority
   */
  private getAgentPriority(agentType: AgentType): number {
    const priorities = {
      [AgentType.IDEA_SPEC]: 1,
      [AgentType.BACKEND_GEN]: 2,
      [AgentType.FRONTEND_GEN]: 3,
      [AgentType.QA_VALIDATION]: 4,
      [AgentType.DEVOPS]: 5,
    };
    return priorities[agentType] || 10;
  }

  /**
   * Get phase for agent type
   */
  private getPhaseForAgent(agentType: AgentType): ProjectPhase {
    const mapping = {
      [AgentType.IDEA_SPEC]: ProjectPhase.SPECIFICATION,
      [AgentType.BACKEND_GEN]: ProjectPhase.BACKEND_DEVELOPMENT,
      [AgentType.FRONTEND_GEN]: ProjectPhase.FRONTEND_DEVELOPMENT,
      [AgentType.QA_VALIDATION]: ProjectPhase.QA_TESTING,
      [AgentType.DEVOPS]: ProjectPhase.DEPLOYMENT,
    };
    return mapping[agentType] || ProjectPhase.SPECIFICATION;
  }

  /**
   * Setup worker event handlers
   */
  private setupWorkerHandlers(): void {
    this.executionWorker.on('completed', (job) => {
      logger.info('Job completed', { jobId: job.id });
    });

    this.executionWorker.on('failed', (job, err) => {
      logger.error('Job failed', { jobId: job?.id, error: err.message });
    });

    this.executionWorker.on('error', (err) => {
      logger.error('Worker error', { error: err.message });
    });
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down orchestrator...');
    await this.agentQueue.close();
    await this.executionWorker.close();
    logger.info('Orchestrator shut down');
  }
}

// ============================================================================
// HTTP Server
// ============================================================================

const app = express();
app.use(express.json());

const orchestrator = new Orchestrator();

app.post('/projects', async (req, res) => {
  try {
    const projectId = await orchestrator.initializeProject(req.body);
    res.json({ projectId });
  } catch (error: any) {
    logger.error('Failed to initialize project', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

app.get('/projects/:projectId/status', (req, res) => {
  try {
    const state = stateManager.getState(req.params.projectId);
    if (!state) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(state);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const PORT = parseInt(process.env.ORCHESTRATOR_PORT || '4000');

app.listen(PORT, () => {
  logger.info(`Orchestrator listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await orchestrator.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await orchestrator.shutdown();
  process.exit(0);
});
