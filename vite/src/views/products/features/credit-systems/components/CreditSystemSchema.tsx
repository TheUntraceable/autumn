import { GroupedTabButton } from "@/components/v2/buttons/GroupedTabButton";
import { SheetSection } from "@/components/v2/sheets/SharedSheetComponents";
import type { OpenRouterModel } from "@/hooks/queries/useOpenRouterModels";
import { useOpenRouterModels } from "@/hooks/queries/useOpenRouterModels";
import type { CreateFeature, CreditSchemaItem } from "@autumn/shared";
import { useEffect, useMemo, useState } from "react";
import { AiCreditSchema } from "./AiCreditSchema";
import { ClassicCreditSchema } from "./ClassicCreditSchema";

type CreditSchemaMode = "classic" | "ai";

function deriveInitialMode(schema: CreditSchemaItem[]): CreditSchemaMode {
	if (schema.length === 0) return "classic";
	const firstItem = schema[0];
	if (
		firstItem.cost_per_million_input != null ||
		firstItem.cost_per_million_output != null
	)
		return "ai";
	return "classic";
}

function getFlagshipModels(models: OpenRouterModel[]): OpenRouterModel[] {
	const flagshipModels: OpenRouterModel[] = [];
	const interestedCompanies = ["anthropic", "openai", "google"];
	for (const company of interestedCompanies) {
		const companyModels = models
			.filter((model) => model.id.startsWith(company))
			.sort(
				(a, b) =>
					new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
			)
			.slice(0, 3);
		flagshipModels.push(...companyModels);
	}
	return flagshipModels;
}

interface CreditSystemSchemaProps {
	creditSystem: CreateFeature;
	setCreditSystem: (creditSystem: CreateFeature) => void;
	disableModeSwitch?: boolean;
}

export function CreditSystemSchema({
	creditSystem,
	setCreditSystem,
	disableModeSwitch = false,
}: CreditSystemSchemaProps) {
	const { models } = useOpenRouterModels();
	const schema = creditSystem.config?.schema || [];

	const [mode, setMode] = useState<CreditSchemaMode>(() =>
		deriveInitialMode(schema),
	);

	useEffect(() => {
		setMode(deriveInitialMode(schema));
	}, [schema]);

	const handleModeChange = (newMode: string) => {
		const typedMode = newMode as CreditSchemaMode;
		setMode(typedMode);

		if (typedMode === "ai") {
			const flagshipModels = getFlagshipModels(models);
			const newSchema =
				flagshipModels.length > 0
					? flagshipModels.map((model) => ({
							metered_feature_id: model.id,
							markup: 0,
							cost_per_million_input:
								(Number.parseFloat(model.pricing.prompt) || 0) * 1_000_000,
							cost_per_million_output:
								(Number.parseFloat(model.pricing.completion) || 0) * 1_000_000,
						}))
					: [
							{
								metered_feature_id: "",
								cost_per_million_input: 0,
								cost_per_million_output: 0,
							},
						];
			setCreditSystem({
				...creditSystem,
				config: { ...creditSystem.config, schema: newSchema },
			});
		} else {
			setCreditSystem({
				...creditSystem,
				config: {
					...creditSystem.config,
					schema: [
						{ metered_feature_id: "", feature_amount: 1, credit_amount: 0 },
					],
				},
			});
		}
	};

	const modeOptions = useMemo(
		() => [
			{ value: "classic", label: "Classic" },
			{ value: "ai", label: "AI" },
		],
		[],
	);

	return (
		<SheetSection
			title="Credit Schema"
			withSeparator={false}
			description={
				mode === "ai"
					? "Select AI models and set the price per million input and output tokens"
					: "When you track usage for these features, the value will be multiplied by the credit cost, then deducted from the balance"
			}
		>
			<div className="flex flex-col gap-3">
				{!disableModeSwitch && (
					<GroupedTabButton
						value={mode}
						onValueChange={handleModeChange}
						options={modeOptions}
						className="w-fit"
					/>
				)}

				{mode === "classic" ? (
					<ClassicCreditSchema
						creditSystem={creditSystem}
						setCreditSystem={setCreditSystem}
					/>
				) : (
					<AiCreditSchema
						creditSystem={creditSystem}
						setCreditSystem={setCreditSystem}
					/>
				)}
			</div>
		</SheetSection>
	);
}
