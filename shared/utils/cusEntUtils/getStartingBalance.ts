import type { FeatureOptions } from "@models/cusProductModels/cusProductModels.js";
import type {
	AiTokenAllowance,
	Entitlement,
} from "@models/productModels/entModels/entModels.js";
import { BillingType } from "@models/productModels/priceModels/priceEnums.js";
import type { Price } from "@models/productModels/priceModels/priceModels.js";
import { getBillingType } from "@utils/productUtils/priceUtils.js";
import { nullish } from "@utils/utils.js";

/** Returns the AI token starting balance if the entitlement has ai_allowance set. */
export const getAiStartingBalance = ({
	entitlement,
	productQuantity,
}: {
	entitlement: Entitlement;
	productQuantity?: number;
}): AiTokenAllowance | null => {
	if (!entitlement.ai_allowance) return null;

	const multiplier = productQuantity || 1;
	return {
		input: entitlement.ai_allowance.input * multiplier,
		output: entitlement.ai_allowance.output * multiplier,
	};
};

export const getStartingBalance = ({
	entitlement,
	options,
	relatedPrice,
	productQuantity,
}: {
	entitlement: Entitlement;
	options?: FeatureOptions;
	relatedPrice?: Price;
	productQuantity?: number;
}) => {
	// 1. No related price
	if (!relatedPrice) {
		return (entitlement.allowance || 0) * (productQuantity || 1);
	}

	const config = relatedPrice.config;

	const billingType = getBillingType(config);
	if (billingType !== BillingType.UsageInAdvance) {
		return entitlement.allowance || 0;
	}

	const quantity = options?.quantity;
	const billingUnits = relatedPrice.config.billing_units;
	if (nullish(quantity) || nullish(billingUnits)) {
		return entitlement.allowance || 0;
	}

	try {
		return (entitlement.allowance || 0) + quantity * billingUnits;
	} catch (_error) {
		console.log(
			"WARNING: Failed to return quantity * billing units, returning allowance...",
		);
		return entitlement.allowance || 0;
	}
};
