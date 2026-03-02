import { Decimal } from "decimal.js";
import type { FullCustomerEntitlement } from "../../../models/cusProductModels/cusEntModels/cusEntModels";
import type { FullCusEntWithFullCusProduct } from "../../../models/cusProductModels/cusEntModels/cusEntWithProduct";
import type { AiTokenAllowance } from "../../../models/productModels/entModels/entModels";
import { AllowanceType } from "../../../models/productModels/entModels/entModels";
import { nullish, sumValues } from "../../utils";
import { isEntityScopedCusEnt } from "../classifyCusEntUtils";
import { getRolloverFields } from "../getRolloverFields";

export const cusEntToCurrentBalance = ({
	cusEnt,
	entityId,
	withRollovers = false,
}: {
	cusEnt: FullCustomerEntitlement;
	entityId?: string;
	withRollovers?: boolean;
}): number => {
	if (cusEnt.entitlement.allowance_type === AllowanceType.Unlimited) return 0;

	const getCusEntMainBalance = () => {
		if (isEntityScopedCusEnt(cusEnt)) {
			if (nullish(entityId)) {
				const entities = Object.values(cusEnt.entities ?? {});

				return sumValues(entities.map((entity) => Math.max(0, entity.balance)));
			} else {
				const entityBalance = cusEnt.entities?.[entityId]?.balance;

				return Math.max(0, entityBalance ?? 0);
			}
		}

		return Math.max(0, cusEnt.balance ?? 0);
	};

	const mainBalance = getCusEntMainBalance();

	const rollover = getRolloverFields({
		cusEnt,
		entityId,
	});

	if (withRollovers && rollover) {
		return new Decimal(mainBalance).add(rollover.balance).toNumber();
	}

	return mainBalance;
};

export const cusEntsToCurrentBalance = ({
	cusEnts,
	entityId,
	withRollovers = false,
}: {
	cusEnts: FullCusEntWithFullCusProduct[];
	entityId?: string;
	withRollovers?: boolean;
}) => {
	return sumValues(
		cusEnts.map((cusEnt) =>
			cusEntToCurrentBalance({ cusEnt, entityId, withRollovers }),
		),
	);
};

/** Returns the current AI token balance for a single cusEnt, or null if not an AI feature. */
export const cusEntToCurrentAiBalance = ({
	cusEnt,
}: {
	cusEnt: FullCustomerEntitlement;
}): AiTokenAllowance | null => {
	if (!cusEnt.ai_balance) return null;
	return {
		input: Math.max(0, cusEnt.ai_balance.input ?? 0),
		output: Math.max(0, cusEnt.ai_balance.output ?? 0),
	};
};

/** Sums AI token balances across multiple cusEnts. Returns null if none have ai_balance. */
export const cusEntsToCurrentAiBalance = ({
	cusEnts,
}: {
	cusEnts: FullCusEntWithFullCusProduct[];
}): AiTokenAllowance | null => {
	let hasAny = false;
	let totalInput = 0;
	let totalOutput = 0;

	for (const cusEnt of cusEnts) {
		const aiBal = cusEntToCurrentAiBalance({ cusEnt });
		if (aiBal) {
			hasAny = true;
			totalInput += aiBal.input;
			totalOutput += aiBal.output;
		}
	}

	if (!hasAny) return null;
	return { input: totalInput, output: totalOutput };
};
