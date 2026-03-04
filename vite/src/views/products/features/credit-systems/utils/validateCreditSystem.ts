import type { CreateFeature } from "@autumn/shared";

export const validateCreditSystem = (
	creditSystem: CreateFeature,
): string | null => {
	if (!creditSystem.id || !creditSystem.name) {
		return "Please fill in all fields";
	}

	if (creditSystem.config.schema.length === 0) {
		return "Need at least one item in the schema";
	}

	for (const item of creditSystem.config.schema) {
		if (!item.metered_feature_id) {
			return "Select a feature or model for each row";
		}

		const isAiItem =
			item.cost_per_million_input != null ||
			item.cost_per_million_output != null;

		if (isAiItem) {
			if (
				(item.cost_per_million_input ?? 0) < 0 ||
				(item.cost_per_million_output ?? 0) < 0
			) {
				return "Token costs must be 0 or greater";
			}
		} else {
			if ((item.credit_amount ?? 0) <= 0) {
				return "Credit amount must be greater than 0";
			}
		}
	}

	return null;
};
