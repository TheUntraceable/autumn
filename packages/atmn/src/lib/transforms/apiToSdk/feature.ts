import type { Feature } from "../../../compose/models/featureModels.js";
import { createTransformer } from "./Transformer.js";

function mapCreditSchema(
	api: any,
): Array<{ meteredFeatureId: string; creditCost: number; featureAmount?: number }> {
	return (api.credit_schema ?? []).map((schemaItem: any) => {
		const meteredFeatureId =
			schemaItem.metered_feature_id ?? schemaItem.meteredFeatureId;
		const perUnitCreditCost =
			schemaItem.credit_cost ?? schemaItem.creditCost ?? undefined;
		const creditAmount =
			schemaItem.credit_amount ?? schemaItem.creditAmount ?? null;
		const hasExplicitCreditAmount =
			(schemaItem.credit_amount !== undefined &&
				schemaItem.credit_amount !== null) ||
			(schemaItem.creditAmount !== undefined &&
				schemaItem.creditAmount !== null);
		const featureAmount =
			schemaItem.feature_amount ?? schemaItem.featureAmount ?? undefined;
		const resolvedCreditValue = creditAmount ?? perUnitCreditCost;
		if (resolvedCreditValue === undefined || resolvedCreditValue === null) {
			const entryId = meteredFeatureId ?? "unknown";
			throw new Error(
				`Credit schema entry "${entryId}" must include credit_cost or credit_amount.`,
			);
		}
		const entry: {
			meteredFeatureId: string;
			creditCost: number;
			featureAmount?: number;
		} = {
			meteredFeatureId,
			creditCost: resolvedCreditValue,
		};
		if (hasExplicitCreditAmount && featureAmount !== undefined) {
			entry.featureAmount = featureAmount;
		}
		return entry;
	});
}

const BASE_COMPUTE = {
	eventNames: (api: any) =>
		api.event_names && api.event_names.length > 0 ? api.event_names : undefined,
};

/**
 * Declarative feature transformer - replaces 79 lines with 40 lines of config
 */
export const featureTransformer = createTransformer<any, Feature>({
	discriminator: "type",
	cases: {
		// Boolean features: just copy base fields, no consumable
		boolean: {
			copy: ["id", "name", "archived"],
			compute: {
				...BASE_COMPUTE,
				type: () => "boolean" as const,
			},
		},

		// Credit system features: always consumable
		credit_system: {
			copy: ["id", "name", "archived"],
			compute: {
				...BASE_COMPUTE,
				type: () => "credit_system" as const,
				consumable: () => true,
				creditSchema: mapCreditSchema,
			},
		},

		// Backend bug: API returns "single_use" instead of "metered" with consumable=true
		single_use: {
			copy: ["id", "name", "archived"],
			compute: {
				...BASE_COMPUTE,
				type: () => "metered" as const,
				consumable: () => true,
			},
		},

		// Backend bug: API returns "continuous_use" instead of "metered" with consumable=false
		continuous_use: {
			copy: ["id", "name", "archived"],
			compute: {
				...BASE_COMPUTE,
				type: () => "metered" as const,
				consumable: () => false,
			},
		},

		// If API ever returns "metered" properly
		metered: {
			copy: ["id", "name", "archived"],
			compute: {
				...BASE_COMPUTE,
				type: () => "metered" as const,
				consumable: (api) => api.consumable ?? true,
			},
		},
	},

	// Fallback for unknown types
	default: {
		copy: ["id", "name", "archived"],
		compute: {
			...BASE_COMPUTE,
			type: () => "metered" as const,
			consumable: () => true,
		},
	},
});

export function transformApiFeature(apiFeature: any): Feature {
	return featureTransformer.transform(apiFeature);
}
