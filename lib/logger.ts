/**
 * Structured Logger
 * 
 * Per CLAUDE.md: Rule #16 - No console.log in production.
 * Use structured logging for observability.
 * 
 * @module lib/logger
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * Create a structured log entry
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>
): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...data,
  };
}

/**
 * Output log entry to appropriate destination
 */
function output(entry: LogEntry): void {
  // In production, use structured JSON
  if (process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
    return;
  }
  
  // In development, use readable format
  const { level, message, timestamp, ...data } = entry;
  const dataStr = Object.keys(data).length > 0 ? ` ${JSON.stringify(data)}` : '';
  
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](
    `[${timestamp}] ${level.toUpperCase()}: ${message}${dataStr}`
  );
}

/**
 * Logger interface
 */
export const logger = {
  debug(message: string, data?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production') {
      output(createLogEntry('debug', message, data));
    }
  },
  
  info(message: string, data?: Record<string, unknown>): void {
    output(createLogEntry('info', message, data));
  },
  
  warn(message: string, data?: Record<string, unknown>): void {
    output(createLogEntry('warn', message, data));
  },
  
  error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    const errorData = error instanceof Error 
      ? { 
          errorMessage: error.message, 
          errorStack: process.env.NODE_ENV !== 'production' ? error.stack : undefined 
        }
      : { errorData: error };
    
    output(createLogEntry('error', message, { ...errorData, ...data }));
  },
};

export default logger;
