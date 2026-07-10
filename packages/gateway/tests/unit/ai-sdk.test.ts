import { generateText, streamText } from "ai";
import {
	createV3Model,
	createV4Model,
	testWithAutumn,
} from "./ai-sdk-fixtures.js";

testWithAutumn({
	runtimeLabel: "ai v7",
	expectedSpecVersion: "v3",
	createModel: createV3Model,
	generateText,
	streamText,
});

testWithAutumn({
	runtimeLabel: "ai v7",
	expectedSpecVersion: "v4",
	createModel: createV4Model,
	generateText,
	streamText,
});
