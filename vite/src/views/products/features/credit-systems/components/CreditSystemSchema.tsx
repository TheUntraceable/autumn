import type { CreateFeature, CreditSchemaItem, Feature } from "@autumn/shared";
import { FeatureType } from "@autumn/shared";
import { PlusIcon } from "@phosphor-icons/react";
import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { GroupedTabButton } from "@/components/v2/buttons/GroupedTabButton";
import { IconButton } from "@/components/v2/buttons/IconButton";
import { FormLabel } from "@/components/v2/form/FormLabel";
import { Input } from "@/components/v2/inputs/Input";
import { SheetSection } from "@/components/v2/sheets/SharedSheetComponents";
import { useFeaturesQuery } from "@/hooks/queries/useFeaturesQuery";
import type { OpenRouterModel } from "@/hooks/queries/useOpenRouterModels";
import { useOpenRouterModels } from "@/hooks/queries/useOpenRouterModels";
import { FeatureSelectDropdown } from "@/views/products/features/credit-systems/components/FeatureSelectDropdown";
import { AiCreditSchemaRow } from "./AiCreditSchemaRow";

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

interface CreditSystemSchemaProps {
	creditSystem: CreateFeature;
	setCreditSystem: (creditSystem: CreateFeature) => void;
}

export function CreditSystemSchema({
	creditSystem,
	setCreditSystem,
}: CreditSystemSchemaProps) {
	const { features } = useFeaturesQuery();
	const { models, isLoading: modelsLoading } = useOpenRouterModels();

	const schema = creditSystem.config?.schema || [];

	const [mode, setMode] = useState<CreditSchemaMode>(() =>
		deriveInitialMode(schema),
	);

	const hasSyncedFromPrefill = useRef(schema[0]?.metered_feature_id !== "");
	useEffect(() => {
		if (!hasSyncedFromPrefill.current && schema[0]?.metered_feature_id) {
			hasSyncedFromPrefill.current = true;
			setMode(deriveInitialMode(schema));
		}
	}, [schema]);

	const handleModeChange = (newMode: string) => {
		const typedMode = newMode as CreditSchemaMode;
		setMode(typedMode);

		if (typedMode === "ai") {
			setCreditSystem({
				...creditSystem,
				config: {
					...creditSystem.config,
					schema: [
						{
							metered_feature_id: "",
							cost_per_million_input: 0,
							cost_per_million_output: 0,
						},
					],
				},
			});
		} else {
			setCreditSystem({
				...creditSystem,
				config: {
					...creditSystem.config,
					schema: [
						{
							metered_feature_id: "",
							feature_amount: 1,
							credit_amount: 0,
						},
					],
				},
			});
		}
	};

	// Classic mode handlers
	const handleClassicSchemaChange = (
		index: number,
		key: keyof CreditSchemaItem,
		value: string | number,
	) => {
		const newSchema = [...schema];
		newSchema[index] = { ...newSchema[index], [key]: value };
		setCreditSystem({
			...creditSystem,
			config: { ...creditSystem.config, schema: newSchema },
		});
	};

	const addClassicSchemaItem = () => {
		const newSchema = [
			...schema,
			{
				metered_feature_id: "",
				feature_amount: 1,
				credit_amount: 0,
			},
		];
		setCreditSystem({
			...creditSystem,
			config: { ...creditSystem.config, schema: newSchema },
		});
	};

	const removeSchemaItem = (index: number) => {
		if (schema.length === 1) {
			toast.error("There must be at least one item in the credit system");
			return;
		}
		const newSchema = [...schema];
		newSchema.splice(index, 1);
		setCreditSystem({
			...creditSystem,
			config: { ...creditSystem.config, schema: newSchema },
		});
	};

	// AI mode handlers
	const handleAiModelChange = (index: number, model: OpenRouterModel) => {
		const currentMarkup = schema[index]?.markup ?? 0;
		const multiplier = 1 + currentMarkup / 100;
		const actualInput =
			(Number.parseFloat(model.pricing.prompt) || 0) * 1_000_000;
		const actualOutput =
			(Number.parseFloat(model.pricing.completion) || 0) * 1_000_000;
		const newSchema = [...schema];
		newSchema[index] = {
			...newSchema[index],
			metered_feature_id: model.id,
			markup: currentMarkup,
			cost_per_million_input: actualInput * multiplier,
			cost_per_million_output: actualOutput * multiplier,
		};
		setCreditSystem({
			...creditSystem,
			config: { ...creditSystem.config, schema: newSchema },
		});
	};

	const handleMarkupChange = (index: number, value: number) => {
		const item = schema[index];
		const model = models.find((m) => m.id === item.metered_feature_id);
		if (!model) return;
		const multiplier = 1 + value / 100;
		const actualInput =
			(Number.parseFloat(model.pricing.prompt) || 0) * 1_000_000;
		const actualOutput =
			(Number.parseFloat(model.pricing.completion) || 0) * 1_000_000;
		const newSchema = [...schema];
		newSchema[index] = {
			...item,
			markup: value,
			cost_per_million_input: actualInput * multiplier,
			cost_per_million_output: actualOutput * multiplier,
		};
		setCreditSystem({
			...creditSystem,
			config: { ...creditSystem.config, schema: newSchema },
		});
	};

	const addAiSchemaItem = () => {
		const newSchema = [
			...schema,
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
	};

	// Classic mode: filter out already-used metered features
	const allMeteredFeatures = features.filter(
		(feature: Feature) => feature.type === FeatureType.Metered,
	);

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
				<GroupedTabButton
					value={mode}
					onValueChange={handleModeChange}
					options={modeOptions}
					className="w-fit"
				/>

				{mode === "classic" ? (
					<div className="flex flex-col gap-0">
						<div className="grid grid-cols-2 gap-2">
							<FormLabel>Metered Feature</FormLabel>
							<FormLabel>Credit Cost</FormLabel>
						</div>

						<div className="flex flex-col gap-2">
							{schema.map((item: CreditSchemaItem, index: number) => {
								const availableFeatures = allMeteredFeatures.filter(
									(feature: Feature) =>
										!schema.some(
											(schemaItem: CreditSchemaItem) =>
												feature.id !== item.metered_feature_id &&
												schemaItem.metered_feature_id === feature.id,
										),
								);

								return (
									<div key={index} className="grid grid-cols-2 gap-2">
										<FeatureSelectDropdown
											value={item.metered_feature_id}
											onValueChange={(featureId) =>
												handleClassicSchemaChange(
													index,
													"metered_feature_id",
													featureId,
												)
											}
											availableFeatures={availableFeatures}
											allFeatures={allMeteredFeatures}
										/>

										<div className="flex gap-1">
											<Input
												type="number"
												lang="en"
												value={item.credit_amount || ""}
												onChange={(e) =>
													handleClassicSchemaChange(
														index,
														"credit_amount",
														e.target.value,
													)
												}
												onBlur={(e) =>
													handleClassicSchemaChange(
														index,
														"credit_amount",
														Number(e.target.value) || 0,
													)
												}
												placeholder="eg. 10"
											/>
											<IconButton
												variant="skeleton"
												iconOrientation="center"
												icon={<X />}
												onClick={() => removeSchemaItem(index)}
											/>
										</div>
									</div>
								);
							})}
						</div>

						<IconButton
							variant="muted"
							onClick={addClassicSchemaItem}
							disabled={schema.length >= allMeteredFeatures.length}
							className="w-fit mt-4"
							icon={<PlusIcon />}
						>
							Add
						</IconButton>
					</div>
				) : (
					<div className="flex flex-col gap-0">
						<div className="grid grid-cols-[2fr_auto_auto_auto_auto_auto_auto] gap-2 mb-1">
							<FormLabel>Model</FormLabel>
							<FormLabel className="w-24">Actual In $/M</FormLabel>
							<FormLabel className="w-24">Actual Out $/M</FormLabel>
							<FormLabel className="w-20">Markup %</FormLabel>
							<FormLabel className="w-24">User In $/M</FormLabel>
							<FormLabel className="w-24">User Out $/M</FormLabel>
							<div className="w-8" />
						</div>

						<div className="flex flex-col gap-2">
							{schema.map((item: CreditSchemaItem, index: number) => (
								<AiCreditSchemaRow
									key={index}
									item={item}
									index={index}
									models={models}
									isLoading={modelsLoading}
									onModelChange={handleAiModelChange}
									onMarkupChange={handleMarkupChange}
									onRemove={removeSchemaItem}
								/>
							))}
						</div>

						<IconButton
							variant="muted"
							onClick={addAiSchemaItem}
							className="w-fit mt-4"
							icon={<PlusIcon />}
						>
							Add model
						</IconButton>
					</div>
				)}
			</div>
		</SheetSection>
	);
}
