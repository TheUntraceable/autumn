import { LabelInput } from "@/components/v2/inputs/LabelInput";
import { SheetSection } from "@/components/v2/sheets/SharedSheetComponents";
import type { CreateFeature } from "@autumn/shared";

interface AIModelSchemaProps {
	aiFeature: CreateFeature;
	setAIFeature: (feature: CreateFeature) => void;
}

export function AIModelSchema({ aiFeature, setAIFeature }: AIModelSchemaProps) {
	return (
		<SheetSection title="Token Pricing">
			<div className="flex flex-col gap-4">
				<LabelInput
					label="Price per Million Tokens In"
					placeholder="0.00"
					type="number"
					step="0.0001"
					min="0"
					value={aiFeature.config?.price_per_million_tokens_in || ""}
					onChange={(e) => {
						const value = e.target.value
							? parseFloat(e.target.value)
							: undefined;
						setAIFeature({
							...aiFeature,
							config: {
								...aiFeature.config,
								price_per_million_tokens_in: value,
							},
						});
					}}
				/>

				<LabelInput
					label="Price per Million Tokens Out"
					placeholder="0.00"
					type="number"
					step="0.0001"
					min="0"
					value={aiFeature.config?.price_per_million_tokens_out || ""}
					onChange={(e) => {
						const value = e.target.value
							? parseFloat(e.target.value)
							: undefined;
						setAIFeature({
							...aiFeature,
							config: {
								...aiFeature.config,
								price_per_million_tokens_out: value,
							},
						});
					}}
				/>
			</div>
		</SheetSection>
	);
}
