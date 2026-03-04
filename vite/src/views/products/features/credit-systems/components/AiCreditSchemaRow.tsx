import type { CreditSchemaItem } from "@autumn/shared";
import { X } from "lucide-react";
import { IconButton } from "@/components/v2/buttons/IconButton";
import { Input } from "@/components/v2/inputs/Input";
import type { OpenRouterModel } from "@/hooks/queries/useOpenRouterModels";
import { AiModelSelectDropdown } from "./AiModelSelectDropdown";

interface AiCreditSchemaRowProps {
	item: CreditSchemaItem;
	index: number;
	models: OpenRouterModel[];
	isLoading: boolean;
	onModelChange: (index: number, model: OpenRouterModel) => void;
	onCostChange: (
		index: number,
		key: "cost_per_million_input" | "cost_per_million_output",
		value: string | number,
	) => void;
	onRemove: (index: number) => void;
}

export function AiCreditSchemaRow({
	item,
	index,
	models,
	isLoading,
	onModelChange,
	onCostChange,
	onRemove,
}: AiCreditSchemaRowProps) {
	return (
		<div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
			<AiModelSelectDropdown
				value={item.metered_feature_id}
				onValueChange={(_modelId, model) => onModelChange(index, model)}
				models={models}
				isLoading={isLoading}
			/>

			<div className="flex flex-col gap-0.5">
				<Input
					type="number"
					lang="en"
					value={item.cost_per_million_input ?? ""}
					onChange={(e) =>
						onCostChange(index, "cost_per_million_input", e.target.value)
					}
					onBlur={(e) =>
						onCostChange(
							index,
							"cost_per_million_input",
							Number(e.target.value) || 0,
						)
					}
					placeholder="Input $/M"
					className="w-28"
				/>
			</div>

			<div className="flex flex-col gap-0.5">
				<Input
					type="number"
					lang="en"
					value={item.cost_per_million_output ?? ""}
					onChange={(e) =>
						onCostChange(index, "cost_per_million_output", e.target.value)
					}
					onBlur={(e) =>
						onCostChange(
							index,
							"cost_per_million_output",
							Number(e.target.value) || 0,
						)
					}
					placeholder="Output $/M"
					className="w-28"
				/>
			</div>

			<IconButton
				variant="skeleton"
				iconOrientation="center"
				icon={<X />}
				onClick={() => onRemove(index)}
			/>
		</div>
	);
}
