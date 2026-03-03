import {
	ApiFeatureType,
	type CreditSystemConfig,
	cusProductsToCusPrices,
	ErrCode,
	type Feature,
	FeatureType,
	FeatureUsageType,
	type FullCustomer,
	isAllocatedPrice,
	type MeteredConfig,
	type UsagePriceConfig,
} from "@autumn/shared";
import { ACTIVE_STATUSES } from "@server/internal/customers/cusProducts/CusProductService";
import RecaseError from "@server/utils/errorUtils";
import { StatusCodes } from "http-status-codes";

export const validateFeatureId = (featureId: string) => {
	if (!featureId.match(/^[a-zA-Z0-9_-]+$/)) {
		throw new RecaseError({
			message:
				"Feature ID can only contain alphanumeric characters, underscores, and hyphens",
			code: ErrCode.InvalidFeature,
			statusCode: 400,
		});
	}
	return;
};

export const validateMeteredConfig = (config: MeteredConfig) => {
	const newConfig = { ...config };

	if (!config.usage_type) {
		throw new RecaseError({
			message: `Usage type (single or continuous) is required for metered feature`,
			code: ErrCode.InvalidFeature,
			statusCode: StatusCodes.BAD_REQUEST,
		});
	}

	return newConfig as MeteredConfig;
};

export const validateCreditSystem = (
	config: CreditSystemConfig,
): CreditSystemConfig => {
	if (!config.schema?.length) {
		throw new RecaseError({
			message: "At least one metered feature is required for credit system",
			code: ErrCode.InvalidFeature,
			statusCode: StatusCodes.BAD_REQUEST,
		});
	}

	// Ensure unique metered_feature_id
	const ids = config.schema.map((s) => s.metered_feature_id);
	if (new Set(ids).size !== ids.length) {
		throw new RecaseError({
			message: "Credit system contains multiple of the same metered_feature_id",
			code: ErrCode.InvalidFeature,
			statusCode: StatusCodes.BAD_REQUEST,
		});
	}

	const validatedSchema = config.schema.map((item) => {
		const { credit_amount, cost_per_million_input, cost_per_million_output } =
			item;

		const hasCredit = typeof credit_amount === "number";
		const hasCost =
			typeof cost_per_million_input === "number" ||
			typeof cost_per_million_output === "number";

		// Mutually exclusive enforcement
		if (hasCredit === hasCost) {
			throw new RecaseError({
				message:
					"Provide either credit_amount OR cost_per_million_* fields, but not both",
				code: ErrCode.InvalidFeature,
				statusCode: StatusCodes.BAD_REQUEST,
			});
		}

		// Flat credit mode
		if (hasCredit) {
			const parsed = Number(credit_amount);
			if (!Number.isFinite(parsed)) {
				throw new RecaseError({
					message: "Credit amount should be a valid number",
					code: ErrCode.InvalidFeature,
					statusCode: StatusCodes.BAD_REQUEST,
				});
			}

			return {
				...item,
				credit_amount: parsed,
			};
		}

		// AI token pricing mode
		const input = Number(cost_per_million_input ?? 0);
		const output = Number(cost_per_million_output ?? 0);

		if (!Number.isFinite(input) || !Number.isFinite(output)) {
			throw new RecaseError({
				message:
					"cost_per_million_input and cost_per_million_output must be valid numbers",
				code: ErrCode.InvalidFeature,
				statusCode: StatusCodes.BAD_REQUEST,
			});
		}

		return {
			...item,
			cost_per_million_input: input,
			cost_per_million_output: output,
		};
	});

	return {
		...config,
		usage_type: FeatureUsageType.Single,
		schema: validatedSchema,
	};
};

const getCusFeatureType = ({ feature }: { feature: Feature }) => {
	if (feature.type === FeatureType.Boolean) {
		return ApiFeatureType.Static;
	} else if (feature.type === FeatureType.Metered) {
		if (feature.config.usage_type === FeatureUsageType.Single) {
			return ApiFeatureType.SingleUsage;
		} else {
			return ApiFeatureType.ContinuousUse;
		}
	} else {
		return ApiFeatureType.SingleUsage;
	}
};

const isCreditSystem = ({ feature }: { feature: Feature }) => {
	return feature.type === FeatureType.CreditSystem;
};

export const isPaidContinuousUse = ({
	feature,
	fullCus,
}: {
	feature: Feature;
	fullCus: FullCustomer;
}) => {
	const isContinuous =
		feature.config?.usage_type === FeatureUsageType.Continuous;

	if (!isContinuous) {
		return false;
	}

	const cusPrices = cusProductsToCusPrices({
		cusProducts: fullCus.customer_products,
		inStatuses: ACTIVE_STATUSES,
	});

	const hasPaid = cusPrices.some((cp) => {
		const config = cp.price.config as UsagePriceConfig;

		const featureIdMatches = config.internal_feature_id === feature.internal_id;
		const allocatedPrice = isAllocatedPrice(cp.price);

		return featureIdMatches && allocatedPrice;
	});

	return hasPaid;
};
