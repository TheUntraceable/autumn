import type { AiTokenAllowance, Feature } from "@autumn/shared";
export type FeatureDeduction = {
	feature: Feature;
	deduction: number;
	targetBalance?: number;
	/** For AI features: separate input/output token deductions */
	aiDeduction?: AiTokenAllowance;
};
