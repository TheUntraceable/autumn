import type { Feature } from "../../../compose/models/index.js";

export interface ApiFeatureParams {
	id: string;
	name: string;
	type: string;
	consumable?: boolean;
	archived?: boolean;
	event_names?: string[];
	credit_schema?: Array<{
		metered_feature_id: string;
		credit_cost: number;
	}>;
}

function getCreditCost({
	creditCost,
	featureAmount,
}: {
	creditCost: number;
	featureAmount?: number;
}): number {
	const normalizedFeatureAmount = featureAmount && featureAmount > 0 ? featureAmount : 1;
	return creditCost / normalizedFeatureAmount;
}

export function transformFeatureToApi(feature: Feature): ApiFeatureParams {
	const base: ApiFeatureParams = {
		id: feature.id,
		name: feature.name,
		type: feature.type,
	};

	if (feature.archived !== undefined) {
		base.archived = feature.archived;
	}

	if (feature.eventNames !== undefined) {
		base.event_names = feature.eventNames;
	}

	if (feature.type === "metered") {
		base.consumable = feature.consumable;
	}

	if (feature.type === "credit_system" && feature.creditSchema) {
		base.credit_schema = feature.creditSchema.map((entry) => ({
			metered_feature_id: entry.meteredFeatureId,
			credit_cost: getCreditCost({
				creditCost: entry.creditCost,
				featureAmount: entry.featureAmount,
			}),
		}));
	}

	return base;
}
