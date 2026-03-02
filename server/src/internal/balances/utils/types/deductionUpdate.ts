import type {
	AiTokenAllowance,
	EntityBalance,
	InsertReplaceable,
	Replaceable,
} from "@autumn/shared";

export interface DeductionUpdate {
	balance: number;
	additional_balance: number;
	additional_granted_balance?: number;
	entities: Record<string, EntityBalance>;
	adjustment: number;
	deducted: number;
	additional_deducted?: number;
	newReplaceables?: InsertReplaceable[];
	deletedReplaceables?: Replaceable[];
	/** For AI features: updated input/output token balance after deduction */
	ai_balance?: AiTokenAllowance;
}
