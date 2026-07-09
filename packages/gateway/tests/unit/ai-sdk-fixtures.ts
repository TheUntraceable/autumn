import type {
	LanguageModelV3,
	LanguageModelV3Usage,
	LanguageModelV4,
} from "@ai-sdk/provider";

export type TrackTokensParams = {
	customerId: string;
	modelId: string;
	inputTokens: number;
	outputTokens: number;
	cacheReadTokens?: number;
	cacheWriteTokens?: number;
	reasoningTokens?: number;
	featureId?: string;
	entityId?: string;
	properties?: Record<string, unknown>;
};

export const usage: LanguageModelV3Usage = {
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

export const expectedPools = {
	inputTokens: 10,
	outputTokens: 5,
	cacheReadTokens: 2,
	cacheWriteTokens: 1,
	reasoningTokens: 2,
};

const finishReason = { unified: "stop" as const, raw: "stop" };

export const createAutumn = () => {
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

const createModelMethods = () => ({
	provider: "openai",
	modelId: "gpt-test",
	supportedUrls: {},
	async doGenerate() {
		return {
			content: [{ type: "text" as const, text: "hello" }],
			finishReason,
			usage,
			warnings: [],
		};
	},
	async doStream() {
		return {
			stream: new ReadableStream({
				start(controller) {
					controller.enqueue({ type: "text-start", id: "text-1" });
					controller.enqueue({
						type: "text-delta",
						id: "text-1",
						delta: "hello",
					});
					controller.enqueue({ type: "text-end", id: "text-1" });
					controller.enqueue({ type: "finish", finishReason, usage });
					controller.close();
				},
			}),
		};
	},
});

export const createV3Model = (): LanguageModelV3 => ({
	specificationVersion: "v3",
	...createModelMethods(),
});

export const createV4Model = (): LanguageModelV4 => ({
	specificationVersion: "v4",
	...createModelMethods(),
});
