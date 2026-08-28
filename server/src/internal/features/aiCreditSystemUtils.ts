import {
	ErrCode,
	type Feature,
	isCustomModel,
	type ModelsDevCost,
	type ModelsDevCostTier,
	type ModelsDevModel,
	type ModelsDevProvider,
	RATE_OVERRIDE_FIELDS,
	type RateOverrideField,
	type RateOverrides,
	RecaseError,
	splitModelId,
} from "@autumn/shared";
import { Decimal } from "decimal.js";
import { getModelsDevPricing } from "@/internal/features/utils/getModelPricing.js";

export type TokenInput = {
	input: number;
	output: number;
	cacheRead?: number;
	cacheWrite?: number;
	audioInput?: number;
	audioOutput?: number;
	reasoning?: number;
};

type ModelPricingData = Record<string, ModelsDevProvider>;

const LARGE_CONTEXT_THRESHOLD = 200_000;

type ResolvedModel =
	| { custom: true }
	| {
			custom: false;
			providerKey: string;
			modelKey: string;
			model: ModelsDevModel;
	  };

const modelNotFoundError = (modelName: string) =>
	new RecaseError({
		message: `Model ${modelName} not found in models.dev pricing data`,
		code: ErrCode.InvalidRequest,
		statusCode: 400,
		data: { modelName },
	});

/**
 * Resolve a `model_id` to a models.dev entry by exact `<provider>/<model>` lookup. The id is
 * split on the first `/` (so openrouter slugs like `openrouter/openai/gpt-4o` keep their inner
 * `/`); the model key must match a models.dev entry exactly. `custom/` models skip resolution.
 */
const resolveModel = ({
	modelName,
	pricingData,
}: {
	modelName: string;
	pricingData: ModelPricingData;
}): ResolvedModel => {
	if (isCustomModel(modelName)) {
		return { custom: true };
	}

	const { provider, modelKey } = splitModelId(modelName);
	const model = provider ? pricingData[provider]?.models[modelKey] : undefined;
	if (!(provider && model)) {
		throw modelNotFoundError(modelName);
	}

	return { custom: false, providerKey: provider, modelKey, model };
};

/**
 * Resolve the effective per-token rates for a request, overlaying the active long-context
 * tier (or `context_over_200k`) onto the base rates. Tier-level `cache_read`/`cache_write`
 * override the base cache rates when present, so cache tokens above the threshold are billed
 * at the tier rate too — not just input/output.
 */
const getEffectiveCost = (
	cost: ModelsDevCost,
	totalInputTokens: number,
): { effective: ModelsDevCost; tierApplied: boolean } => {
	if (cost.tiers?.length) {
		let chosen: ModelsDevCostTier | undefined;
		for (const tier of cost.tiers) {
			if (
				totalInputTokens > tier.tier.size &&
				(!chosen || tier.tier.size > chosen.tier.size)
			) {
				chosen = tier;
			}
		}
		if (chosen) {
			return {
				effective: {
					...cost,
					input: chosen.input,
					output: chosen.output,
					cache_read: chosen.cache_read ?? cost.cache_read,
					cache_write: chosen.cache_write ?? cost.cache_write,
				},
				tierApplied: true,
			};
		}
		return { effective: cost, tierApplied: false };
	}
	if (cost.context_over_200k && totalInputTokens > LARGE_CONTEXT_THRESHOLD) {
		return {
			effective: {
				...cost,
				input: cost.context_over_200k.input,
				output: cost.context_over_200k.output,
				cache_read: cost.context_over_200k.cache_read ?? cost.cache_read,
				cache_write: cost.context_over_200k.cache_write ?? cost.cache_write,
			},
			tierApplied: true,
		};
	}
	return { effective: cost, tierApplied: false };
};

/** Effective per-token rates ($/M) used for a charge, after tier overlays and fallbacks. */
export type ModelCostRates = {
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	audioInput: number;
	audioOutput: number;
	reasoning: number;
};

export type ModelCostBreakdown = {
	cost: number;
	baseCost: number;
	markup: number;
	markupSource: "model" | "provider" | "default" | "none";
	tierApplied: boolean;
	rates: ModelCostRates;
	/** Pools priced from `model_markups` rather than the model's published rates. */
	overriddenPools: RateOverrideField[];
};

const listOverriddenPools = (
	overrides: RateOverrides | undefined,
): RateOverrideField[] =>
	overrides
		? RATE_OVERRIDE_FIELDS.filter((field) => overrides[field] != null)
		: [];

/**
 * Layer the org's per-pool rate overrides onto the model's effective rates. An override wins
 * over the tier rate for its pool, and pools with neither an override nor a published rate
 * fall back to the (possibly overridden) base text rate.
 */
