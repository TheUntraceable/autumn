import type { LanguageModelV3, LanguageModelV4 } from "@ai-sdk/provider";
import { createForwardingProxy } from "../shared/proxy.js";
import { type AutumnTrackingOptions, createTracker } from "../shared/track.js";
import { normalizeUsage, type UsageLike } from "./usage.js";

export type { AutumnClient, AutumnTrackingOptions } from "../shared/track.js";
export type { TokenPools } from "../shared/usage.js";
export type { UsageLike } from "./usage.js";

export type SupportedLanguageModel = LanguageModelV3 | LanguageModelV4;

/**
 * The wrapper reads only members that are identical across these spec
 * versions (doGenerate/doStream shape, usage counts, the finish stream part);
 * anything newer must be vetted before being let through.
 */
const SUPPORTED_SPEC_VERSIONS: ReadonlySet<string> = new Set(["v3", "v4"]);

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
	if (!SUPPORTED_SPEC_VERSIONS.has(model.specificationVersion)) {
		throw new Error(
			`[Autumn] Unsupported language model specification version "${model.specificationVersion}" — expected one of: ${[...SUPPORTED_SPEC_VERSIONS].join(", ")}.`,
		);
	}

	const modelName = `${providerId ?? model.provider}/${model.modelId}`;
	const track = createTracker(tracking);

	const trackUsage = (usage: UsageLike) =>
		track(() => ({
			pools: normalizeUsage(usage, modelName),
			modelId: modelName,
		}));

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

	return createForwardingProxy(model, { doGenerate, doStream });
};
