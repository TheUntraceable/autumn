import { IconButton } from "@/components/v2/buttons/IconButton";
import { Input } from "@/components/v2/inputs/Input";
import type { OpenRouterModel } from "@/hooks/queries/useOpenRouterModels";
import type { CreditSchemaItem } from "@autumn/shared";
import { X } from "lucide-react";
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
	return value.toFixed(2);
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
		<div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_auto_auto_auto_auto_auto_auto] gap-3 lg:gap-2 items-start lg:items-center p-3 lg:p-0 bg-muted/20 lg:bg-transparent rounded-md lg:rounded-none border lg:border-0 border-border/30">
			<div className="min-w-0 max-w-xs">
				<div className="text-xs font-medium text-t-tertiary mb-1 lg:hidden">
					Model
				</div>
				<AiModelSelectDropdown
					value={item.metered_feature_id}
					onValueChange={(_modelId, selectedModel) =>
						onModelChange(index, selectedModel)
					}
					models={models}
					isLoading={isLoading}
				/>
			</div>
			<div>
				<div className="text-xs font-medium text-t-tertiary mb-1 lg:hidden">
					Input
				</div>
				<Input
					readOnly
					value={formatCost(actualInput)}
					className="w-full lg:w-24 bg-background lg:bg-muted/30 text-t-secondary cursor-default"
					tabIndex={-1}
				/>
			</div>

			<div>
				<div className="text-xs font-medium text-t-tertiary mb-1 lg:hidden">
					Output
				</div>
				<Input
					readOnly
					value={formatCost(actualOutput)}
					className="w-full lg:w-24 bg-background lg:bg-muted/30 text-t-secondary cursor-default"
					tabIndex={-1}
				/>
			</div>

			<div>
				<div className="text-xs font-medium text-t-tertiary mb-1 lg:hidden">
					Markup
				</div>
				<Input
					type="number"
					lang="en"
					value={markup}
					onChange={(e) => onMarkupChange(index, Number(e.target.value) || 0)}
					onBlur={(e) => onMarkupChange(index, Number(e.target.value) || 0)}
					placeholder="0"
					className="w-full lg:w-20"
				/>
			</div>

			<div>
				<div className="text-xs font-medium text-t-tertiary mb-1 lg:hidden">
					User Input
				</div>
				<Input
					readOnly
					value={formatCost(userInput)}
					className="w-full lg:w-24 bg-background lg:bg-muted/30 text-t-secondary cursor-default"
					tabIndex={-1}
				/>
			</div>

			<div>
				<div className="text-xs font-medium text-t-tertiary mb-1 lg:hidden">
					User Output
				</div>
				<Input
					readOnly
					value={formatCost(userOutput)}
					className="w-full lg:w-24 bg-background lg:bg-muted/30 text-t-secondary cursor-default"
					tabIndex={-1}
				/>
			</div>

			<div className="flex justify-end lg:justify-center lg:items-center pt-6 lg:pt-0">
				<IconButton
					variant="skeleton"
					iconOrientation="center"
					icon={<X />}
					onClick={() => onRemove(index)}
				/>
			</div>
		</div>
	);
}
