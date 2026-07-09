import type { LanguageModelV3, LanguageModelV4 } from "@ai-sdk/provider";
import { type AutumnTrackingOptions, createTracker } from "../shared/track.js";
import { normalizeUsage, type UsageLike } from "./usage.js";

export type { AutumnClient, AutumnTrackingOptions } from "../shared/track.js";
export type { TokenPools } from "../shared/usage.js";
export type { UsageLike } from "./usage.js";

/** Language model spec versions supported by AI SDK v6 (V3) and v7 (V4). */
export type SupportedLanguageModel = LanguageModelV3 | LanguageModelV4;

export type WithAutumnOptions<
	TModel extends SupportedLanguageModel = SupportedLanguageModel,
> = AutumnTrackingOptions & {
	/** The AI SDK language model to wrap. */
	model: TModel;
	/** Override the provider prefix used in the model name (e.g. "openrouter", "custom"). Falls back to `model.provider`. */
	providerId?: string;
};

export const withAutumn = <TModel extends SupportedLanguageModel>({
	model,
	providerId,
	...tracking
}: WithAutumnOptions<TModel>): TModel => {
	const modelName = `${providerId ?? model.provider}/${model.modelId}`;
	const track = createTracker(tracking);

	const trackUsage = (usage: UsageLike) =>
		track(() => ({
			pools: normalizeUsage(usage, modelName),
			modelId: modelName,
		}));

	// The V3 and V4 specs are identical in every member this wrapper touches
	// (doGenerate/doStream shape, usage counts, the finish stream part), so the
	// wrapper operates on a V3 view of the model. The Proxy below forwards
	// everything else — including specificationVersion — so the wrapped model
	// keeps its own spec version and works with both AI SDK v6 and v7.
	const inner = model as LanguageModelV3;

	const doGenerate: LanguageModelV3["doGenerate"] = async (options) => {
		const result = await inner.doGenerate(options);
		await trackUsage(result.usage as UsageLike);
		return result;
	};

	const doStream: LanguageModelV3["doStream"] = async (options) => {
		const { stream, ...rest } = await inner.doStream(options);

		let trackingPromise: Promise<void> | undefined;

		type StreamChunk = typeof stream extends ReadableStream<infer T>
			? T
			: never;

		const transformStream = new TransformStream<StreamChunk, StreamChunk>({
			transform(chunk, controller) {
				if (chunk.type === "finish" && chunk.usage) {
					trackingPromise = trackUsage(chunk.usage as UsageLike);
				}
				controller.enqueue(chunk);
			},
			async flush() {
				await trackingPromise;
			},
		});

		return {
			stream: stream.pipeThrough(transformStream),
			...rest,
		};
	};

	return new Proxy(model, {
		get(target, property) {
			if (property === "doGenerate") {
				return doGenerate;
			}
			if (property === "doStream") {
				return doStream;
			}
			const value: unknown = Reflect.get(target, property);
			return typeof value === "function" ? value.bind(target) : value;
		},
	});
};
