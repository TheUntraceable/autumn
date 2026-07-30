import { getPrimaryRedis } from "../../external/redis/initRedis.js";

export class CacheManager {
	public static async getJson<T>(key: string): Promise<T | null> {
		const redis = getPrimaryRedis();
		if (redis.status !== "ready") {
			console.warn("Cache client is not in ready state");
			return null;
		}

		const res = await redis.get(key);

		if (!res) {
			return null;
		}

		try {
			return JSON.parse(res);
		} catch (error) {
			// A poisoned/corrupted cache entry would otherwise throw on every
			// read until its TTL expires, breaking callers that treat a cache
			// miss as recoverable. Drop the bad entry and report a miss so the
			// value gets recomputed and rewritten.
			console.warn(`Failed to parse cached JSON for key "${key}"`, error);
			redis.del(key).catch(() => {});
			return null;
		}
	}

	public static async setJson(
		key: string,
		value: unknown,
		ttl: number | string = 3600,
	) {
		const redis = getPrimaryRedis();
		if (redis.status !== "ready") {
			console.warn("Cache client is not in ready state");
			return;
		}

		if (typeof ttl === "number") {
			await redis.set(key, JSON.stringify(value), "EX", ttl);
		} else if (typeof ttl === "string" && ttl.toLowerCase() === "forever") {
			await redis.set(key, JSON.stringify(value));
		}
	}

	public static async del(key: string) {
		const redis = getPrimaryRedis();
		if (redis.status !== "ready") {
			console.warn("Cache client is not in ready state");
			return;
		}

		await redis.del(key);
	}

	public static async invalidate({
		action,
		value,
	}: {
		action: string;
		value: string;
	}) {
		const redis = getPrimaryRedis();
		if (redis.status !== "ready") {
			console.warn("Cache client is not in ready state");
			return;
		}

		await redis.del(`${action}:${value}`);
	}

	static async disconnect() {
		const redis = getPrimaryRedis();
		if (redis.status !== "ready") {
			console.warn("Cache client is not in ready state");
			return;
		}

		await redis.quit();
	}
}
