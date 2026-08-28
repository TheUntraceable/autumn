import { z } from "zod/v4";
import { FeatureUsageType } from "../featureEnums";

export const CreditSchemaItemSchema = z.object({
	metered_feature_id: z.string(),
	feature_amount: z.number().optional(),
	credit_amount: z.number(),
});

const MarkupEntrySchema = z.object({
	markup: z.number().min(-100), // percentage markup, e.g. 20 for 20%, -100 for free
});

export const ProviderMarkupsSchema = z
	.record(
		z.string(), // Provider key from the model name, e.g. "openrouter" in "openrouter/anthropic/claude"
		MarkupEntrySchema,
	)
	.nullish();

export const CreditSystemConfigSchema = z.object({
	schema: z.array(
		z.object({
			metered_feature_id: z.string(),
			credit_amount: z.number(),
		}),
	),
	usage_type: z.nativeEnum(FeatureUsageType),
	default_markup: z.number().min(-100).optional(),
	provider_markups: ProviderMarkupsSchema,
});

/**
 * Per-token rate overrides ($/M tokens). Each pool falls back to the models.dev rate when
 * omitted, and an override wins over the model's long-context tier rate for that pool.
 */
export const RateOverridesSchema = z.object({
	input_cost: z.number().min(0).optional(), // required for custom/ models
	output_cost: z.number().min(0).optional(), // required for custom/ models
	cache_read_cost: z.number().min(0).optional(),
	cache_write_cost: z.number().min(0).optional(),
	audio_input_cost: z.number().min(0).optional(),
	audio_output_cost: z.number().min(0).optional(),
	reasoning_cost: z.number().min(0).optional(),
});

export const ModelMarkupsSchema = z
	.record(
		z.string(), // Represents the model name in "provider/model" format, e.g. "anthropic/claude-2"
		MarkupEntrySchema.extend({
			markup: z.number().min(-100).optional(), // Omit to inherit provider/global markup
		}).extend(RateOverridesSchema.shape),
	)
	.nullish();

export type CreditSystemConfig = z.infer<typeof CreditSystemConfigSchema>;
export type CreditSchemaItem = z.infer<typeof CreditSchemaItemSchema>;
export type ModelMarkups = z.infer<typeof ModelMarkupsSchema>;
export type ProviderMarkups = z.infer<typeof ProviderMarkupsSchema>;
export type RateOverrides = z.infer<typeof RateOverridesSchema>;

/** Rate override keys, in the order they are presented to users. */
export const RATE_OVERRIDE_FIELDS = [
	"input_cost",
	"output_cost",
	"cache_read_cost",
	"cache_write_cost",
	"audio_input_cost",
	"audio_output_cost",
	"reasoning_cost",
] as const satisfies readonly (keyof RateOverrides)[];

export type RateOverrideField = (typeof RATE_OVERRIDE_FIELDS)[number];
