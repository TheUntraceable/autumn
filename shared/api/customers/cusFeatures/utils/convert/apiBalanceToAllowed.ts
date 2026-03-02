import type { ApiBalanceV1 } from "@api/customers/cusFeatures/apiBalanceV1";
import { apiBalanceV1ToAvailableOverage } from "@api/customers/cusFeatures/utils/convert/apiBalanceV1ToAvailableOverage";
import type { Feature } from "@models/featureModels/featureModels";
import {
	extractAiTokenProperties,
	isAiFeature,
	isBooleanFeature,
	notNullish,
} from "@utils/index";
import { Decimal } from "decimal.js";

export const apiBalanceToAllowed = ({
	apiBalance,
	feature,
	requiredBalance,
	properties,
}: {
	apiBalance: ApiBalanceV1;
	feature: Feature;
	requiredBalance: number;
	properties?: Record<string, unknown>;
}) => {
	if (!apiBalance) {
		return false;
	}

	// 1. Boolean
	if (isBooleanFeature({ feature })) {
		return true;
	}

	// 2. Unlimited
	if (apiBalance.unlimited) {
		return true;
	}

	// 3. Required balance is negative
	if (requiredBalance < 0) {
		return true;
	}

	// 4. AI feature: check input and output token balances independently
	if (isAiFeature(feature)) {
		const remaining = apiBalance.remaining;
		if (typeof remaining !== "object" || remaining === null) {
			return false;
		}

		if (apiBalance.overage_allowed) {
			return true;
		}

		const tokenProps = extractAiTokenProperties({ properties });
		if (!tokenProps) {
			// No token properties: allow if any tokens remain
			return remaining.input > 0 || remaining.output > 0;
		}

		return (
			remaining.input >= tokenProps.input_tokens &&
			remaining.output >= tokenProps.output_tokens
		);
	}

	const remaining = apiBalance.remaining;
	if (typeof remaining !== "number") {
		return false;
	}

	// 5. Overage allowed (non-AI)
	if (apiBalance.overage_allowed) {
		const availableOverage = apiBalanceV1ToAvailableOverage({ apiBalance });

		if (notNullish(availableOverage)) {
			return new Decimal(availableOverage).add(remaining).gte(requiredBalance);
		}

		return true;
	}

	// 6. Balance >= required balance
	if (new Decimal(remaining).gte(requiredBalance)) {
		return true;
	}

	return false;
};
