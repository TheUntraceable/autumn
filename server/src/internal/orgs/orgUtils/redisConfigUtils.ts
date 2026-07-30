import { ErrCode, type OrgRedisConfig, RecaseError } from "@autumn/shared";
import { encryptData } from "@/utils/encryptUtils.js";

const REDIS_PROTOCOLS = new Set(["redis:", "rediss:"]);

/** Parses a Redis connection string, rejecting anything but redis:// / rediss://. */
export const parseRedisConnectionString = ({
	connectionString,
	label = "connection string",
}: {
	connectionString: string;
	label?: string;
}): URL => {
	let redisUrl: URL;
	try {
		redisUrl = new URL(connectionString);
	} catch {
		throw new RecaseError({
			message: `Invalid ${label}: could not parse URL`,
			code: ErrCode.InvalidRequest,
			statusCode: 400,
		});
	}

	if (!REDIS_PROTOCOLS.has(redisUrl.protocol)) {
		throw new RecaseError({
			message: `Invalid ${label}: expected redis:// or rediss://`,
			code: ErrCode.InvalidRequest,
			statusCode: 400,
		});
	}

	return redisUrl;
};

export const parsePublicRedisConnectionString = ({
	publicConnectionString,
}: {
	publicConnectionString: string;
}): URL =>
	parseRedisConnectionString({
		connectionString: publicConnectionString,
		label: "public connection string",
	});

/**
 * Validates a create payload and returns the redis_config to store: connection
 * strings encrypted, host kept in plain text for pool URL-change detection.
 */
export const buildInitialRedisConfig = ({
	connectionString,
	publicConnectionString,
}: {
	connectionString: string;
	publicConnectionString?: string;
}): { redisConfig: OrgRedisConfig; redisUrl: URL } => {
	const redisUrl = parseRedisConnectionString({ connectionString });

	if (publicConnectionString) {
		parsePublicRedisConnectionString({ publicConnectionString });
	}

	return {
		redisUrl,
		redisConfig: {
			connectionString: encryptData(connectionString),
			publicConnectionString: publicConnectionString
				? encryptData(publicConnectionString)
				: undefined,
			url: redisUrl.host,
			migrationPercent: 0,
			previousMigrationPercent: 0,
			migrationChangedAt: Date.now(),
		},
	};
};

/** Bumps migrationPercent, retaining the previous value + change timestamp. */
export const withUpdatedMigrationPercent = ({
	redisConfig,
	migrationPercent,
}: {
	redisConfig: OrgRedisConfig;
	migrationPercent: number;
}): OrgRedisConfig => ({
	...redisConfig,
	previousMigrationPercent: redisConfig.migrationPercent,
	migrationPercent,
	migrationChangedAt: Date.now(),
});
