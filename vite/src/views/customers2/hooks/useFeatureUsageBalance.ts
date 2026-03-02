import {
	ACTIVE_STATUSES,
	type AiTokenAllowance,
	cusEntsToAllowance,
	cusEntsToBalance,
	cusEntsToCurrentAiBalance,
	cusEntsToGrantedBalance,
	cusEntsToPrepaidQuantity,
	FeatureType,
	type FullCustomer,
	fullCustomerToCustomerEntitlements,
	nullish,
} from "@autumn/shared";

export interface FeatureUsageBalanceParams {
	fullCustomer: FullCustomer | null | undefined;
	featureId: string;
	entityId?: string | null;
}

export interface FeatureUsageBalanceResult {
	allowance: number;
	initialAllowance: number;
	balance: number;
	shouldShowOutOfBalance: boolean;
	shouldShowUsed: boolean;
	isUnlimited: boolean;
	usageType: string | undefined;
	quantity: number;
	cusEntsCount: number;
	/** For AI features: remaining { input, output } balance */
	aiBalance: AiTokenAllowance | null;
	/** For AI features: total { input, output } allowance */
	aiAllowance: AiTokenAllowance | null;
	isAiFeature: boolean;
}

/**
 * Calculates feature usage balance metrics from full customer (includes extra entitlements)
 */
export function useFeatureUsageBalance({
	fullCustomer,
	featureId,
	entityId,
}: FeatureUsageBalanceParams): FeatureUsageBalanceResult {
	const cusEnts = fullCustomer
		? fullCustomerToCustomerEntitlements({
				fullCustomer,
				featureId,
				inStatuses: ACTIVE_STATUSES,
			})
		: [];

	// Check if this is an AI feature
	const featureType = cusEnts[0]?.entitlement?.feature?.type;
	const isAi = featureType === FeatureType.AI;

	// AI-specific balance and allowance
	const aiBalance = isAi ? cusEntsToCurrentAiBalance({ cusEnts }) : null;
	const aiAllowance: AiTokenAllowance | null = isAi
		? cusEnts.reduce(
				(acc, cusEnt) => {
					const aiAlt = cusEnt.entitlement.ai_allowance;
					if (!aiAlt) return acc;
					const qty = cusEnt.customer_product?.quantity ?? 1;
					return {
						input: (acc?.input ?? 0) + (aiAlt.input ?? 0) * qty,
						output: (acc?.output ?? 0) + (aiAlt.output ?? 0) * qty,
					};
				},
				null as AiTokenAllowance | null,
			)
		: null;

	//without manual update adjustment, no rollovers
	const initialAllowance = cusEntsToAllowance({
		cusEnts,
		entityId: entityId ?? undefined,
		withRollovers: false,
	});

	//includes manual update adjustment
	const allowance = cusEntsToGrantedBalance({
		cusEnts,
		entityId: entityId ?? undefined,
		withRollovers: true,
	});

	const prepaidAllowance = cusEntsToPrepaidQuantity({
		cusEnts,
		sumAcrossEntities: nullish(entityId),
	});

	const balance = cusEntsToBalance({
		cusEnts,
		entityId: entityId ?? undefined,
		withRollovers: true,
	});

	const shouldShowOutOfBalance =
		allowance + prepaidAllowance > 0 || balance > 0;
	const shouldShowUsed =
		balance < 0 || ((balance ?? 0) === 0 && (allowance ?? 0) <= 0);

	const isUnlimited = cusEnts.some((e) => e.unlimited);
	const usageType = cusEnts[0]?.entitlement?.feature?.config?.usage_type;
	const quantity = cusEnts.reduce(
		(sum, e) => sum + (e.customer_product?.quantity ?? 1),
		0,
	);

	return {
		allowance: allowance + prepaidAllowance,
		initialAllowance: initialAllowance + prepaidAllowance,
		balance: balance ?? 0,
		shouldShowOutOfBalance,
		shouldShowUsed,
		isUnlimited,
		usageType,
		quantity,
		cusEntsCount: cusEnts.length,
		aiBalance,
		aiAllowance,
		isAiFeature: isAi,
	};
}
