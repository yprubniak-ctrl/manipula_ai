/**
 * Default agent registrations for the pipeline.
 */

import { AgentRegistry } from './registry';
import { IdeaAgent } from './idea-agent';
import { ArchAgent } from './arch-agent';
import { BackendAgent } from './backend-agent';
import { FrontendAgent } from './frontend-agent';
import { QAAgent } from './qa-agent';
import { DeployAgent } from './deploy-agent';

/** Registers every stage agent under the agentName used in PIPELINE. */
export function registerDefaultAgents(registry: AgentRegistry): void {
  registry.registerClass('IdeaAgent', IdeaAgent);
  registry.registerClass('ArchAgent', ArchAgent);
  registry.registerClass('BackendAgent', BackendAgent);
  registry.registerClass('FrontendAgent', FrontendAgent);
  registry.registerClass('QAAgent', QAAgent);
  registry.registerClass('DeployAgent', DeployAgent);
}
