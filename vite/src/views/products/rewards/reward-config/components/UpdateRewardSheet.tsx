import type { Reward } from "@autumn/shared";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Sheet,
	SheetContent,
	ShortcutButton,
} from "@autumn/ui";
import type { AxiosError } from "axios";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	SheetFooter,
	SheetHeader,
} from "@/components/v2/sheets/SharedSheetComponents";
import { useFeaturesQuery } from "@/hooks/queries/useFeaturesQuery";
import { useRewardsQuery } from "@/hooks/queries/useRewardsQuery";
import { useRewardStore } from "@/hooks/stores/useRewardStore";
import { RewardService } from "@/services/products/RewardService";
import { useAxiosInstance } from "@/services/useAxiosInstance";
import { getBackendErr } from "@/utils/genUtils";
import {
	mapApiToFrontendReward,
	mapFrontendToApiReward,
} from "../../utils/rewardMappers";
import { isRewardFormValid } from "../../utils/rewardValidation";
import { RewardSheetBody } from "./RewardSheetBody";

interface UpdateRewardSheetProps {
	open: boolean;
	setOpen: (open: boolean) => void;
	selectedReward: Reward | null;
}

export function UpdateRewardSheet({
	open,
	setOpen,
	selectedReward,
}: UpdateRewardSheetProps) {
	const axiosInstance = useAxiosInstance();
	const { refetch } = useRewardsQuery();
	const { features } = useFeaturesQuery();

	const [loading, setLoading] = useState(false);
	const [confirmCouponOpen, setConfirmCouponOpen] = useState(false);

	const reward = useRewardStore((s) => s.reward);
	const setReward = useRewardStore((s) => s.setReward);
	const setBaseReward = useRewardStore((s) => s.setBaseReward);

	// Initialize reward store when selectedReward changes
	useEffect(() => {
		if (open && selectedReward) {
			const frontendReward = mapApiToFrontendReward({
				apiReward: selectedReward,
				features,
			});

			setReward(frontendReward);
			setBaseReward(frontendReward);
		}
	}, [open, selectedReward, setReward, setBaseReward]);

	const formValid = isRewardFormValid({ reward, features });

	const performUpdate = async () => {
		if (!selectedReward) return;

		setLoading(true);
		try {
			const apiReward = mapFrontendToApiReward({
				frontendReward: reward,
				features,
			});

			await RewardService.updateReward({
				axiosInstance,
				internalId: selectedReward.id,
				data: apiReward,
			});

			await refetch();
			toast.success("Reward updated successfully");
			setConfirmCouponOpen(false);
			setOpen(false);
		} catch (error: unknown) {
			toast.error(
				getBackendErr(error as AxiosError, "Failed to update reward"),
			);
		} finally {
			setLoading(false);
		}
	};

	const handleUpdate = async () => {
		if (!selectedReward || !formValid) return;

		// Stripe can't update coupons in place, so discount updates delete & recreate.
		if (reward.rewardCategory === "discount") {
			setConfirmCouponOpen(true);
			return;
		}

		await performUpdate();
	};

	const handleCancel = () => {
		setOpen(false);
	};

	return (
		<>
			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent className="flex flex-col overflow-hidden">
					<SheetHeader
						title="Update Reward"
						description="Modify your discount or free plan reward"
					/>

					<RewardSheetBody reward={reward} setReward={setReward} />

					<SheetFooter>
						<ShortcutButton
							variant="secondary"
							className="w-full"
							onClick={handleCancel}
							singleShortcut="escape"
						>
							Cancel
						</ShortcutButton>
						<ShortcutButton
							className="w-full"
							onClick={handleUpdate}
							metaShortcut="enter"
							isLoading={loading}
							disabled={!formValid}
						>
							Update reward
						</ShortcutButton>
					</SheetFooter>
				</SheetContent>
			</Sheet>

			<Dialog open={confirmCouponOpen} onOpenChange={setConfirmCouponOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Update coupon?</DialogTitle>
						<DialogDescription>
							Stripe doesn't have functionality to update coupons. This will
							delete it and recreate it. Existing customers that have this
							coupon will be unaffected.
						</DialogDescription>
					</DialogHeader>

					<DialogFooter className="grid grid-cols-2 gap-2">
						<ShortcutButton
							variant="secondary"
							className="w-full"
							onClick={() => setConfirmCouponOpen(false)}
							singleShortcut="escape"
							disabled={loading}
						>
							Cancel
						</ShortcutButton>
						<ShortcutButton
							className="w-full"
							onClick={performUpdate}
							metaShortcut="enter"
							isLoading={loading}
						>
							Confirm
						</ShortcutButton>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
