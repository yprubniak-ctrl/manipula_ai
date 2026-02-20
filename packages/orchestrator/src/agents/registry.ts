/**
 * Agent plugin registry — maps stage/agent names to agent factories.
 */

import { OrchestratorStage } from '@manipula/shared';
import { IAgent, IModelRouter, IBudgetController } from './interfaces';
import { BaseAgent } from './base-agent';

export type AgentFactory = (router: IModelRouter, budget: IBudgetController) => IAgent;

/**
 * Registry that maps stage names to agent factories.
 */
export class AgentRegistry {
  private readonly factories = new Map<string, AgentFactory>();

  register(name: string, factory: AgentFactory): void {
    this.factories.set(name, factory);
  }

  registerClass(
    name: string,
    AgentClass: new (router: IModelRouter, budget: IBudgetController) => BaseAgent
  ): void {
    this.factories.set(name, (router, budget) => new AgentClass(router, budget));
  }

  resolve(stage: OrchestratorStage | string, router: IModelRouter, budget: IBudgetController): IAgent {
    const factory = this.factories.get(stage);
    if (!factory) {
      throw new Error(`No agent registered for stage: ${stage}`);
    }
    return factory(router, budget);
  }

  has(stage: OrchestratorStage | string): boolean {
    return this.factories.has(stage);
  }

  listRegistered(): string[] {
    return Array.from(this.factories.keys());
  }
}

export const agentRegistry = new AgentRegistry();