const resolveRates = ({
	effective,
	overrides,
}: {
	effective: ModelsDevCost;
	overrides: RateOverrides | undefined;
}): ModelCostRates => {
	const input = overrides?.input_cost ?? effective.input;
	const output = overrides?.output_cost ?? effective.output;

	return {
		input,
		output,
		cacheRead: overrides?.cache_read_cost ?? effective.cache_read ?? input,
		cacheWrite: overrides?.cache_write_cost ?? effective.cache_write ?? input,
		audioInput: overrides?.audio_input_cost ?? effective.input_audio ?? input,
		audioOutput:
			overrides?.audio_output_cost ?? effective.output_audio ?? output,
		reasoning: overrides?.reasoning_cost ?? effective.reasoning ?? output,
	};
};

const computeCost = ({
	cost,
	tokens,
	markup,
	overrides,
}: {
	cost: ModelsDevCost;
	tokens: TokenInput;
	markup: number;
	overrides: RateOverrides | undefined;
}): {
	cost: number;
	baseCost: number;
	tierApplied: boolean;
	rates: ModelCostRates;
} => {
	const cacheRead = tokens.cacheRead ?? 0;
	const cacheWrite = tokens.cacheWrite ?? 0;
	const audioInput = tokens.audioInput ?? 0;
	const audioOutput = tokens.audioOutput ?? 0;
	const reasoning = tokens.reasoning ?? 0;

	const totalInput = tokens.input + cacheRead + cacheWrite;
	const { effective, tierApplied } = getEffectiveCost(cost, totalInput);

	const rates = resolveRates({ effective, overrides });

	const baseCost = new Decimal(rates.input)
		.mul(tokens.input)
		.add(new Decimal(rates.output).mul(tokens.output))
		.add(new Decimal(rates.cacheRead).mul(cacheRead))
		.add(new Decimal(rates.cacheWrite).mul(cacheWrite))
		.add(new Decimal(rates.audioInput).mul(audioInput))
		.add(new Decimal(rates.audioOutput).mul(audioOutput))
		.add(new Decimal(rates.reasoning).mul(reasoning))
		.div(1_000_000);

	return {
		cost: baseCost
			.mul(new Decimal(1).add(new Decimal(markup).div(100)))
			.toNumber(),
		baseCost: baseCost.toNumber(),
		tierApplied,
		rates,
	};
};

const resolveAiMarkup = ({
	modelName,
	creditSystem,
	modelMarkup,
}: {
	modelName: string;
	creditSystem: Feature;
	modelMarkup?: { markup?: number | null } | null;
}): { markup: number; source: ModelCostBreakdown["markupSource"] } => {
	if (modelMarkup?.markup != null) {
		return { markup: modelMarkup.markup, source: "model" };
	}

	const { provider } = splitModelId(modelName);
	const providerMarkup = provider
		? creditSystem.config?.provider_markups?.[provider]?.markup
		: undefined;
	if (providerMarkup != null) {
		return { markup: providerMarkup, source: "provider" };
	}

	const defaultMarkup = creditSystem.config?.default_markup;
	if (defaultMarkup != null) {
		return { markup: defaultMarkup, source: "default" };
	}

	return { markup: 0, source: "none" };
};

/**
 * Custom models have no published rates, so pools the user hasn't priced are explicitly zero
 * rather than falling back to the input rate — they bill nothing until given an override.
 */
const customModelCost = ({
	modelName,
	overrides,
}: {
	modelName: string;
	overrides: RateOverrides | undefined;
}): ModelsDevCost => {
	if (overrides?.input_cost == null || overrides?.output_cost == null) {
		throw new RecaseError({
			message: `Custom model ${modelName} is missing input_cost or output_cost in model_markups`,
			code: ErrCode.InvalidRequest,
			data: { modelName },
		});
	}

	return {
		input: overrides.input_cost,
		output: overrides.output_cost,
		cache_read: 0,
		cache_write: 0,
		input_audio: 0,
		output_audio: 0,
		reasoning: 0,
	};
};

export const getModelCreditCostBreakdown = async ({
	modelName,
	creditSystem,
	...tokens
}: {
	modelName: string;
	creditSystem: Feature;
} & TokenInput): Promise<ModelCostBreakdown> => {
	const markups = creditSystem.model_markups || {};
	const pricingData = await getModelsDevPricing();
	const resolved = resolveModel({ modelName, pricingData });

	const markupEntry = markups[modelName];
	const { markup, source } = resolveAiMarkup({
		modelName,
		creditSystem,
		modelMarkup: markupEntry,
	});

	const cost = resolved.custom
		? customModelCost({ modelName, overrides: markupEntry })
		: resolved.model.cost;

	const computed = computeCost({
		cost,
		tokens,
		markup,
		overrides: markupEntry,
	});
	return {
		...computed,
		markup,
		markupSource: source,
		overriddenPools: listOverriddenPools(markupEntry),
	};
};

export const getModelCreditCost = async (
	args: { modelName: string; creditSystem: Feature } & TokenInput,
): Promise<number> => (await getModelCreditCostBreakdown(args)).cost;
