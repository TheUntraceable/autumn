import { describe, expect, test } from "bun:test";
import { generateText, streamText } from "ai";
import { withAutumn } from "../../src/ai-sdk/index.js";
import {
	createAutumn,
	createV3Model,
	createV4Model,
	expectedPools,
} from "./ai-sdk-fixtures.js";

const modelFactories = [
	["v3", createV3Model],
	["v4", createV4Model],
] as const;

describe("withAutumn with AI SDK v7", () => {
	for (const [specVersion, createModel] of modelFactories) {
		describe(`${specVersion} model`, () => {
			test("preserves the wrapped model's identity", () => {
				const model = withAutumn({
					autumn: createAutumn().autumn,
					model: createModel(),
					customerId: "cus_test",
				});

				expect(model.specificationVersion).toBe(specVersion);
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
	}
});
