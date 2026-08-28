import {
	joinModelId,
	type ModelsDevProvider,
	RATE_OVERRIDE_FIELDS,
	splitModelId,
} from "@autumn/shared";
import {
	cn,
	IconButton,
	Input,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@autumn/ui";
import { useStore } from "@tanstack/react-form";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { ChevronRightIcon, InfoIcon, PlusIcon, X } from "lucide-react";
import { useMemo } from "react";
import { Table } from "@/components/general/table";
import { useProductTable } from "@/views/products/hooks/useProductTable";
import type { CreditSystemFormInstance } from "../hooks/useCreditSystemForm";
import { useProviderMarkup } from "../hooks/useProviderMarkup";
import { addCustomModelMarkup } from "../utils/modelMarkupUtils";
import { AiModelSelectDropdown } from "./AiModelSelectDropdown";
import { CustomModelInput } from "./CustomModelInput";
import { EditableNumberCell } from "./EditableNumberCell";
import { RateOverridesPanel } from "./RateOverridesPanel";

interface ModelRow {
	fullId: string;
	modelKey: string;
}

/** Chevron that opens a model's rate-override panel, badged with how many pools it overrides. */
function ExpandRatesToggle({
	form,
	row,
}: {
	form: CreditSystemFormInstance;
	row: Row<ModelRow>;
}) {
	const overrideCount = useStore(form.store, (s) => {
		const entry = s.values.model_markups[row.original.fullId];
		return entry
			? RATE_OVERRIDE_FIELDS.filter((field) => entry[field] != null).length
			: 0;
	});
	const isExpanded = row.getIsExpanded();

	return (
		<button
			type="button"
			aria-label={isExpanded ? "Hide rate overrides" : "Show rate overrides"}
			aria-expanded={isExpanded}
			onClick={(e) => {
				e.stopPropagation();
				row.toggleExpanded();
			}}
			className="flex items-center gap-1 shrink-0 text-subtle hover:text-foreground"
		>
			<ChevronRightIcon
				className={cn(
					"h-3.5 w-3.5 transition-transform",
					isExpanded && "rotate-90",
				)}
			/>
			{overrideCount > 0 && (
				<span className="text-[10px] tabular-nums text-foreground">
					{overrideCount}
				</span>
			)}
		</button>
	);
}

function MarkupCell({
	form,
	fullId,
	providerKey,
}: {
	form: CreditSystemFormInstance;
	fullId: string;
	providerKey: string;
}) {
	const { inheritedMarkup } = useProviderMarkup(form, providerKey);

	return (
		<EditableNumberCell
			form={form}
			fullId={fullId}
			field="markup"
			useDefaultAsPlaceholder
			inheritedPlaceholder={inheritedMarkup}
			allowUndefined
		/>
	);
}

interface AiCreditSchemaTableProps {
	form: CreditSystemFormInstance;
	providerKey: string;
	providerName: string;
	modelFullIds: string[];
	provider: ModelsDevProvider;
	isLoading: boolean;
	removeKeys: (keys: string[]) => void;
	removeProvider: (providerKey: string) => void;
	setProviderMarkup: (providerKey: string, value: number | undefined) => void;
	renameKey: (oldKey: string, newKey: string) => void;
}

function formatCost(value: number | null | undefined): string {
	if (value == null) return "–";
	return value.toFixed(2);
}

/**
 * Read-only summary of what the row actually bills at: the override when the user set one,
 * otherwise the model's published rate. Editing happens in the expanded panel.
 */
function EffectiveRateCell({
	form,
	fullId,
	field,
	publishedCost,
}: {
	form: CreditSystemFormInstance;
	fullId: string;
	field: "input_cost" | "output_cost";
	publishedCost: number | null;
}) {
	const override = useStore(
		form.store,
		(s) => s.values.model_markups[fullId]?.[field],
	);
	const isOverridden = override != null;

	return (
		<span
			className={cn(
				"tabular-nums text-sm cursor-not-allowed select-none",
				isOverridden ? "text-foreground" : "text-subtle",
			)}
		>
			{formatCost(isOverridden ? override : publishedCost)}
		</span>
	);
}

export function AiCreditSchemaTable({
	form,
	providerKey,
	providerName,
	modelFullIds,
	provider,
	isLoading,
	removeKeys,
	removeProvider,
	setProviderMarkup,
	renameKey,
}: AiCreditSchemaTableProps) {
	const isCustom = providerKey === "custom";

	const { defaultMarkup, providerMarkup } = useProviderMarkup(
		form,
		providerKey,
	);

	const data: ModelRow[] = useMemo(
		() =>
			modelFullIds.map((fullId) => ({
				fullId,
				modelKey: splitModelId(fullId).modelKey,
			})),
		[modelFullIds.join(",")],
	);

	const columns: ColumnDef<ModelRow, unknown>[] = useMemo(
		() => [
			{
				header: "Model",
				accessorKey: "modelKey",
				size: 200,
				cell: ({ row }: { row: Row<ModelRow> }) => {
					const { modelKey } = row.original;
					return (
						<div className="flex items-center gap-1.5 min-w-0">
							<ExpandRatesToggle form={form} row={row} />
							{isCustom ? (
								<CustomModelInput
									modelKey={modelKey}
									onRename={(newKey) =>
										renameKey(
											joinModelId(providerKey, modelKey),
											joinModelId(providerKey, newKey),
										)
									}
								/>
							) : (
								<AiModelSelectDropdown
									value={modelKey}
									onValueChange={(newKey) =>
										renameKey(
											joinModelId(providerKey, modelKey),
											joinModelId(providerKey, newKey),
										)
									}
									provider={provider}
									isLoading={isLoading}
								/>
							)}
						</div>
					);
				},
			},
			{
				header: isCustom ? "In $/M" : "Input",
				id: "inputCost",
				size: 80,
				cell: ({ row }: { row: Row<ModelRow> }) => {
					const { fullId, modelKey } = row.original;
					if (isCustom) {
						return (
							<EditableNumberCell
								form={form}
								fullId={fullId}
								field="input_cost"
							/>
						);
					}
					return (
						<EffectiveRateCell
							form={form}
							fullId={fullId}
							field="input_cost"
							publishedCost={provider.models[modelKey]?.cost?.input ?? null}
						/>
					);
				},
			},
			{
				header: isCustom ? "Out $/M" : "Output",
				id: "outputCost",
				size: 80,
				cell: ({ row }: { row: Row<ModelRow> }) => {
					const { fullId, modelKey } = row.original;
					if (isCustom) {
						return (
							<EditableNumberCell
								form={form}
								fullId={fullId}
								field="output_cost"
							/>
						);
					}
					return (
						<EffectiveRateCell
							form={form}
							fullId={fullId}
							field="output_cost"
							publishedCost={provider.models[modelKey]?.cost?.output ?? null}
						/>
					);
				},
			},
			{
				header: "Markup %",
				id: "markup",
				size: 80,
				cell: ({ row }: { row: Row<ModelRow> }) => (
					<MarkupCell
						form={form}
						fullId={row.original.fullId}
						providerKey={providerKey}
					/>
				),
			},
			{
				header: "",
				accessorKey: "actions",
				size: 40,
				enableSorting: false,
				cell: ({ row }: { row: Row<ModelRow> }) => (
					<div
						className="flex justify-end"
						onClick={(e) => e.stopPropagation()}
					>
						<IconButton
							variant="skeleton"
							iconOrientation="center"
							icon={<X className="h-3.5 w-3.5" />}
							onClick={() => removeKeys([row.original.fullId])}
							className="!text-subtle hover:!text-foreground"
						/>
					</div>
				),
			},
		],
		[isCustom, provider, isLoading, providerKey, form],
	);

	const allModelsUsed =
		!isCustom && Object.keys(provider.models).length === modelFullIds.length;

	const table = useProductTable({
		data,
		columns,
		options: { getRowId: (row) => row.fullId, getRowCanExpand: () => true },
	});

	return (
		<div>
			<div className="flex items-center justify-between pb-3 pr-2">
				<span className="flex items-center gap-2 text-sm font-medium text-foreground">
					{providerName}
					{!isCustom && (
						<img
							src={`https://models.dev/logos/${providerKey}.svg`}
							alt={providerName}
							className="h-4 w-4 dark:invert opacity-40"
						/>
					)}
					{isCustom && (
						<Tooltip>
							<TooltipTrigger asChild>
								<InfoIcon className="h-3.5 w-3.5 text-muted-foreground opacity-40" />
							</TooltipTrigger>
							<TooltipContent>
								Use format{" "}
								<code className="text-[11px] bg-muted px-1 py-0.5 rounded">
									custom/modelId
								</code>{" "}
								in API tracking
							</TooltipContent>
						</Tooltip>
					)}
				</span>
				<div className="flex items-center gap-2">
					{!isCustom && (
						<div className="flex items-center gap-1.5">
							<span className="text-xs text-subtle">Markup %</span>
							<Input
								type="text"
								inputMode="numeric"
								value={providerMarkup == null ? "" : String(providerMarkup)}
								onChange={(e) => {
									const raw = e.target.value;
									if (raw === "" || /^-?\d*\.?\d*$/.test(raw)) {
										if (raw === "") {
											setProviderMarkup(providerKey, undefined);
										} else {
											const parsed = Number(raw);
											if (!Number.isNaN(parsed)) {
												setProviderMarkup(providerKey, parsed);
											}
										}
									}
								}}
								placeholder={String(defaultMarkup)}
								className="w-20"
							/>
						</div>
					)}
					<IconButton
						variant="skeleton"
						iconOrientation="center"
						icon={<X className="h-3.5 w-3.5" />}
						onClick={() => removeProvider(providerKey)}
						className="!text-subtle hover:!text-foreground"
					/>
				</div>
			</div>

			<div className="rounded-lg border shadow-card overflow-hidden">
				<Table.Provider
					config={{
						table,
						numberOfColumns: columns.length,
						isLoading: false,
						enableSorting: false,
						rowClassName: "h-10",
						flexibleTableColumns: true,
						renderExpandedRow: (row) => (
							<RateOverridesPanel
								form={form}
								fullId={row.original.fullId}
								cost={provider.models[row.original.modelKey]?.cost}
								isCustom={isCustom}
							/>
						),
					}}
				>
					<Table.Container>
						<Table.Content className="!rounded-none !border-0 !shadow-none">
							<Table.Header />
							<Table.Body />
						</Table.Content>
					</Table.Container>
				</Table.Provider>

				{!allModelsUsed && (
					<button
						type="button"
						onClick={() =>
							form.setFieldValue("model_markups", (prev) => {
								if (isCustom) {
									return addCustomModelMarkup(prev);
								}
								const usedKeys = new Set(
									Object.keys(prev)
										.filter((k) => splitModelId(k).provider === providerKey)
										.map((k) => splitModelId(k).modelKey),
								);
								const nextKey = Object.keys(provider.models).find(
									(k) => !usedKeys.has(k),
								);
								if (!nextKey) return prev;
								return { ...prev, [joinModelId(providerKey, nextKey)]: {} };
							})
						}
						className="flex items-center gap-1 w-full px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-interactive-secondary border-t border-border transition-colors"
					>
						<PlusIcon className="h-3 w-3" />
						New
					</button>
				)}
			</div>
		</div>
	);
}
