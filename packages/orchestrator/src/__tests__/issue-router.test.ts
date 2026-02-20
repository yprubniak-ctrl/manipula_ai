import { IssueRouter, QAIssue } from '../qa/issue-router';

function makeIssue(overrides: Partial<QAIssue> = {}): QAIssue {
  return { id: 'issue_001', severity: 'medium', agent_target: 'backend', description: 'Test issue', resolved: false, ...overrides };
}

describe('IssueRouter', () => {
  let router: IssueRouter;
  beforeEach(() => { router = new IssueRouter(); });

  test('stagesToRerun includes BACKEND_GEN for backend issues', () => {
    const stages = router.stagesToRerun([makeIssue({ agent_target: 'backend' })]);
    expect(stages.has('BACKEND_GEN')).toBe(true);
    expect(stages.has('FRONTEND_GEN')).toBe(false);
  });

  test('stagesToRerun includes FRONTEND_GEN for frontend issues', () => {
    expect(router.stagesToRerun([makeIssue({ agent_target: 'frontend' })]).has('FRONTEND_GEN')).toBe(true);
  });

  test('stagesToRerun includes both for "both" target', () => {
    const stages = router.stagesToRerun([makeIssue({ agent_target: 'both' })]);
    expect(stages.has('BACKEND_GEN')).toBe(true);
    expect(stages.has('FRONTEND_GEN')).toBe(true);
  });

  test('resolved issues are ignored', () => {
    expect(router.stagesToRerun([makeIssue({ agent_target: 'backend', resolved: true })]).size).toBe(0);
  });

  test('getCriticalIssues returns only critical unresolved issues', () => {
    const issues = [
      makeIssue({ id: '1', severity: 'critical' }),
      makeIssue({ id: '2', severity: 'high' }),
      makeIssue({ id: '3', severity: 'critical', resolved: true }),
    ];
    const critical = router.getCriticalIssues(issues);
    expect(critical.length).toBe(1);
    expect(critical[0].id).toBe('1');
  });

  test('getBackendIssues returns backend and both issues', () => {
    const issues = [
      makeIssue({ id: '1', agent_target: 'backend' }),
      makeIssue({ id: '2', agent_target: 'both' }),
      makeIssue({ id: '3', agent_target: 'frontend' }),
    ];
    const backend = router.getBackendIssues(issues);
    expect(backend.length).toBe(2);
    expect(backend.map((i) => i.id)).toEqual(expect.arrayContaining(['1', '2']));
  });
});
