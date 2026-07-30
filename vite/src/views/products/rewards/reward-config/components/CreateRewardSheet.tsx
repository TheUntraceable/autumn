import {
	Button,
	Sheet,
	SheetContent,
	SheetTrigger,
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
import { mapFrontendToApiReward } from "../../utils/rewardMappers";
import { isRewardFormValid } from "../../utils/rewardValidation";
import { RewardSheetBody } from "./RewardSheetBody";

interface CreateRewardSheetProps {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function CreateRewardSheet({
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
}: CreateRewardSheetProps = {}) {
	const axiosInstance = useAxiosInstance();
	const { refetch } = useRewardsQuery();
	const { features } = useFeaturesQuery();

	const [loading, setLoading] = useState(false);
	const [internalOpen, setInternalOpen] = useState(false);

	// Use controlled state if provided, otherwise use internal state
	const open = controlledOpen ?? internalOpen;
	const setOpen = controlledOnOpenChange ?? setInternalOpen;

	const reward = useRewardStore((s) => s.reward);
	const setReward = useRewardStore((s) => s.setReward);
	const reset = useRewardStore((s) => s.reset);

	// Reset state when sheet opens
	useEffect(() => {
		if (open) {
			reset();
		}
	}, [open, reset]);

	const formValid = isRewardFormValid({ reward, features });

	const handleCreate = async () => {
		if (!formValid) return;

		setLoading(true);
		try {
			const apiReward = mapFrontendToApiReward({
				frontendReward: reward,
				features,
			});

			await RewardService.createReward({
				axiosInstance,
				data: apiReward,
			});

			await refetch();
			toast.success("Reward created successfully");
			setOpen(false);
		} catch (error: unknown) {
			toast.error(
				getBackendErr(error as AxiosError, "Failed to create reward"),
			);
		} finally {
			setLoading(false);
		}
	};

	const handleCancel = () => {
		setOpen(false);
	};

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button variant="primary" size="default">
					Create Reward
				</Button>
			</SheetTrigger>
			<SheetContent className="flex flex-col overflow-hidden">
				<SheetHeader
					title="Create Reward"
					description="Create a discount or free plan reward"
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
						onClick={handleCreate}
						metaShortcut="enter"
						isLoading={loading}
						disabled={!formValid}
					>
						Create reward
					</ShortcutButton>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
