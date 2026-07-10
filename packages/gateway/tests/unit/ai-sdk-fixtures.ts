import { describe, expect, test } from "bun:test";
import type {
	LanguageModelV3,
	LanguageModelV3StreamPart,
	LanguageModelV3Usage,
	LanguageModelV4,
	LanguageModelV4StreamPart,
	LanguageModelV4Usage,
} from "@ai-sdk/provider";
import {
	type SupportedLanguageModel,
	withAutumn,
} from "../../src/ai-sdk/index.js";
import type { TrackTokensParams } from "../../src/shared/track.js";

const tokenCounts = {
	inputTokens: {
		total: 13,
		noCache: 10,
		cacheRead: 2,
		cacheWrite: 1,
	},
	outputTokens: {
		total: 7,
		text: 5,
		reasoning: 2,
	},
};

// Typed per spec version so a future divergence in either usage contract
// fails to compile instead of silently passing through the shared counts.
const usageV3: LanguageModelV3Usage = tokenCounts;
const usageV4: LanguageModelV4Usage = tokenCounts;

const expectedPools = {
	inputTokens: 10,
	outputTokens: 5,
	cacheReadTokens: 2,
	cacheWriteTokens: 1,
	reasoningTokens: 2,
};

const finishReason = { unified: "stop" as const, raw: "stop" };

const modelIdentity = {
	provider: "openai",
	modelId: "gpt-test",
	supportedUrls: {},
};

const textParts = [
	{ type: "text-start", id: "text-1" },
	{ type: "text-delta", id: "text-1", delta: "hello" },
	{ type: "text-end", id: "text-1" },
] as const;

const createStream = <TPart>(parts: TPart[]): ReadableStream<TPart> =>
	new ReadableStream<TPart>({
		start(controller) {
			for (const part of parts) {
				controller.enqueue(part);
			}
			controller.close();
		},
	});

const createAutumn = () => {
	const calls: TrackTokensParams[] = [];

	return {
		calls,
		autumn: {
			balances: {
				trackTokens: async (params: TrackTokensParams) => {
					calls.push(params);
				},
			},
		},
	};
};

export const createV3Model = (): LanguageModelV3 => ({
	specificationVersion: "v3",
	...modelIdentity,
	async doGenerate() {
		return {
			content: [{ type: "text", text: "hello" }],
			finishReason,
			usage: usageV3,
			warnings: [],
		};
	},
	async doStream() {
		return {
			stream: createStream<LanguageModelV3StreamPart>([
				...textParts,
				{ type: "finish", finishReason, usage: usageV3 },
			]),
		};
	},
});

export const createV4Model = (): LanguageModelV4 => ({
	specificationVersion: "v4",
	...modelIdentity,
	async doGenerate() {
		return {
			content: [{ type: "text", text: "hello" }],
			finishReason,
			usage: usageV4,
			warnings: [],
		};
	},
	async doStream() {
		return {
			stream: createStream<LanguageModelV4StreamPart>([
				...textParts,
				{ type: "finish", finishReason, usage: usageV4 },
			]),
		};
	},
});

type WithAutumnSuiteOptions<TModel extends SupportedLanguageModel> = {
	/** The AI SDK runtime under test, e.g. "ai v7". */
	runtimeLabel: string;
	expectedSpecVersion: TModel["specificationVersion"];
	createModel: () => TModel;
	// Method syntax keeps the params bivariant so both the ai v6 and ai v7
	// entrypoints satisfy the contract without erasing their own types.
	generateText(options: {
		model: TModel;
		prompt: string;
	}): Promise<{ text: string }>;
	streamText(options: { model: TModel; prompt: string }): {
		textStream: AsyncIterable<string>;
	};
};

/** Runs the withAutumn adapter assertions against one (runtime, model spec) pair. */
export const testWithAutumn = <TModel extends SupportedLanguageModel>({
	runtimeLabel,
	expectedSpecVersion,
	createModel,
	generateText,
	streamText,
}: WithAutumnSuiteOptions<TModel>) => {
	describe(`withAutumn under ${runtimeLabel} (${expectedSpecVersion} model)`, () => {
		test("preserves the wrapped model's identity", () => {
			const model = withAutumn({
				autumn: createAutumn().autumn,
				model: createModel(),
				customerId: "cus_test",
			});

			expect(model.specificationVersion).toBe(expectedSpecVersion);
			expect(model.provider).toBe("openai");
			expect(model.modelId).toBe("gpt-test");
		});

		test("tracks token usage from generateText", async () => {
			const { autumn, calls } = createAutumn();

			const model = withAutumn({
				autumn,
				model: createModel(),
				customerId: "cus_test",
				featureId: "ai_credits",
				entityId: "entity_test",
				properties: { source: "test" },
			});

			const result = await generateText({ model, prompt: "Say hello" });

			expect(result.text).toBe("hello");
			expect(calls).toEqual([
				{
					customerId: "cus_test",
					modelId: "openai/gpt-test",
					...expectedPools,
					featureId: "ai_credits",
					entityId: "entity_test",
					properties: { source: "test" },
				},
			]);
		});

		test("tracks token usage from streamText when the stream finishes", async () => {
			const { autumn, calls } = createAutumn();

			const model = withAutumn({
				autumn,
				model: createModel(),
				customerId: "cus_stream",
				providerId: "custom-openai",
			});

			const result = streamText({ model, prompt: "Say hello" });
			const chunks: string[] = [];

			for await (const chunk of result.textStream) {
				chunks.push(chunk);
			}

			expect(chunks.join("")).toBe("hello");
			expect(calls).toEqual([
				{
					customerId: "cus_stream",
					modelId: "custom-openai/gpt-test",
					...expectedPools,
				},
			]);
		});
	});
};
