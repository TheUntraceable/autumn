import {
	type CreditSchemaItem,
	ErrCode,
	type Feature,
	FeatureType,
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

	for (const schemaItem of schema) {
		if (schemaItem.metered_feature_id === meteredFeatureId) {
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
}: {
	featureId: string;
	creditSystem: Feature;
	amount: number;
}) => {
	const schema: CreditSchemaItem[] = creditSystem.config.schema;

	for (const schemaItem of schema) {
		if (schemaItem.metered_feature_id === featureId) {
			const creditAmount = schemaItem.credit_amount;
			// DOUBLE CHECK WHAT THE BEHAVIOUR SHOULD BE IF THIS IS AN AI TOKEN PRICING MODEL RATHER THAN A CREDIT COST MODEL
			if(creditAmount === undefined) {
				throw new RecaseError({
					message: "Credit amount is not defined for this feature in the credit system",
					code: ErrCode.InvalidFeature,
				})
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

export const getCreditCost = ({
	featureId,
	creditSystem,
	amount = 1,
}: {
	featureId: string;
	creditSystem: Feature;
	amount?: number;
}) => {
	if (creditSystem.type !== FeatureType.CreditSystem) {
		return amount;
	}
	const schema: CreditSchemaItem[] = creditSystem.config.schema;

	for (const schemaItem of schema) {
		if (schemaItem.metered_feature_id === featureId) {
			if(schemaItem.credit_amount === undefined) {
				// DOUBLE CHECK WHAT THE BEHAVIOUR SHOULD BE IF THIS IS AN AI TOKEN PRICING MODEL RATHER THAN A CREDIT COST MODEL
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
