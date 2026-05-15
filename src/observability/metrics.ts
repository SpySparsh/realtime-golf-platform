import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from "prom-client";
import { env } from "@/infrastructure/config/env";

export const metricsRegistry = new Registry();

metricsRegistry.setDefaultLabels({
  service: env.serviceName,
});

if (!metricsRegistry.getSingleMetric("golf_process_cpu_user_seconds_total")) {
  collectDefaultMetrics({
    register: metricsRegistry,
    prefix: "golf_",
  });
}

function getOrCreate<T>(name: string, create: () => T) {
  return (metricsRegistry.getSingleMetric(name) as T | undefined) ?? create();
}

export const httpRequestsTotal = getOrCreate(
  "golf_http_requests_total",
  () =>
    new Counter({
      name: "golf_http_requests_total",
      help: "Total API requests",
      labelNames: ["method", "route", "status_code"] as const,
      registers: [metricsRegistry],
    })
);

export const httpRequestDurationSeconds = getOrCreate(
  "golf_http_request_duration_seconds",
  () =>
    new Histogram({
      name: "golf_http_request_duration_seconds",
      help: "API request latency in seconds",
      labelNames: ["method", "route", "status_code"] as const,
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [metricsRegistry],
    })
);

export const errorsTotal = getOrCreate(
  "golf_errors_total",
  () =>
    new Counter({
      name: "golf_errors_total",
      help: "Total application errors",
      labelNames: ["source", "code"] as const,
      registers: [metricsRegistry],
    })
);

export const queueJobsTotal = getOrCreate(
  "golf_queue_jobs_total",
  () =>
    new Counter({
      name: "golf_queue_jobs_total",
      help: "Total queue jobs by result",
      labelNames: ["queue", "job_name", "status"] as const,
      registers: [metricsRegistry],
    })
);

export const queueJobDurationSeconds = getOrCreate(
  "golf_queue_job_duration_seconds",
  () =>
    new Histogram({
      name: "golf_queue_job_duration_seconds",
      help: "Queue job processing duration in seconds",
      labelNames: ["queue", "job_name"] as const,
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 15, 30, 60],
      registers: [metricsRegistry],
    })
);

export const queueWaitingJobs = getOrCreate(
  "golf_queue_waiting_jobs",
  () =>
    new Gauge({
      name: "golf_queue_waiting_jobs",
      help: "Queue waiting job count",
      labelNames: ["queue"] as const,
      registers: [metricsRegistry],
    })
);

export const websocketConnections = getOrCreate(
  "golf_websocket_connections",
  () =>
    new Gauge({
      name: "golf_websocket_connections",
      help: "Active websocket connections",
      labelNames: ["transport"] as const,
      registers: [metricsRegistry],
    })
);

export const websocketEventsTotal = getOrCreate(
  "golf_websocket_events_total",
  () =>
    new Counter({
      name: "golf_websocket_events_total",
      help: "Total websocket events",
      labelNames: ["event", "direction", "status"] as const,
      registers: [metricsRegistry],
    })
);

export const websocketRooms = getOrCreate(
  "golf_websocket_rooms",
  () =>
    new Gauge({
      name: "golf_websocket_rooms",
      help: "Approximate active rooms on this websocket instance",
      registers: [metricsRegistry],
    })
);

export async function renderMetrics() {
  return metricsRegistry.metrics();
}

export function metricsContentType() {
  return metricsRegistry.contentType;
}
