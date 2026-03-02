import { AreaCheckbox } from "@/components/v2/checkboxes/AreaCheckbox";
import { FormLabel } from "@/components/v2/form/FormLabel";
import { Input } from "@/components/v2/inputs/Input";
import { SheetSection } from "@/components/v2/sheets/InlineSheet";
import { useProductItemContext } from "@/views/products/product/product-item/ProductItemContext";

export function AIFeatureSettings() {
	const { item, setItem } = useProductItemContext();

	if (
		!item ||
		typeof item.included_usage === "number" ||
		item.included_usage === "inf"
	)
		return null;

	const inputTokens = item.included_usage?.input || 0;
	const outputTokens = item.included_usage?.output || 0;
	const allowOverusage = item.config?.allow_overusage ?? false;

	return (
		<>
			<SheetSection title="Included Tokens">
				<div className="space-y-3">
					<div className="text-t3 text-sm">
						Set the number of tokens included in this plan. Users will be able
						to use these tokens without additional charges.
					</div>
					<div className="flex flex-col gap-4">
						<div>
							<FormLabel>Included Input Tokens</FormLabel>
							<Input
								type="number"
								placeholder="e.g. 100,000"
								value={inputTokens}
								onChange={(e) => {
									const value = e.target.value;
									const numValue = value === "" ? 0 : parseInt(value) || 0;
									setItem({
										...item,
										included_usage: { input: numValue, output: outputTokens },
									});
								}}
								className="w-xs"
							/>
						</div>
						<div>
							<FormLabel>Included Output Tokens</FormLabel>
							<Input
								type="number"
								placeholder="e.g. 100,000"
								value={outputTokens}
								onChange={(e) => {
									const value = e.target.value;
									const numValue = value === "" ? 0 : parseInt(value) || 0;
									setItem({
										...item,
										included_usage: { input: inputTokens, output: numValue },
									});
								}}
								className="w-xs"
							/>
						</div>
					</div>
				</div>
			</SheetSection>

			<SheetSection>
				<AreaCheckbox
					title="Allow Overusage"
					description="Allow users to exceed their included token limit. Additional tokens will be charged according to the feature's pricing configuration."
					checked={allowOverusage}
					onCheckedChange={(checked) => {
						setItem({
							...item,
							config: {
								...(item.config || {}),
								allow_overusage: checked,
							},
						});
					}}
				/>
			</SheetSection>
		</>
	);
}
