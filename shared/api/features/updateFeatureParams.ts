import { z } from "zod/v4";
import { ApiFeatureType } from "./prevVersions/apiFeatureV0.js";

export const UpdateFeatureParamsSchema = z.object({
	id: z.string().optional(),
	name: z.string().nullish(),
	type: z.enum(ApiFeatureType).optional(),
	archived: z.boolean().optional(),

	credit_schema: z
		.array(
			z.object({
				metered_feature_id: z.string(),
				credit_cost: z.number().optional(),
				cost_per_million_input: z.number().optional(),
				cost_per_million_output: z.number().optional(),
			}),
		)
		.nullish()
		.refine(
			(items) =>
				!items ||
				items.every(
					(item) =>
						typeof item.credit_cost === "number" ||
						typeof item.cost_per_million_input === "number" ||
						typeof item.cost_per_million_output === "number" ||
						(typeof item.credit_cost === "number" &&
							typeof item.cost_per_million_input === "number" &&
							typeof item.cost_per_million_output === "number"),
				),
			{
				message:
					"Each credit_schema item must include credit_cost or cost_per_million_input/output and are mutually exclusive",
			},
		),

	display: z
		.object({
			singular: z.string(),
			plural: z.string(),
		})
		.optional(),

	event_names: z.array(z.string()).optional(),
});

export type UpdateFeatureParams = z.infer<typeof UpdateFeatureParamsSchema>;
