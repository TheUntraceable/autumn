import { generateText, streamText } from "ai-v6";
import { createV3Model, testWithAutumn } from "./ai-sdk-fixtures.js";

testWithAutumn({
	runtimeLabel: "ai v6",
	expectedSpecVersion: "v3",
	createModel: createV3Model,
	generateText,
	streamText,
});
