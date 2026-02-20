/**
 * QA issue router — routes QA issues to the appropriate agents for re-generation.
 */

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IssueTarget   = 'backend' | 'frontend' | 'both' | 'infra' | 'spec';

export interface QAIssue {
  id: string;
  severity: IssueSeverity;
  agent_target: IssueTarget;
  description: string;
  file_path?: string;
  suggested_fix?: string;
  resolved: boolean;
}

/**
 * Classifies and routes QA issues to determine which stages need re-execution.
 */
export class IssueRouter {
  stagesToRerun(issues: QAIssue[]): Set<string> {
    const stages = new Set<string>();
    for (const issue of issues) {
      if (issue.resolved) continue;
      switch (issue.agent_target) {
        case 'backend':  stages.add('BACKEND_GEN');  break;
        case 'frontend': stages.add('FRONTEND_GEN'); break;
        case 'both':     stages.add('BACKEND_GEN');  stages.add('FRONTEND_GEN'); break;
        case 'infra':    stages.add('DEPLOYING');    break;
        case 'spec':     stages.add('SPECIFYING');   break;
      }
    }
    return stages;
  }

  getCriticalIssues(issues: QAIssue[]): QAIssue[] {
    return issues.filter((i) => !i.resolved && i.severity === 'critical');
  }

  getBackendIssues(issues: QAIssue[]): QAIssue[] {
    return issues.filter((i) => !i.resolved && (i.agent_target === 'backend' || i.agent_target === 'both'));
  }

  getFrontendIssues(issues: QAIssue[]): QAIssue[] {
    return issues.filter((i) => !i.resolved && (i.agent_target === 'frontend' || i.agent_target === 'both'));
  }
}
