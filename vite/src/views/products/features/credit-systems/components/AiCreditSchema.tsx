import type { CreateFeature, CreditSchemaItem } from "@autumn/shared";
import { PlusIcon } from "@phosphor-icons/react";
import { useCallback, useRef, useState } from "react";
import { IconButton } from "@/components/v2/buttons/IconButton";
import { FormLabel } from "@/components/v2/form/FormLabel";
import { Input } from "@/components/v2/inputs/Input";
import type { OpenRouterModel } from "@/hooks/queries/useOpenRouterModels";
import { useOpenRouterModels } from "@/hooks/queries/useOpenRouterModels";
import { AiCreditSchemaRow } from "./AiCreditSchemaRow";

interface AiCreditSchemaProps {
	creditSystem: CreateFeature;
	setCreditSystem: (creditSystem: CreateFeature) => void;
}

export function AiCreditSchema({
	creditSystem,
	setCreditSystem,
}: AiCreditSchemaProps) {
	const { models, isLoading: modelsLoading } = useOpenRouterModels();
	const schema = creditSystem.config?.schema || [];

	const [defaultMarkup, setDefaultMarkup] = useState<number>(0);
	const manuallyEditedModels = useRef<Set<string>>(new Set());

	const handleModelChange = (index: number, model: OpenRouterModel) => {
		const isManuallyEdited =
			schema[index]?.metered_feature_id &&
			manuallyEditedModels.current.has(schema[index].metered_feature_id);
		const currentMarkup = isManuallyEdited
			? (schema[index]?.markup ?? 0)
			: defaultMarkup;
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

		if (item.metered_feature_id)
			manuallyEditedModels.current.add(item.metered_feature_id);

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

	const handleDefaultMarkupChange = useCallback(
		(value: number) => {
			setDefaultMarkup(value);
			const multiplier = 1 + value / 100;
			const newSchema = schema.map((item: CreditSchemaItem) => {
				if (
					item.metered_feature_id &&
					manuallyEditedModels.current.has(item.metered_feature_id)
				)
					return item;

				const model = models.find((m) => m.id === item.metered_feature_id);
				if (!model) return { ...item, markup: value };

				const actualInput =
					(Number.parseFloat(model.pricing.prompt) || 0) * 1_000_000;
				const actualOutput =
					(Number.parseFloat(model.pricing.completion) || 0) * 1_000_000;
				return {
					...item,
					markup: value,
					cost_per_million_input: actualInput * multiplier,
					cost_per_million_output: actualOutput * multiplier,
				};
			});
			setCreditSystem({
				...creditSystem,
				config: { ...creditSystem.config, schema: newSchema },
			});
		},
		[schema, models, creditSystem, setCreditSystem],
	);

	const addSchemaItem = () => {
		const usedModelIds = new Set(
			schema
				.map((item: CreditSchemaItem) => item.metered_feature_id)
				.filter(Boolean),
		);
		const availableModels = models.filter((m) => !usedModelIds.has(m.id));
		const suggestedModel = availableModels[0];

		const newItem = suggestedModel
			? {
					metered_feature_id: suggestedModel.id,
					markup: defaultMarkup,
					cost_per_million_input:
						(Number.parseFloat(suggestedModel.pricing.prompt) || 0) * 1_000_000,
					cost_per_million_output:
						(Number.parseFloat(suggestedModel.pricing.completion) || 0) *
						1_000_000,
				}
			: {
					metered_feature_id: "",
					markup: defaultMarkup,
					cost_per_million_input: 0,
					cost_per_million_output: 0,
				};

		const newSchema = [...schema, newItem];
		setCreditSystem({
			...creditSystem,
			config: { ...creditSystem.config, schema: newSchema },
		});
	};

	const removeSchemaItem = (index: number) => {
		const newSchema = [...schema];
		newSchema.splice(index, 1);
		setCreditSystem({
			...creditSystem,
			config: { ...creditSystem.config, schema: newSchema },
		});
	};

	return (
		<div className="flex flex-col gap-0">
			<div className="flex items-center gap-2 mb-3">
				<FormLabel className="whitespace-nowrap">Default Markup %</FormLabel>
				<Input
					type="number"
					lang="en"
					value={defaultMarkup}
					onChange={(e) =>
						handleDefaultMarkupChange(Number(e.target.value) || 0)
					}
					onBlur={(e) => handleDefaultMarkupChange(Number(e.target.value) || 0)}
					placeholder="0"
					className="w-24"
				/>
			</div>

			<div className="hidden lg:grid lg:grid-cols-[minmax(0,2fr)_auto_auto_auto_auto_auto_auto] gap-2 mb-1">
				<FormLabel className="truncate">Model</FormLabel>
				<FormLabel className="w-24">Actual In</FormLabel>
				<FormLabel className="w-24">Actual Out</FormLabel>
				<FormLabel className="w-20">Markup %</FormLabel>
				<FormLabel className="w-24">User In</FormLabel>
				<FormLabel className="w-24">User Out</FormLabel>
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
						onModelChange={handleModelChange}
						onMarkupChange={handleMarkupChange}
						onRemove={removeSchemaItem}
					/>
				))}
			</div>
			<p className="hidden lg:block text-xs text-t-tertiary my-2">
				All prices are in $/M tokens
			</p>

			<IconButton
				variant="muted"
				onClick={addSchemaItem}
				className="w-fit mt-4"
				icon={<PlusIcon />}
			>
				Add model
			</IconButton>
		</div>
	);
}
