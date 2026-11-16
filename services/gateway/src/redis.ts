/**
 * Redis connection — shared across queue, cache, and token bucket rate limiting.
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

export const PLATFORM_LIMITS = {
	instagram: { limit: 200, windowSec: 3600 }, // 200 req / hour (SRS Section 5)
	whatsapp: { limit: 1000, windowSec: 3600 }, // 1000 req / hour
	telegram: { limit: 500, windowSec: 3600 }, // 500 req / hour
} as const;

export type SupportedPlatform = keyof typeof PLATFORM_LIMITS;

export interface QuotaResult {
	allowed: boolean;
	remaining: number;
	limit: number;
	resetInSec: number;
}

// In-memory fallback in case Redis connection is unavailable in local test environments
const memoryFallback = new Map<string, { count: number; resetAt: number }>();

/**
 * Deterministic Token Bucket / Sliding Window rate limiter backed by Redis.
 * Enforces per-platform hourly quotas per account.
 */
export async function checkAndConsumeQuota(
	platform: "instagram" | "whatsapp" | "telegram",
	accountId: string,
): Promise<QuotaResult> {
	const config = PLATFORM_LIMITS[platform] ?? { limit: 500, windowSec: 3600 };
	const normalizedAccount = accountId.trim() || "@creator_hq";
	const key = `ratelimit:${platform}:${normalizedAccount}`;

	try {
		// Atomic Redis script: check quota, increment if allowed, set expiration on first access
		const script = `
			local key = KEYS[1]
			local limit = tonumber(ARGV[1])
			local window = tonumber(ARGV[2])

			local current = tonumber(redis.call('get', key) or "0")
			if current >= limit then
				local ttl = redis.call('ttl', key)
				if ttl < 0 then ttl = window end
				return {0, 0, ttl}
			else
				local count = redis.call('incr', key)
				if count == 1 then
					redis.call('expire', key, window)
				end
				local ttl = redis.call('ttl', key)
				if ttl < 0 then ttl = window end
				local remaining = limit - count
				if remaining < 0 then remaining = 0 end
				return {1, remaining, ttl}
			end
		`;

		const res = (await redis.eval(
			script,
			1,
			key,
			config.limit,
			config.windowSec,
		)) as [number, number, number];

		const allowed = res[0] === 1;
		const remaining = Number(res[1]);
		const resetInSec = Number(res[2]);

		const result: QuotaResult = {
			allowed,
			remaining,
			limit: config.limit,
			resetInSec,
		};

		console.log(
			`[REDIS-RATE-LIMITER] Platform: ${platform} | Account: ${normalizedAccount} | Quota Remaining: ${result.remaining}/${result.limit} (Window: ${config.windowSec}s)`,
		);

		return result;
	} catch (err) {
		console.warn(
			`[gateway] Redis rate-limiter fallback activated for ${key}:`,
			err instanceof Error ? err.message : String(err),
		);

		const now = Date.now();
		const entry = memoryFallback.get(key);

		if (!entry || now > entry.resetAt) {
			memoryFallback.set(key, {
				count: 1,
				resetAt: now + config.windowSec * 1000,
			});
			const result: QuotaResult = {
				allowed: true,
				remaining: config.limit - 1,
				limit: config.limit,
				resetInSec: config.windowSec,
			};
			console.log(
				`[REDIS-RATE-LIMITER] Platform: ${platform} | Account: ${normalizedAccount} | Quota Remaining: ${result.remaining}/${result.limit} (Window: ${config.windowSec}s)`,
			);
			return result;
		}

		if (entry.count >= config.limit) {
			const resetInSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
			const result: QuotaResult = {
				allowed: false,
				remaining: 0,
				limit: config.limit,
				resetInSec,
			};
			console.log(
				`[REDIS-RATE-LIMITER] Platform: ${platform} | Account: ${normalizedAccount} | Quota Remaining: 0/${result.limit} (Window: ${config.windowSec}s)`,
			);
			return result;
		}

		entry.count += 1;
		const resetInSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
		const result: QuotaResult = {
			allowed: true,
			remaining: config.limit - entry.count,
			limit: config.limit,
			resetInSec,
		};
		console.log(
			`[REDIS-RATE-LIMITER] Platform: ${platform} | Account: ${normalizedAccount} | Quota Remaining: ${result.remaining}/${result.limit} (Window: ${config.windowSec}s)`,
		);
		return result;
	}
}
