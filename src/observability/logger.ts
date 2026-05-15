import pino from "pino";
import { env } from "@/infrastructure/config/env";
import { getObservabilityContext } from "@/observability/context";

type LogContext = Record<string, unknown>;
type LogLevel = "debug" | "info" | "warn" | "error";

const baseLogger = pino({
  level: env.logLevel,
  base: {
    service: env.serviceName,
    runtime: "nodejs",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});

function normalizeContext(context?: LogContext) {
  const activeContext = getObservabilityContext();
  return {
    ...(activeContext ?? {}),
    ...(context ?? {}),
  };
}

function write(level: LogLevel, message: string, context?: LogContext) {
  baseLogger[level](normalizeContext(context), message);
}

export const logger = {
  debug(message: string, context?: LogContext) {
    write("debug", message, context);
  },
  info(message: string, context?: LogContext) {
    write("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    write("warn", message, context);
  },
  error(message: string, context?: LogContext) {
    write("error", message, context);
  },
  child(context: LogContext) {
    const child = baseLogger.child(normalizeContext(context));
    return {
      debug(message: string, extra?: LogContext) {
        child.debug(extra ?? {}, message);
      },
      info(message: string, extra?: LogContext) {
        child.info(extra ?? {}, message);
      },
      warn(message: string, extra?: LogContext) {
        child.warn(extra ?? {}, message);
      },
      error(message: string, extra?: LogContext) {
        child.error(extra ?? {}, message);
      },
    };
  },
};
