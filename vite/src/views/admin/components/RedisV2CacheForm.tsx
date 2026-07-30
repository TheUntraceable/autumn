import { Badge, Separator } from "@autumn/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppForm } from "@/hooks/form/form";
import { useAxiosInstance } from "@/services/useAxiosInstance";
import { getBackendErr } from "@/utils/genUtils";
import {
	RedisCacheFormFooter,
	RedisInstanceSelect,
} from "./RedisCacheFormParts";
import {
	REDIS_V2_CACHE_QUERY_KEY,
	REDIS_V2_INSTANCE_OPTIONS,
	type RedisV2CacheConfig,
	type RedisV2InstanceName,
} from "./redisV2CacheConfigTypes";

export const RedisV2CacheForm = ({
	config,
	onClose,
}: {
	config: RedisV2CacheConfig;
	onClose: () => void;
}) => {
	const axiosInstance = useAxiosInstance();
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: async (activeInstance: RedisV2InstanceName) => {
			await axiosInstance.put("/admin/redis-v2-cache-config", {
				activeInstance,
			});
		},
		onSuccess: async (_data, activeInstance) => {
			await queryClient.invalidateQueries({
				queryKey: REDIS_V2_CACHE_QUERY_KEY,
			});
			toast.success(`Active V2 Redis set to "${activeInstance}"`);
			onClose();
		},
		onError: (error) => {
			toast.error(getBackendErr(error, "Failed to switch V2 Redis"));
		},
	});
	const form = useAppForm({
		defaultValues: { activeInstance: config.activeInstance },
		onSubmit: async ({ value }) => {
			await mutation.mutateAsync(value.activeInstance);
		},
	});

	return (
		<>
			<div className="flex flex-col gap-6">
				<form.Field name="activeInstance">
					{(field) => (
						<RedisInstanceSelect
							value={field.state.value}
							options={REDIS_V2_INSTANCE_OPTIONS}
							onChange={(value) => field.handleChange(value)}
						>
							<p className="text-xs text-tertiary-foreground">
								Currently serving traffic:{" "}
								<span className="font-mono text-foreground">
									{config.activeInstance}
								</span>
							</p>
						</RedisInstanceSelect>
					)}
				</form.Field>

				<div className="flex flex-col gap-3 text-xs text-tertiary-foreground">
					<Separator />
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="muted">
							{config.configHealthy ? "Config healthy" : "Config unavailable"}
						</Badge>
						{config.lastSuccessAt && (
							<span className="tabular-nums">
								Last refresh: {new Date(config.lastSuccessAt).toLocaleString()}
							</span>
						)}
					</div>
					<p className="text-pretty">
						{config.configConfigured === false
							? "S3 V2 Redis config is not configured. Traffic defaults to Upstash."
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
