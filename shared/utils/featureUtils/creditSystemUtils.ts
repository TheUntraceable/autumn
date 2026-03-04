import type { CreditSchemaItem } from "../../models/featureModels/featureConfig/creditConfig.js";
import { FeatureType } from "../../models/featureModels/featureEnums.js";
import type { Feature } from "../../models/featureModels/featureModels.js";

/**
 * Normalises AI model names so variant formats resolve to the same key.
 */
export const normaliseAiModelName = (modelName: string): string => {
	return modelName
		.toLowerCase()
		.replace(/\./g, "-") // claude-opus-4.6 → claude-opus-4-6
		.replace(/-\d{8}$/, "") // strip trailing dates like -20251001
		.replace(/^[a-z]+\//, ""); // strip provider prefix: anthropic/claude → claude
};

export const creditSystemContainsFeature = ({
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
