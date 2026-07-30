import {
	Alert,
	AlertDescription,
	AlertTitle,
	Badge,
	Separator,
} from "@autumn/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppForm } from "@/hooks/form/form";
import { useAxiosInstance } from "@/services/useAxiosInstance";
import { getBackendErr } from "@/utils/genUtils";
import {
	MAIN_REDIS_CACHE_QUERY_KEY,
	MAIN_REDIS_INSTANCE_OPTIONS,
	type MainRedisCacheConfig,
	type MainRedisInstanceName,
} from "./mainRedisCacheConfigTypes";
import {
	RedisCacheFormFooter,
	RedisInstanceSelect,
} from "./RedisCacheFormParts";

export const MainRedisCacheForm = ({
	config,
	onClose,
}: {
	config: MainRedisCacheConfig;
	onClose: () => void;
}) => {
	const axiosInstance = useAxiosInstance();
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: async (activeInstance: MainRedisInstanceName) => {
			await axiosInstance.put("/admin/main-redis-cache-config", {
				activeInstance,
			});
		},
		onSuccess: async (_data, activeInstance) => {
			await queryClient.invalidateQueries({
				queryKey: MAIN_REDIS_CACHE_QUERY_KEY,
			});
			toast.success(`Active main Redis set to "${activeInstance}"`);
			onClose();
		},
		onError: (error) => {
			toast.error(getBackendErr(error, "Failed to switch main Redis"));
		},
	});
	const form = useAppForm({
		defaultValues: { activeInstance: config.activeInstance },
		onSubmit: async ({ value }) => {
			await mutation.mutateAsync(value.activeInstance);
		},
	});

	const fallbackUnavailable =
		!config.fallbackConfigured || config.fallbackStatus !== "ready";

	return (
		<>
			<div className="flex flex-col gap-6">
				<form.Field name="activeInstance">
					{(field) => (
						<RedisInstanceSelect
							value={field.state.value}
							options={MAIN_REDIS_INSTANCE_OPTIONS}
							onChange={(value) => field.handleChange(value)}
							isOptionDisabled={(option) =>
								option.value === "fallback" && fallbackUnavailable
							}
						/>
					)}
				</form.Field>

				<Alert>
					<AlertTitle>Switching drops in-flight state</AlertTitle>
					<AlertDescription>
						Locks and idempotency keys are not copied to the new instance. Only
						switch to a fallback that is already synchronized.
					</AlertDescription>
				</Alert>

				<div className="flex flex-col gap-3 text-xs text-tertiary-foreground">
					<Separator />
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="muted">
							{config.configHealthy ? "Config healthy" : "Config unavailable"}
						</Badge>
						<Badge variant="muted">
							Fallback:{" "}
							{config.fallbackConfigured
								? config.fallbackStatus
								: "not configured"}
						</Badge>
						{config.lastSuccessAt && (
							<span className="tabular-nums">
								Last refresh: {new Date(config.lastSuccessAt).toLocaleString()}
							</span>
						)}
					</div>
					<p className="text-pretty">
						{config.configConfigured === false
							? "S3 main Redis config is not configured. Traffic defaults to primary."
							: config.error ||
								"Changes propagate to servers, workers, and cron within 10 seconds."}
					</p>
				</div>
			</div>

			<form.Subscribe
				selector={(state) => ({
					activeInstance: state.values.activeInstance,
					isSubmitting: state.isSubmitting,
				})}
			>
				{({ activeInstance, isSubmitting }) => (
					<RedisCacheFormFooter
						error={mutation.error}
						isSubmitting={isSubmitting}
						saveDisabled={activeInstance === config.activeInstance}
						onSave={() => form.handleSubmit()}
						onClose={onClose}
					/>
				)}
			</form.Subscribe>
		</>
	);
};
