/**
 * Structured logger with context support.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  projectId?: string;
  stage?: string;
  [key: string]: unknown;
}

export interface LoggerContext {
  projectId?: string;
  stage?: string;
  [key: string]: unknown;
}

/**
 * Structured logger that emits JSON log entries.
 */
export class Logger {
  private context: LoggerContext;

  constructor(context: LoggerContext = {}) {
    this.context = context;
  }

  child(additionalContext: LoggerContext): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }

  debug(message: string, extra?: Record<string, unknown>): void {
    this.emit('debug', message, extra);
  }

  info(message: string, extra?: Record<string, unknown>): void {
    this.emit('info', message, extra);
  }

  warn(message: string, extra?: Record<string, unknown>): void {
    this.emit('warn', message, extra);
  }

  error(message: string, extra?: Record<string, unknown>): void {
    this.emit('error', message, extra);
  }

  private emit(level: LogLevel, message: string, extra?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...extra,
    };
    if (level === 'error' || level === 'warn') {
      process.stderr.write(JSON.stringify(entry) + '\n');
    } else {
      process.stdout.write(JSON.stringify(entry) + '\n');
    }
  }
}

export const logger = new Logger();
