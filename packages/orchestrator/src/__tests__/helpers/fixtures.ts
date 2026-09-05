export const SPEC_FIXTURE = {
  title: 'Team Todo',
  summary: 'Offline-first todo app for remote teams',
  problem_statement: 'Remote teams lose track of tasks',
  goals: ['Ship an MVP'],
  target_users: [{ name: 'Remote worker', description: 'Works async', needs: ['offline sync'] }],
  features: [
    {
      name: 'Task list',
      description: 'CRUD for tasks',
      priority: 'must-have',
      user_stories: ['As a user I can add a task'],
    },
  ],
  success_metrics: [{ metric: 'WAU', target: '1000' }],
  assumptions: ['Mobile-first'],
  open_questions: [],
};

export const ARCH_FIXTURE = {
  summary: 'Single Express service with a React frontend',
  pattern: 'monolith',
  components: [{ name: 'api', purpose: 'REST API', tech: 'Express' }],
  tech_stack: {
    backend: { language: 'TypeScript', framework: 'Express' },
    frontend: { framework: 'React' },
    database: { type: 'sqlite' },
  },
  data_model: {
    entities: [{ name: 'Task', fields: [{ name: 'id', type: 'string' }] }],
  },
  api_endpoints: [{ method: 'GET', path: '/tasks', description: 'List tasks' }],
};

export const BACKEND_FIXTURE = {
  summary: 'Express API with sqlite',
  dependencies: ['express'],
  files: [
    { path: 'package.json', content: '{"name":"backend"}' },
    { path: 'src/index.js', content: 'console.log("api")' },
  ],
  run_instructions: 'npm install && npm start',
};

export const FRONTEND_FIXTURE = {
  summary: 'React SPA',
  dependencies: ['react'],
  files: [{ path: 'index.html', content: '<html></html>' }],
  run_instructions: 'npm install && npm run dev',
};

export const QA_PASS_FIXTURE = {
  passed: true,
  summary: 'All must-have features implemented',
  issues: [],
};

export const QA_FAIL_BACKEND_FIXTURE = {
  passed: false,
  summary: 'Backend is missing the list endpoint',
  issues: [
    {
      id: 'QA-1',
      severity: 'high',
      agent_target: 'backend',
      description: 'GET /tasks is not implemented',
      resolved: false,
    },
  ],
};

export const INFRA_FIXTURE = {
  summary: 'Dockerized services',
  dependencies: [],
  files: [
    { path: 'Dockerfile', content: 'FROM node:20' },
    { path: 'docker-compose.yml', content: 'services: {}' },
  ],
  run_instructions: 'docker compose up',
};
