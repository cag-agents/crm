/**
 * Redis connection — shared across queue and cache.
 */

import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
});

redis.on("connect", () => {
  console.log("[gateway] Connected to Redis");
});

redis.on("error", (err) => {
  console.error("[gateway] Redis connection error:", err.message);
});
