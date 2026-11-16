/**
 * Redis Job Queue — BullMQ
 *
 * This is the async buffer between "receive webhook" and "process webhook".
 * The gateway pushes jobs here instantly, and separate worker processes
 * consume them at their own pace.
 */

import { Queue } from "bullmq";
import { redis } from "./redis";

export const webhookQueue = new Queue("webhook-events", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 1000,   // keep last 1000 completed for debugging
    removeOnFail: 5000,       // keep last 5000 failed for investigation
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});

console.log("[gateway] Webhook queue initialized");
