import {
	type ModelsDevCost,
	RATE_OVERRIDE_FIELDS,
	type RateOverrideField,
} from "@autumn/shared";
import { Button } from "@autumn/ui";
import { useStore } from "@tanstack/react-form";
import type { CreditSystemFormInstance } from "../hooks/useCreditSystemForm";
import { EditableNumberCell } from "./EditableNumberCell";

/** The numeric per-token rates on a models.dev cost entry. */
type RateKey =
	| "input"
	| "output"
	| "cache_read"
	| "cache_write"
	| "input_audio"
	| "output_audio"
	| "reasoning";

type RatePool = {
	field: RateOverrideField;
	label: string;
	rateKey: RateKey;
	/** Pool the rate falls back to when the model publishes no rate of its own. */
	fallsBackTo: "input" | "output" | null;
};

const RATE_POOLS: RatePool[] = [
	{ field: "input_cost", label: "Input", rateKey: "input", fallsBackTo: null },
	{
		field: "output_cost",
		label: "Output",
		rateKey: "output",
		fallsBackTo: null,
	},
	{
		field: "cache_read_cost",
		label: "Cache read",
		rateKey: "cache_read",
		fallsBackTo: "input",
	},
	{
		field: "cache_write_cost",
		label: "Cache write",
		rateKey: "cache_write",
		fallsBackTo: "input",
	},
	{
		field: "audio_input_cost",
		label: "Audio in",
		rateKey: "input_audio",
		fallsBackTo: "input",
	},
	{
		field: "audio_output_cost",
		label: "Audio out",
		rateKey: "output_audio",
		fallsBackTo: "output",
	},
	{
		field: "reasoning_cost",
		label: "Reasoning",
		rateKey: "reasoning",
		fallsBackTo: "output",
	},
];

/**
 * What the pool bills at with no override: the model's published rate, else the pool it falls
 * back to. Custom models publish nothing, so their unpriced pools bill nothing.
 */
function describeDefault({
	pool,
	cost,
	isCustom,
}: {
	pool: RatePool;
	cost: ModelsDevCost | undefined;
	isCustom: boolean;
}): string {
	const published = cost?.[pool.rateKey];
	if (published != null) return published.toFixed(2);
	if (isCustom) return pool.fallsBackTo ? "free" : "required";
	if (!cost) return "–";
	return pool.fallsBackTo ? `= ${pool.fallsBackTo}` : "–";
}

interface RateOverridesPanelProps {
	form: CreditSystemFormInstance;
	fullId: string;
	cost: ModelsDevCost | undefined;
	isCustom: boolean;
}

export function RateOverridesPanel({
	form,
	fullId,
	cost,
	isCustom,
}: RateOverridesPanelProps) {
	const entry = useStore(form.store, (s) => s.values.model_markups[fullId]);
	const hasOverrides = RATE_OVERRIDE_FIELDS.some(
		(field) => entry?.[field] != null,
	);

	const clearOverrides = () =>
		form.setFieldValue("model_markups", (prev) => {
			const next = { ...prev[fullId] };
			for (const field of RATE_OVERRIDE_FIELDS) delete next[field];
			return { ...prev, [fullId]: next };
		});

	return (
		<div className="border-t bg-interactive-secondary px-4 py-3">
			<div className="flex items-center justify-between pb-2">
				<span className="text-xs font-medium text-foreground">
					Rate overrides
					<span className="pl-1.5 font-normal text-subtle">$ / M tokens</span>
				</span>
				<Button
					variant="ghost"
					size="sm"
					disabled={!hasOverrides}
					onClick={clearOverrides}
					className="h-6 text-xs"
				>
					Reset all
				</Button>
			</div>

			<div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-6 gap-y-1">
				{RATE_POOLS.map((pool) => (
					<div
						key={pool.field}
						className="flex items-center justify-between gap-2 h-8"
					>
						<span className="text-xs text-subtle shrink-0">{pool.label}</span>
						<div className="flex items-center gap-2 min-w-0">
							<EditableNumberCell
								form={form}
								fullId={fullId}
								field={pool.field}
								placeholderText={describeDefault({ pool, cost, isCustom })}
								allowUndefined
								className="w-20 text-right tabular-nums"
							/>
						</div>
					</div>
				))}
			</div>

			<p className="pt-2 text-[11px] text-subtle">
				Empty uses the model's published rate. An override also replaces the
				long-context tier rate for that pool.
			</p>
		</div>
	);
}
