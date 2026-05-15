import IORedis from "ioredis";
import { env } from "@/infrastructure/config/env";

let redisConnection: IORedis | null = null;

export function getRedisConnection() {
  if (!env.redisUrl) {
    throw new Error("Missing required environment variable: REDIS_URL");
  }

  if (!redisConnection) {
    redisConnection = new IORedis(env.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });
  }

  return redisConnection;
}

export async function closeRedisConnection() {
  if (!redisConnection) return;
  await redisConnection.quit();
  redisConnection = null;
}

