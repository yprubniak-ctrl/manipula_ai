#!/usr/bin/env node

/**
 * ===========================================
 * MANIPULA CLI - Command Line Interface
 * ===========================================
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import Table from 'cli-table3';
import { version } from '../package.json';

const program = new Command();

program
  .name('manipula')
  .description('Manipula - Agentic AI Platform for End-to-End Software Development')
  .version(version);

// ===========================================
// CREATE COMMAND
// ===========================================

program
  .command('create <idea>')
  .description('Create a new project from an idea')
  .option('-b, --budget <type>', 'Budget constraint (low, medium, high)', 'medium')
  .option('-t, --timeline <type>', 'Timeline constraint (urgent, normal, flexible)', 'normal')
  .option('-s, --stack <type>', 'Technology stack preference')
  .action(async (idea: string, options) => {
    const spinner = ora('Creating new project...').start();

    try {
      // Call API to create project
      const response = await fetch(`${getApiUrl()}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify({
          idea,
          constraints: {
            budget: options.budget,
            timeline: options.timeline,
          },
          preferences: {
            stack: options.stack,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const project = await response.json();
      spinner.succeed('Project created successfully!');

      console.log(chalk.bold('\nProject Details:'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.cyan('ID:'), project.id);
      console.log(chalk.cyan('Name:'), project.name);
      console.log(chalk.cyan('Status:'), getStatusColor(project.status));
      console.log(chalk.gray('─'.repeat(50)));

      console.log(chalk.green('\nNext steps:'));
      console.log(chalk.white(`  1. Watch progress: ${chalk.bold(`manipula status ${project.id}`)}`));
      console.log(chalk.white(`  2. View logs: ${chalk.bold(`manipula logs ${project.id}`)}`));
      console.log(chalk.white(`  3. Deploy: ${chalk.bold(`manipula deploy ${project.id}`)}`));
    } catch (error) {
      spinner.fail('Failed to create project');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ===========================================
// STATUS COMMAND
// ===========================================

program
  .command('status <projectId>')
  .description('Get project status')
  .option('-w, --watch', 'Watch mode - continuously update status')
  .action(async (projectId: string, options) => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/api/projects/${projectId}/status`, {
          headers: {
            'Authorization': `Bearer ${getApiKey()}`,
          },
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const status = await response.json();
        displayStatus(status);

        if (options.watch && status.status !== 'completed' && status.status !== 'failed') {
          await new Promise(resolve => setTimeout(resolve, 3000));
          console.clear();
          await fetchStatus();
        }
      } catch (error) {
        console.error(chalk.red('Error fetching status:'), error.message);
        process.exit(1);
      }
    };

    await fetchStatus();
  });

// ===========================================
// LIST COMMAND
// ===========================================

program
  .command('list')
  .alias('ls')
  .description('List all projects')
  .option('-s, --status <status>', 'Filter by status')
  .option('-l, --limit <number>', 'Limit results', '10')
  .action(async (options) => {
    const spinner = ora('Fetching projects...').start();

    try {
      const params = new URLSearchParams();
      if (options.status) params.append('status', options.status);
      params.append('limit', options.limit);

      const response = await fetch(`${getApiUrl()}/api/projects?${params}`, {
        headers: {
          'Authorization': `Bearer ${getApiKey()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const projects = await response.json();
      spinner.stop();

      const table = new Table({
        head: ['ID', 'Name', 'Status', 'Phase', 'Created', 'URL'],
        colWidths: [15, 25, 15, 15, 12, 30],
      });

      projects.forEach((project: any) => {
        table.push([
          project.id.substring(0, 12),
          project.name || 'Unnamed',
          getStatusColor(project.status),
          project.currentState?.phase || 'N/A',
          formatDate(project.createdAt),
          project.url || 'N/A',
        ]);
      });

      console.log(table.toString());
      console.log(chalk.gray(`\nTotal: ${projects.length} projects`));
    } catch (error) {
      spinner.fail('Failed to fetch projects');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ===========================================
// DEPLOY COMMAND
// ===========================================

program
  .command('deploy <projectId>')
  .description('Deploy a project')
  .option('-p, --provider <provider>', 'Deployment provider')
  .option('-e, --env <environment>', 'Environment', 'production')
  .action(async (projectId: string, options) => {
    const spinner = ora('Starting deployment...').start();

    try {
      const response = await fetch(`${getApiUrl()}/api/projects/${projectId}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify({
          provider: options.provider,
          environment: options.env,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const deployment = await response.json();
      spinner.succeed('Deployment initiated!');

      console.log(chalk.bold('\nDeployment Details:'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.cyan('ID:'), deployment.id);
      console.log(chalk.cyan('Provider:'), deployment.provider);
      console.log(chalk.cyan('Status:'), getStatusColor(deployment.status));
      console.log(chalk.gray('─'.repeat(50)));

      if (deployment.url) {
        console.log(chalk.green('\n🎉 Your app is live:'), chalk.bold.underline(deployment.url));
      }
    } catch (error) {
      spinner.fail('Deployment failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ===========================================
// LOGS COMMAND
// ===========================================

program
  .command('logs <projectId>')
  .description('View project logs')
  .option('-f, --follow', 'Follow log output')
  .option('-n, --lines <number>', 'Number of lines to show', '50')
  .action(async (projectId: string, options) => {
    try {
      const response = await fetch(
        `${getApiUrl()}/api/projects/${projectId}/logs?lines=${options.lines}`,
        {
          headers: {
            'Authorization': `Bearer ${getApiKey()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const logs = await response.json();
      logs.forEach((log: any) => {
        const timestamp = chalk.gray(new Date(log.timestamp).toISOString());
        const level = getLogLevelColor(log.level);
        console.log(`${timestamp} ${level} ${log.message}`);
      });
    } catch (error) {
      console.error(chalk.red('Error fetching logs:'), error.message);
      process.exit(1);
    }
  });

// ===========================================
// DELETE COMMAND
// ===========================================

program
  .command('delete <projectId>')
  .description('Delete a project')
  .option('-f, --force', 'Skip confirmation')
  .action(async (projectId: string, options) => {
    if (!options.force) {
      const { confirmed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message: 'Are you sure you want to delete this project?',
          default: false,
        },
      ]);

      if (!confirmed) {
        console.log(chalk.yellow('Deletion cancelled'));
        return;
      }
    }

    const spinner = ora('Deleting project...').start();

    try {
      const response = await fetch(`${getApiUrl()}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getApiKey()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      spinner.succeed('Project deleted successfully');
    } catch (error) {
      spinner.fail('Failed to delete project');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ===========================================
// CONFIG COMMAND
// ===========================================

program
  .command('config')
  .description('Configure CLI settings')
  .option('--api-url <url>', 'Set API URL')
  .option('--api-key <key>', 'Set API key')
  .action(async (options) => {
    // Implementation for config management
    console.log(chalk.yellow('Config command not yet implemented'));
  });

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function getApiUrl(): string {
  return process.env.MANIPULA_API_URL || 'http://localhost:3000';
}

function getApiKey(): string {
  const apiKey = process.env.MANIPULA_API_KEY;
  if (!apiKey) {
    console.error(chalk.red('Error: MANIPULA_API_KEY environment variable not set'));
    process.exit(1);
  }
  return apiKey;
}

function getStatusColor(status: string): string {
  const colors: Record<string, (text: string) => string> = {
    completed: chalk.green,
    failed: chalk.red,
    running: chalk.blue,
    pending: chalk.yellow,
  };
  const colorFn = colors[status] || chalk.white;
  return colorFn(status);
}

function getLogLevelColor(level: string): string {
  const colors: Record<string, (text: string) => string> = {
    error: chalk.red,
    warn: chalk.yellow,
    info: chalk.blue,
    debug: chalk.gray,
  };
  const colorFn = colors[level] || chalk.white;
  return colorFn(`[${level.toUpperCase()}]`);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function displayStatus(status: any): void {
  console.clear();
  console.log(chalk.bold.cyan('📊 Project Status\n'));

  const table = new Table({
    head: ['Property', 'Value'],
    colWidths: [20, 60],
  });

  table.push(
    ['ID', status.id],
    ['Name', status.name || 'Unnamed'],
    ['Status', getStatusColor(status.status)],
    ['Phase', status.currentState?.phase || 'N/A'],
    ['Progress', `${status.progress || 0}%`],
    ['Created', new Date(status.createdAt).toLocaleString()],
    ['URL', status.url || 'Not deployed']
  );

  console.log(table.toString());

  if (status.currentExecution) {
    console.log(chalk.bold('\n⚙️  Current Execution:'));
    console.log(chalk.gray(`  Agent: ${status.currentExecution.agentType}`));
    console.log(chalk.gray(`  Status: ${status.currentExecution.status}`));
  }
}

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
