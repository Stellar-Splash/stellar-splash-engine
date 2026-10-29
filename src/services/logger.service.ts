import { CONFIG } from '../config';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
}

export class LoggerService {
  private static ringBuffer: LogEntry[] = [];
  private static readonly MAX_BUFFER_SIZE = 500;
  private static minLevel: LogLevel = 'INFO';

  private static readonly LEVEL_PRIORITY: Record<LogLevel, number> = {
    DEBUG: 10,
    INFO: 20,
    WARN: 30,
    ERROR: 40,
  };

  public static setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  public static getMinLevel(): LogLevel {
    return this.minLevel;
  }

  private static shouldLog(level: LogLevel): boolean {
    return this.LEVEL_PRIORITY[level] >= this.LEVEL_PRIORITY[this.minLevel];
  }

  private static record(entry: LogEntry): void {
    if (this.ringBuffer.length >= this.MAX_BUFFER_SIZE) {
      this.ringBuffer.shift();
    }
    this.ringBuffer.push(entry);

    if (!this.shouldLog(entry.level)) return;

    // In production or structured logging mode, emit JSON string
    if (CONFIG.NODE_ENV === 'production') {
      const serialized = JSON.stringify(entry);
      if (entry.level === 'ERROR') {
        console.error(serialized);
      } else if (entry.level === 'WARN') {
        console.warn(serialized);
      } else {
        console.log(serialized);
      }
    }
  }

  public static debug(message: string, context?: Record<string, unknown>): void {
    this.record({
      timestamp: new Date().toISOString(),
      level: 'DEBUG',
      message,
      context,
    });
  }

  public static info(message: string, context?: Record<string, unknown>): void {
    this.record({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      context,
    });
  }

  public static warn(message: string, context?: Record<string, unknown>): void {
    this.record({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      context,
    });
  }

  public static error(
    message: string,
    err?: Error | unknown,
    context?: Record<string, unknown>,
  ): void {
    const errorDetails =
      err instanceof Error
        ? { name: err.name, message: err.message, stack: err.stack }
        : err
          ? { message: String(err) }
          : undefined;

    this.record({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      error: errorDetails,
      context,
    });
  }

  /**
   * Creates a scoped logger that automatically merges contextual metadata (e.g. requestId, wallet, tournamentId)
   */
  public static withContext(baseContext: Record<string, unknown>) {
    return {
      debug: (msg: string, ctx?: Record<string, unknown>) =>
        LoggerService.debug(msg, { ...baseContext, ...ctx }),
      info: (msg: string, ctx?: Record<string, unknown>) =>
        LoggerService.info(msg, { ...baseContext, ...ctx }),
      warn: (msg: string, ctx?: Record<string, unknown>) =>
        LoggerService.warn(msg, { ...baseContext, ...ctx }),
      error: (msg: string, err?: Error | unknown, ctx?: Record<string, unknown>) =>
        LoggerService.error(msg, err, { ...baseContext, ...ctx }),
    };
  }

  /**
   * Returns recent log entries from the in-memory ring buffer.
   */
  public static getHistory(limit: number = 50): LogEntry[] {
    return this.ringBuffer.slice(-limit);
  }

  public static clearHistory(): void {
    this.ringBuffer = [];
  }
}
