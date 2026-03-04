import { z } from "zod/v4";
import { FeatureUsageType } from "../featureEnums";

export const CreditSchemaItemSchema = z.object({
	metered_feature_id: z.string(),
	feature_amount: z.number().optional(),
	credit_amount: z.number().optional(),
	cost_per_million_input: z.number().optional(),
	cost_per_million_output: z.number().optional(),
	markup: z.number().optional(),
});

export const CreditSystemConfigSchema = z.object({
	schema: z.array(
		z
			.object({
				metered_feature_id: z.string(),
				// feature_amount: z.number(),
				credit_amount: z.number().optional(),
				cost_per_million_input: z.number().optional(),
				cost_per_million_output: z.number().optional(),
			})
			.refine((data) => {
				if (
					!data.credit_amount &&
					!data.cost_per_million_input &&
					!data.cost_per_million_output
				) {
					return false;
				}
				// Make cost_per_* and credit_amount mutually exclusive
				if (
					data.credit_amount &&
					(data.cost_per_million_input || data.cost_per_million_output)
				) {
					return false;
				}

				return true;
			}),
	),
	usage_type: z.nativeEnum(FeatureUsageType),
});

export type CreditSystemConfig = z.infer<typeof CreditSystemConfigSchema>;
export type CreditSchemaItem = z.infer<typeof CreditSchemaItemSchema>;
