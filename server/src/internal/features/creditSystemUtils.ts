import {
	type CreditSchemaItem,
	ErrCode,
	type Feature,
	FeatureType,
	normaliseAiModelName,
	RecaseError,
} from "@autumn/shared";
import { Decimal } from "decimal.js";

const creditSystemContainsFeature = ({
	creditSystem,
	meteredFeatureId,
}: {
	creditSystem: Feature;
	meteredFeatureId: string;
}) => {
	if (creditSystem.type !== FeatureType.CreditSystem) {
		return false;
	}
	const schema: CreditSchemaItem[] = creditSystem.config.schema;
	const normalised = normaliseAiModelName(meteredFeatureId);

	for (const schemaItem of schema) {
		if (normaliseAiModelName(schemaItem.metered_feature_id) === normalised) {
			return true;
		}
	}

	return false;
};

export const getCreditSystemsFromFeature = ({
	featureId,
	features,
}: {
	featureId: string;
	features: Feature[];
}) => {
	return features.filter(
		(f) =>
			f.type === FeatureType.CreditSystem &&
			f.id !== featureId &&
			creditSystemContainsFeature({
				creditSystem: f,
				meteredFeatureId: featureId,
			}),
	);
};

export const featureToCreditSystem = ({
	featureId,
	creditSystem,
	amount,
	inputTokens,
	outputTokens,
}: {
	featureId: string;
	creditSystem: Feature;
	amount: number;
	inputTokens?: number;
	outputTokens?: number;
}) => {
	const schema: CreditSchemaItem[] = creditSystem.config.schema;
	const normalised = normaliseAiModelName(featureId);

	for (const schemaItem of schema) {
		if (normaliseAiModelName(schemaItem.metered_feature_id) === normalised) {
			// AI token pricing model
			if (
				schemaItem.cost_per_million_input ||
				schemaItem.cost_per_million_output
			) {
				return calculateTokenCreditCost({
					schemaItem,
					inputTokens,
					outputTokens,
				});
			}

			const creditAmount = schemaItem.credit_amount;
			if (creditAmount === undefined) {
				throw new RecaseError({
					message:
						"Credit amount is not defined for this feature in the credit system",
					code: ErrCode.InvalidFeature,
				});
			}
			const featureAmount = schemaItem.feature_amount ?? 1;

			return new Decimal(creditAmount)
				.div(featureAmount)
				.mul(amount)
				.toNumber();
		}
	}

	return amount;
};

/**
 * Calculates credit cost from input/output tokens for AI token pricing models.
 */
const calculateTokenCreditCost = ({
	schemaItem,
	inputTokens,
	outputTokens,
}: {
	schemaItem: CreditSchemaItem;
	inputTokens?: number;
	outputTokens?: number;
}) => {
	if (!inputTokens && !outputTokens) {
		throw new RecaseError({
			message:
				"input_tokens or output_tokens must be provided for AI token pricing",
			code: ErrCode.InvalidRequest,
			statusCode: 400,
		});
	}

	const inputCost = new Decimal(inputTokens ?? 0)
		.mul(schemaItem.cost_per_million_input ?? 0)
		.div(1_000_000);

	const outputCost = new Decimal(outputTokens ?? 0)
		.mul(schemaItem.cost_per_million_output ?? 0)
		.div(1_000_000);

	const totalCost = inputCost.plus(outputCost);

	return totalCost.toNumber();
};

export const getCreditCost = ({
	featureId,
	creditSystem,
	amount = 1,
	inputTokens,
	outputTokens,
}: {
	featureId: string;
	creditSystem: Feature;
	amount?: number;
	inputTokens?: number;
	outputTokens?: number;
}) => {
	if (creditSystem.type !== FeatureType.CreditSystem) {
		return amount;
	}
	const schema: CreditSchemaItem[] = creditSystem.config.schema;
	const normalised = normaliseAiModelName(featureId);

	for (const schemaItem of schema) {
		if (normaliseAiModelName(schemaItem.metered_feature_id) === normalised) {
			// AI token pricing model
			if (
				schemaItem.cost_per_million_input ||
				schemaItem.cost_per_million_output
			) {
				return calculateTokenCreditCost({
					schemaItem,
					inputTokens,
					outputTokens,
				});
			}

			if (schemaItem.credit_amount === undefined) {
				throw new RecaseError({
					message:
						"Credit amount is not defined for this feature in the credit system",
					code: ErrCode.InvalidFeature,
				});
			}
			return new Decimal(schemaItem.credit_amount)
				.div(schemaItem.feature_amount ?? 1)
				.mul(amount)
				.toNumber();
		}
	}

	return 1;
};
