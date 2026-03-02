import { RecaseError } from "../base/RecaseError.js";
import { BalancesErrorCode } from "../codes/balancesErrCodes.js";

const buildInsufficientBalanceMessage = (opts?: {
	value: number;
	featureId?: string;
	eventName?: string;
	remainingInput?: number;
	remainingOutput?: number;
}): string => {
	const target = opts?.featureId
		? `feature ${opts.featureId}`
		: `event ${opts?.eventName}`;

	const isAi =
		opts?.remainingInput !== undefined || opts?.remainingOutput !== undefined;

	if (isAi) {
		const parts: string[] = [];
		if ((opts?.remainingInput ?? 0) > 0) {
			parts.push(`input (${opts!.remainingInput} tokens short)`);
		}
		if ((opts?.remainingOutput ?? 0) > 0) {
			parts.push(`output (${opts!.remainingOutput} tokens short)`);
		}
		return `Insufficient balance for ${target}: ${parts.join(" and ")}`;
	}

	return `Insufficient balance to deduct ${opts?.value} from ${target}`;
};

export class InsufficientBalanceError extends RecaseError {
	constructor(opts?: {
		message?: string;
		value: number;
		featureId?: string;
		eventName?: string;
		remainingInput?: number;
		remainingOutput?: number;
	}) {
		super({
			message: opts?.message || buildInsufficientBalanceMessage(opts),
			code: BalancesErrorCode.InsufficientBalance,
			statusCode: 400,
		});
		this.name = "InsufficientBalanceError";
	}
}
