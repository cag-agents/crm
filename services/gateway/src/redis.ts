/**
 * Redis connection — shared across queue and cache.
 */

import { Redis } from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
});

redis.on("connect", () => {
  console.log("[gateway] Connected to Redis");
});

redis.on("error", (err: Error) => {
  console.error("[gateway] Redis connection error:", err.message);
});
