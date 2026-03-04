import {
	BillingInterval,
	FeatureUsageType,
	getFeatureName,
	Infinite,
	isContUseItem,
	isFeaturePriceItem,
	ProductItemInterval,
	UsageModel,
} from "@autumn/shared";
import { CoinsIcon } from "@phosphor-icons/react";
import { PanelButton } from "@/components/v2/buttons/PanelButton";
import { IncludedUsageIcon } from "@/components/v2/icons/AutumnIcons";
import { useFeaturesQuery } from "@/hooks/queries/useFeaturesQuery";
import { getFeature, isAiCreditSystem } from "@/utils/product/entitlementUtils";
import { useProductItemContext } from "@/views/products/product/product-item/ProductItemContext";

export function BillingType() {
	const { features } = useFeaturesQuery();
	const { item, setItem } = useProductItemContext();

	if (!item) return null;

	// Derive billing type from item state
	const isFeaturePrice = isFeaturePriceItem(item);

	// Determine if we should preselect based on explicit configuration
	const hasExplicitConfig =
		isFeaturePrice || // Has tiers, so it's priced
		(item.included_usage !== undefined && item.included_usage !== null) || // Has explicit included usage
		item.usage_model !== undefined; // Has explicit usage model

	const shouldPreselect = hasExplicitConfig;

	const setBillingType = (type: "included" | "priced") => {
		const getPricedInterval = () => {
			if (
				!Object.values(BillingInterval).includes(
					item.interval as unknown as BillingInterval,
				)
			) {
				return ProductItemInterval.Month;
			}
			return item.interval;
		};

		if (type === "included") {
			// Remove tiers to switch to included
			setItem({
				...item,
				tiers: null,
				billing_units: undefined,
				usage_model: undefined,
				included_usage: item.included_usage,
				interval: isContUseItem({ item, features }) ? null : item.interval,
			});
		} else {
			// Only switch if not already priced
			if (!isFeaturePrice) {
				// Add initial tier to switch to priced
				setItem({
					...item,
					tiers: [{ to: Infinite, amount: 0 }],
					billing_units: 1,
					usage_model: UsageModel.PayPerUse,
					included_usage:
						item.included_usage === Infinite ? 0 : item.included_usage,
					interval: getPricedInterval(),
				});
			}
		}
	};

	const feature = getFeature(item.feature_id ?? "", features);
	const isAiCredits = isAiCreditSystem({ feature });

	const featureName =
		getFeatureName({
			feature,
			plural: true,
		}) || "credits";
	const singleFeatureName =
		getFeatureName({
			feature,
			plural: false,
		}) || "credit";

	const usageType =
		feature?.config?.usage_type ||
		undefined; /* could be FeatureUsageType.Single or FeatureUsageType.Continuous */

	const isConsumable = usageType === FeatureUsageType.Single;
	const isAllocated = usageType === FeatureUsageType.Continuous;

	const getIncludedDescription = () => {
		if (isAiCredits)
			return "Set an included dollar amount of AI credits (eg, $50/month).";
		if (isConsumable)
			return `Set an included usage limit (eg, 100 ${featureName} per month).`;
		if (isAllocated) return `Set a usage limit (eg, 5 ${featureName}).`;
		return "Set a usage limit.";
	};

	const getPricedDescription = () => {
		if (isAiCredits)
			return "Charge for AI usage at model costs. Optionally include a credit amount.";
		if (isConsumable)
			return `Charge a price for usage (eg, $0.05 per ${singleFeatureName}).`;
		if (isAllocated)
			return `Charge a price based on usage (eg, $10 per ${singleFeatureName}).`;
		return "Charge a price based on usage.";
	};

	return (
		<div className="mt-3 space-y-4 billing-type-section">
			<div className="flex w-full items-center gap-4">
				<PanelButton
					isSelected={!isFeaturePrice}
					onClick={() => {
						setBillingType("included");
					}}
					icon={<IncludedUsageIcon size={18} color="currentColor" />}
				/>
				<div className="flex-1">
					<div className="text-body-highlight mb-1">Included</div>
					<div className="text-body-secondary leading-tight">
						{getIncludedDescription()}
					</div>
				</div>
			</div>

			<div className="flex w-full items-center gap-4">
				<PanelButton
					isSelected={shouldPreselect && isFeaturePrice}
					onClick={() => {
						setBillingType("priced");
					}}
					icon={<CoinsIcon size={16} color="currentColor" />}
				/>
				<div className="flex-1">
					<div className="text-body-highlight mb-1">Priced</div>
					<div className="text-body-secondary leading-tight">
						{getPricedDescription()}
					</div>
				</div>
			</div>
		</div>
	);
}
