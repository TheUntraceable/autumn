import { ErrCode, RecaseError, Scopes } from "@autumn/shared";
import { z } from "zod/v4";
import { getOrgRedis, removeOrgRedis } from "@/external/redis/orgRedisPool.js";
import { createRoute } from "@/honoMiddlewares/routeHandler.js";
import { OrgService } from "../OrgService.js";
import { clearOrgCache } from "../orgUtils/clearOrgCache.js";
import {
	buildInitialRedisConfig,
	withUpdatedMigrationPercent,
} from "../orgUtils/redisConfigUtils.js";

export const handleUpsertRedisConfig = createRoute({
	scopes: [Scopes.Organisation.Write],
	body: z.object({
		connectionString: z.string().min(1),
		publicConnectionString: z.string().min(1).optional(),
	}),
	handler: async (c) => {
		const ctx = c.get("ctx");
		const { db, org, logger } = ctx;
		const {
			connectionString: rawConnectionString,
			publicConnectionString: rawPublicConnectionString,
		} = c.req.valid("json");
		const connectionString = rawConnectionString.trim();
		const publicConnectionString = rawPublicConnectionString?.trim();

		if (!connectionString) {
			throw new RecaseError({
				message: "Connection string is required",
				code: ErrCode.InvalidRequest,
				statusCode: 400,
			});
		}

		if (org.redis_config) {
			throw new RecaseError({
				message:
					"Redis config already exists. Remove it before creating a new one.",
				code: ErrCode.InvalidRequest,
				statusCode: 400,
			});
		}

		const { redisConfig, redisUrl } = buildInitialRedisConfig({
			connectionString,
			publicConnectionString,
		});

		const updatedOrg = await OrgService.update({
			db,
			orgId: org.id,
			updates: { redis_config: redisConfig },
		});

		if (updatedOrg) {
			getOrgRedis({ org: updatedOrg });
			await clearOrgCache({ db, orgId: org.id, env: ctx.env, logger });
			logger.info(
				`[handleUpsertRedisConfig] org=${org.id}: redis_config created, url=${redisUrl.host}, actor=${ctx.user?.email ?? ctx.userId ?? "unknown"}`,
			);
		}

		return c.json({ success: true });
	},
});

export const handleUpdateRedisMigration = createRoute({
	scopes: [Scopes.Organisation.Write],
	body: z.object({
		migrationPercent: z.number().int().min(0).max(100),
	}),
	handler: async (c) => {
		const ctx = c.get("ctx");
		const { db, org, logger } = ctx;
		const { migrationPercent } = c.req.valid("json");

		if (!org.redis_config) {
			throw new RecaseError({
				message: "No Redis config set on this org",
				code: ErrCode.InvalidRequest,
				statusCode: 400,
			});
		}

		await OrgService.update({
			db,
			orgId: org.id,
			updates: {
				redis_config: withUpdatedMigrationPercent({
					redisConfig: org.redis_config,
					migrationPercent,
				}),
			},
		});
		await clearOrgCache({ db, orgId: org.id, env: ctx.env, logger });

		logger.info(
			`[handleUpdateRedisMigration] org=${org.id}: ${org.redis_config.migrationPercent}% -> ${migrationPercent}%`,
		);

		return c.json({ success: true });
	},
});

export const handleDeleteRedisConfig = createRoute({
	scopes: [Scopes.Organisation.Write],
	handler: async (c) => {
		const ctx = c.get("ctx");
		const { db, org, logger } = ctx;

		if (org.redis_config && org.redis_config.migrationPercent > 0) {
			throw new RecaseError({
				message: `Cannot remove Redis config while migrationPercent is ${org.redis_config.migrationPercent}%. Set it to 0 first.`,
				code: ErrCode.InvalidRequest,
				statusCode: 400,
			});
		}

		// Intended for use after migrationPercent has settled at 0; in-flight
		// requests may still hold the old org config for a short window.
		await OrgService.update({
			db,
			orgId: org.id,
			updates: { redis_config: null },
		});
		await clearOrgCache({ db, orgId: org.id, env: ctx.env, logger });
		removeOrgRedis({ orgId: org.id });

		logger.info(
			`[handleDeleteRedisConfig] org=${org.id}: redis_config removed`,
		);

		return c.json({ success: true });
	},
});
