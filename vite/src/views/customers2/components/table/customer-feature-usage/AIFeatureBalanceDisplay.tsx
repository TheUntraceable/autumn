import type { AiTokenAllowance } from "@autumn/shared";
import { cn } from "@/lib/utils";

interface AIFeatureBalanceDisplayProps {
	aiBalance: AiTokenAllowance | null;
	aiAllowance: AiTokenAllowance | null;
	className?: string;
}

/**
 * Displays input/output token balances for AI features
 */
export function AIFeatureBalanceDisplay({
	aiBalance,
	aiAllowance,
	className,
}: AIFeatureBalanceDisplayProps) {
	const formatNumber = (num: number) => new Intl.NumberFormat().format(num);

	const inputBalance = aiBalance?.input ?? 0;
	const outputBalance = aiBalance?.output ?? 0;
	const inputAllowance = aiAllowance?.input ?? 0;
	const outputAllowance = aiAllowance?.output ?? 0;

	return (
		<div className={cn("flex flex-col gap-0.5", className)}>
			<div className="flex items-baseline gap-1">
				<span className="text-t3 text-tiny">in</span>
				<span className="text-t1">{formatNumber(inputBalance)}</span>
				{inputAllowance > 0 && (
					<span className="text-t4">/ {formatNumber(inputAllowance)} left</span>
				)}
			</div>
			<div className="flex items-baseline gap-1">
				<span className="text-t3 text-tiny">out</span>
				<span className="text-t1">{formatNumber(outputBalance)}</span>
				{outputAllowance > 0 && (
					<span className="text-t4">
						/ {formatNumber(outputAllowance)} left
					</span>
				)}
			</div>
		</div>
	);
}
