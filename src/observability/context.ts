import { AsyncLocalStorage } from "async_hooks";
import { randomUUID } from "crypto";

type ObservabilityContext = {
  correlationId: string;
  requestId?: string;
  userId?: string;
  route?: string;
};

const storage = new AsyncLocalStorage<ObservabilityContext>();

export function createCorrelationId(incoming?: string | null) {
  return incoming?.trim() || randomUUID();
}

export function runWithObservabilityContext<T>(
  context: ObservabilityContext,
  callback: () => T
) {
  return storage.run(context, callback);
}

export function getObservabilityContext() {
  return storage.getStore();
}

