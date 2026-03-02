import { FeatureType } from "../../models/featureModels/featureEnums";
import type { Feature } from "../../models/featureModels/featureModels";
import {
	type AiTokenAllowance,
	AiTokenType,
} from "../../models/productModels/entModels/entModels";

/** Type guard: returns true if the feature is an AI feature. */
export const isAiFeature = (feature: Feature): boolean => {
	return feature.type === FeatureType.AI;
};

/** Type guard: returns true if the value is an AI token allowance object ({input, output}). */
export const isAiTokenAllowance = (
	value: unknown,
): value is AiTokenAllowance => {
	return (
		typeof value === "object" &&
		value !== null &&
		"input" in value &&
		"output" in value &&
		typeof (value as AiTokenAllowance).input === "number" &&
		typeof (value as AiTokenAllowance).output === "number"
	);
};

/** Extracts and validates AI token properties from a track request. */
export const extractAiTokenProperties = ({
	properties,
}: {
	properties?: Record<string, unknown>;
}): { input_tokens: number; output_tokens: number } | null => {
	if (!properties) return null;

	const inputTokens = properties.input_tokens;
	const outputTokens = properties.output_tokens;

	if (typeof inputTokens !== "number" || typeof outputTokens !== "number") {
		return null;
	}

	return { input_tokens: inputTokens, output_tokens: outputTokens };
};

/** Returns the token count for the given token type. */
export const getTokenCountForType = ({
	tokenType,
	inputTokens,
	outputTokens,
}: {
	tokenType: AiTokenType;
	inputTokens: number;
	outputTokens: number;
}): number => {
	return tokenType === AiTokenType.Input ? inputTokens : outputTokens;
};
