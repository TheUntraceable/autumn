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
	onMarkupChange: (index: number, value: number) => void;
	onRemove: (index: number) => void;
}

function formatCost(value: number | null | undefined): string {
	if (value == null) return "–";
	return parseFloat(value.toFixed(6)).toString();
}

export function AiCreditSchemaRow({
	item,
	index,
	models,
	isLoading,
	onModelChange,
	onMarkupChange,
	onRemove,
}: AiCreditSchemaRowProps) {
	const model = models.find((m) => m.id === item.metered_feature_id);
	const actualInput = model
		? (Number.parseFloat(model.pricing.prompt) || 0) * 1_000_000
		: null;
	const actualOutput = model
		? (Number.parseFloat(model.pricing.completion) || 0) * 1_000_000
		: null;
	const markup = item.markup ?? 0;
	const userInput = item.cost_per_million_input;
	const userOutput = item.cost_per_million_output;

	return (
		<div className="grid grid-cols-[2fr_auto_auto_auto_auto_auto_auto] gap-2 items-center">
			<AiModelSelectDropdown
				value={item.metered_feature_id}
				onValueChange={(_modelId, selectedModel) =>
					onModelChange(index, selectedModel)
				}
				models={models}
				isLoading={isLoading}
			/>

			<Input
				readOnly
				value={formatCost(actualInput)}
				className="w-24 bg-muted/30 text-t-secondary cursor-default"
				tabIndex={-1}
			/>

			<Input
				readOnly
				value={formatCost(actualOutput)}
				className="w-24 bg-muted/30 text-t-secondary cursor-default"
				tabIndex={-1}
			/>

			<Input
				type="number"
				lang="en"
				value={markup}
				onChange={(e) => onMarkupChange(index, Number(e.target.value) || 0)}
				onBlur={(e) => onMarkupChange(index, Number(e.target.value) || 0)}
				placeholder="0"
				className="w-20"
			/>

			<Input
				readOnly
				value={formatCost(userInput)}
				className="w-24 bg-muted/30 text-t-secondary cursor-default"
				tabIndex={-1}
			/>

			<Input
				readOnly
				value={formatCost(userOutput)}
				className="w-24 bg-muted/30 text-t-secondary cursor-default"
				tabIndex={-1}
			/>

			<IconButton
				variant="skeleton"
				iconOrientation="center"
				icon={<X />}
				onClick={() => onRemove(index)}
			/>
		</div>
	);
}
