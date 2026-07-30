import { type Feature, FeatureType } from "@autumn/shared";
import type { FrontendReward } from "@/views/products/rewards/types/frontendReward";

export const isRewardFormValid = ({
	reward,
	features,
}: {
	reward: FrontendReward;
	features: Feature[];
}) => {
	if (!reward.name || !reward.id) return false;
	if (!reward.rewardCategory) return false;

	if (reward.rewardCategory === "discount") {
		if (!reward.discountType) return false;
		const config = reward.discount_config;
		if (
			!config?.apply_to_all &&
			(!config?.price_ids || config.price_ids.length === 0)
		) {
			return false;
		}
	}

	if (reward.rewardCategory === "free_product" && !reward.free_product_id) {
		return false;
	}

	if (reward.rewardCategory === "feature_grant") {
		if (reward.featureGrantEntitlements.length === 0) return false;
		const featureIds = features.map((f) => f.id);
		if (
			reward.featureGrantEntitlements.some(
				(e) => !e.feature_id || !featureIds.includes(e.feature_id),
			)
		)
			return false;
		if (
			reward.featureGrantEntitlements.some((e) => {
				// Boolean features grant on/off access with no allowance
				const isBoolean =
					features.find((f) => f.id === e.feature_id)?.type ===
					FeatureType.Boolean;
				return !isBoolean && (!e.allowance || e.allowance <= 0);
			})
		)
			return false;
		if (
			!reward.promo_codes?.length ||
			!reward.promo_codes.some((pc) => pc.code)
		)
			return false;
	}

	return true;
};
