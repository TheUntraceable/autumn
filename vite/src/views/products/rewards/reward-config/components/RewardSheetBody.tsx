import type { FrontendReward } from "../../types/frontendReward";
import { DiscountRewardConfig } from "./DiscountRewardConfig";
import { FeatureGrantRewardConfig } from "./FeatureGrantRewardConfig";
import { FreeProductRewardConfig } from "./FreeProductRewardConfig";
import { RewardDetails } from "./RewardDetails";
import { SelectRewardType } from "./SelectRewardType";

export const RewardSheetBody = ({
	reward,
	setReward,
}: {
	reward: FrontendReward;
	setReward: (reward: FrontendReward) => void;
}) => (
	<div className="flex-1 overflow-y-auto">
		<RewardDetails reward={reward} setReward={setReward} />
		<SelectRewardType reward={reward} setReward={setReward} />

		{reward.rewardCategory === "discount" && (
			<DiscountRewardConfig reward={reward} setReward={setReward} />
		)}

		{reward.rewardCategory === "free_product" && (
			<FreeProductRewardConfig reward={reward} setReward={setReward} />
		)}

		{reward.rewardCategory === "feature_grant" && (
			<FeatureGrantRewardConfig reward={reward} setReward={setReward} />
		)}
	</div>
);
