import {
	type AiTokenAllowance,
	ErrCode,
	FeatureNotFoundError,
	FeatureType,
	fullCustomerToCustomerEntitlements,
	orgToInStatuses,
	RecaseError,
	type UpdateBalanceParamsV0,
} from "@autumn/shared";
import { StatusCodes } from "http-status-codes";
import type { AutumnContext } from "@/honoUtils/HonoEnv.js";
import { CusEntService } from "@/internal/customers/cusProducts/cusEnts/CusEntitlementService.js";
import { deleteCachedApiCustomer } from "@/internal/customers/cusUtils/apiCusCacheUtils/deleteCachedApiCustomer.js";
import { getOrCreateCachedFullCustomer } from "@/internal/customers/cusUtils/fullCustomerCacheUtils/getOrCreateCachedFullCustomer.js";
import { buildCustomerEntitlementFilters } from "../utils/buildCustomerEntitlementFilters.js";

/**
 * Handles setting or adding to the ai_balance on a customer entitlement
 * for AI-type features (separate input/output token tracking).
 */
export const updateAiBalance = async ({
	ctx,
	params,
}: {
	ctx: AutumnContext;
	params: UpdateBalanceParamsV0;
}) => {
	const { features } = ctx;
	const { feature_id: featureId } = params;

	const feature = features.find((f) => f.id === featureId);
	if (!feature) {
		throw new FeatureNotFoundError({ featureId });
	}

	if (feature.type !== FeatureType.AI) {
		throw new RecaseError({
			message: `Feature ${featureId} is not an AI feature`,
			code: ErrCode.InvalidRequest,
			statusCode: StatusCodes.BAD_REQUEST,
		});
	}

	const customerEntitlementFilters = buildCustomerEntitlementFilters({
		params,
	});

	const fullCustomer = await getOrCreateCachedFullCustomer({
		ctx,
		params,
		source: "updateAiBalance",
	});

	const cusEnts = fullCustomerToCustomerEntitlements({
		fullCustomer,
		featureId,
		entity: fullCustomer.entity,
		inStatuses: orgToInStatuses({ org: ctx.org }),
		customerEntitlementFilters,
	});

	if (cusEnts.length === 0) {
		throw new RecaseError({
			message: `No entitlements found for feature ${featureId}, customer ${fullCustomer.id}`,
			code: ErrCode.InvalidRequest,
			statusCode: StatusCodes.BAD_REQUEST,
		});
	}

	const targetCusEnt = cusEnts[0];
	let newAiBalance: AiTokenAllowance;

	if (params.ai_balance) {
		// Set mode: set ai_balance directly
		newAiBalance = {
			input: params.ai_balance.input,
			output: params.ai_balance.output,
		};
	} else if (params.add_to_ai_balance) {
		// Add mode: add to current ai_balance
		const current = targetCusEnt.ai_balance ?? { input: 0, output: 0 };
		newAiBalance = {
			input: current.input + params.add_to_ai_balance.input,
			output: current.output + params.add_to_ai_balance.output,
		};
	} else {
		return;
	}

	await CusEntService.update({
		ctx,
		id: targetCusEnt.id,
		updates: { ai_balance: newAiBalance },
	});

	await deleteCachedApiCustomer({
		ctx,
		customerId: params.customer_id,
		source: "updateAiBalance",
	});
};
