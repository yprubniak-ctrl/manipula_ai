/**
 * Default agent registrations for the pipeline.
 */

import { AgentRegistry } from './registry';
import { IdeaAgent } from './idea-agent';

/**
 * Registers every implemented stage agent under the agentName used in PIPELINE.
 * Stages without an implementation yet (ArchAgent, BackendAgent, …) are left
 * unregistered — the pipeline stops with a clear error when it reaches them.
 */
export function registerDefaultAgents(registry: AgentRegistry): void {
  registry.registerClass('IdeaAgent', IdeaAgent);
}
