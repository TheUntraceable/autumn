import { describe, expect, test } from "bun:test";
import { addSafe, subtractSafe } from "./mathUtils";

describe("addSafe", () => {
	test("adds two numbers", () => {
		expect(addSafe({ left: 2, right: 3 })).toBe(5);
	});

	test("avoids floating-point drift", () => {
		// 0.1 + 0.2 !== 0.3 with native floats.
		expect(0.1 + 0.2).not.toBe(0.3);
		expect(addSafe({ left: 0.1, right: 0.2 })).toBe(0.3);
	});

	test("treats nullish operands as zero", () => {
		expect(addSafe({ left: null, right: 5 })).toBe(5);
		expect(addSafe({ left: 5, right: undefined })).toBe(5);
		expect(addSafe({ left: null, right: undefined })).toBe(0);
	});

	test("handles negative values", () => {
		expect(addSafe({ left: -5, right: 3 })).toBe(-2);
	});
});

describe("subtractSafe", () => {
	test("subtracts two numbers", () => {
		expect(subtractSafe({ left: 5, right: 3 })).toBe(2);
	});

	test("avoids floating-point drift", () => {
		// 0.3 - 0.1 !== 0.2 with native floats.
		expect(0.3 - 0.1).not.toBe(0.2);
		expect(subtractSafe({ left: 0.3, right: 0.1 })).toBe(0.2);
	});

	test("treats nullish operands as zero", () => {
		expect(subtractSafe({ left: null, right: 5 })).toBe(-5);
		expect(subtractSafe({ left: 5, right: undefined })).toBe(5);
		expect(subtractSafe({ left: undefined, right: null })).toBe(0);
	});

	test("can produce negative results", () => {
		expect(subtractSafe({ left: 3, right: 10 })).toBe(-7);
	});
});
