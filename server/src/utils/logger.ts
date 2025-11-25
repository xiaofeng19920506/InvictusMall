/**
 * Centralized logging utility
 * Provides consistent logging across the application
 */

enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

interface LogContext {
  [key: string]: any;
}

// Helper to safely convert unknown to LogContext
function toLogContext(context: unknown): LogContext | undefined {
  if (context === undefined || context === null) {
    return undefined;
  }
  if (typeof context === 'object') {
    return context as LogContext;
  }
  return { value: context };
}

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  error(message: string, error?: Error | unknown, context?: LogContext | unknown): void {
    const safeContext = toLogContext(context);
    const errorContext: LogContext = {
      ...safeContext,
      ...(error instanceof Error && {
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name,
      }),
    };
    console.error(this.formatMessage(LogLevel.ERROR, message, errorContext));
  }

  warn(message: string, context?: LogContext | unknown): void {
    const safeContext = toLogContext(context);
    console.warn(this.formatMessage(LogLevel.WARN, message, safeContext));
  }

  info(message: string, context?: LogContext | unknown): void {
    const safeContext = toLogContext(context);
    console.log(this.formatMessage(LogLevel.INFO, message, safeContext));
  }

  debug(message: string, context?: LogContext | unknown): void {
    if (process.env.NODE_ENV === 'development') {
      const safeContext = toLogContext(context);
      console.log(this.formatMessage(LogLevel.DEBUG, message, safeContext));
    }
  }
}

export const logger = new Logger();

