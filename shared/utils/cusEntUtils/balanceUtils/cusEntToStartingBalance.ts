import { cusEntToCusPrice } from "@utils/cusEntUtils/convertCusEntUtils/cusEntToCusPrice";
import type { FullCusEntWithFullCusProduct } from "../../../models/cusProductModels/cusEntModels/cusEntWithProduct";
import type { AiTokenAllowance } from "../../../models/productModels/entModels/entModels";
import { entToOptions } from "../../productUtils/convertProductUtils";
import {
	getAiStartingBalance,
	getStartingBalance,
} from "../getStartingBalance";

export const cusEntToStartingBalance = ({
	cusEnt,
}: {
	cusEnt: FullCusEntWithFullCusProduct;
}) => {
	const cusPrice = cusEntToCusPrice({ cusEnt });
	const price = cusPrice?.price;
	const options = entToOptions({
		ent: cusEnt.entitlement,
		options: cusEnt.customer_product?.options ?? [],
	});

	return getStartingBalance({
		entitlement: cusEnt.entitlement,
		options,
		relatedPrice: price,
		productQuantity: cusEnt.customer_product?.quantity ?? 1,
	});
};

/** Returns the AI starting balance for a customer entitlement, or null if not an AI feature. */
export const cusEntToAiStartingBalance = ({
	cusEnt,
}: {
	cusEnt: FullCusEntWithFullCusProduct;
}): AiTokenAllowance | null => {
	return getAiStartingBalance({
		entitlement: cusEnt.entitlement,
		productQuantity: cusEnt.customer_product?.quantity ?? 1,
	});
};
