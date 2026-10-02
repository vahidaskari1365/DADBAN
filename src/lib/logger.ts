/**
 * ============================================================================
 * dadpayo — Structured Logger
 * ----------------------------------------------------------------------------
 * لاگ کردن ساختاریافته برای production.
 * - levels: debug, info, warn, error
 * - خروجی JSON برای پردازش با ELK/Grafana
 * - context binding (userId, requestId)
 * - safe for edge runtime
 * ============================================================================
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/** سطح فعلی از env. */
function currentLevel(): LogLevel {
  const env = process.env.LOG_LEVEL || process.env.NODE_ENV === "production" ? "info" : "debug";
  return (env as LogLevel) || "info";
}

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * لاگ‌گیر اصلی.
 * در production: JSON به stdout
 * در development: readable با رنگ
 */
class Logger {
  private context: LogContext = {};

  /** ایجاد child logger با context اضافی. */
  child(context: LogContext): Logger {
    const child = new Logger();
    child.context = { ...this.context, ...context };
    return child;
  }

  /** افزودن context به logger فعلی. */
  with(context: LogContext): this {
    this.context = { ...this.context, ...context };
    return this;
  }

  debug(message: string, context?: LogContext) {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext) {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log("warn", message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const entry: LogEntry = {
      level: "error",
      message,
      timestamp: new Date().toISOString(),
      context: { ...this.context, ...context },
    };
    if (error instanceof Error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error) {
      entry.context = { ...entry.context, error: String(error) };
    }
    this.emit(entry);
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[currentLevel()]) return;
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: { ...this.context, ...context },
    };
    this.emit(entry);
  }

  private emit(entry: LogEntry) {
    const isProd = process.env.NODE_ENV === "production";

    if (isProd) {
      // JSON برای پردازش با log aggregator
      console.log(JSON.stringify(entry));
    } else {
      // readable در development
      const colors: Record<LogLevel, string> = {
        debug: "\x1b[36m",
        info: "\x1b[32m",
        warn: "\x1b[33m",
        error: "\x1b[31m",
      };
      const reset = "\x1b[0m";
      const time = entry.timestamp.slice(11, 19);
      const ctx = entry.context && Object.keys(entry.context).length > 0
        ? " " + JSON.stringify(entry.context)
        : "";
      console.log(
        `${colors[entry.level]}[${entry.level.toUpperCase()}]${reset} ${time} ${entry.message}${ctx}`
      );
      if (entry.error?.stack) {
        console.log(entry.error.stack);
      }
    }
  }
}

/** Logger سراسری. */
export const logger = new Logger();

/**
 * تولید request ID برای tracing.
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * ساخت logger با context درخواست.
 * استفاده در API routes:
 *   const log = requestLogger(req);
 *   log.info("processing payment", { amount });
 */
export function requestLogger(req: Request): Logger {
  const requestId = req.headers.get("x-request-id") || generateRequestId();
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  return logger.child({ requestId, ip, path: new URL(req.url).pathname });
}
