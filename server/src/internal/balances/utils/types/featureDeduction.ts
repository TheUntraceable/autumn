import type { Feature } from "@autumn/shared";
export type FeatureDeduction = {
	feature: Feature;
	deduction: number;
	targetBalance?: number;
	inputTokens?: number;
	outputTokens?: number;
};
