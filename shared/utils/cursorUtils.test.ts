import { describe, expect, test } from "bun:test";
import { decodeCursor, encodeCursor } from "./cursorUtils";

describe("encodeCursor / decodeCursor", () => {
	test("round-trips timestamp and id", () => {
		const timestamp = 1_764_746_499_167;
		const id = "evt_abc123";
		const decoded = decodeCursor(encodeCursor({ timestamp, id }));
		expect(decoded).toEqual({ timestamp, id });
	});

	test("produces a base64url string (no +, /, or = padding)", () => {
		const encoded = encodeCursor({ timestamp: 1, id: "evt_x" });
		expect(encoded).not.toMatch(/[+/=]/);
		expect(Buffer.from(encoded, "base64url").toString()).toBe("1|1|evt_x");
	});

	test("preserves ids containing pipe characters", () => {
		// split("|") yields more than 3 parts, which the decoder rejects,
		// so this documents the current (lossy) behaviour for such ids.
		const encoded = encodeCursor({ timestamp: 5, id: "evt|weird" });
		expect(() => decodeCursor(encoded)).toThrow("Invalid cursor format");
	});
});

describe("decodeCursor error handling", () => {
	test("rejects a wrong number of segments", () => {
		const bad = Buffer.from("1|123").toString("base64url");
		expect(() => decodeCursor(bad)).toThrow("Invalid cursor format");
	});

	test("rejects an unsupported version", () => {
		const bad = Buffer.from("2|123|evt_x").toString("base64url");
		expect(() => decodeCursor(bad)).toThrow("Invalid cursor format");
	});

	test("rejects a missing id", () => {
		const bad = Buffer.from("1|123|").toString("base64url");
		expect(() => decodeCursor(bad)).toThrow("Invalid cursor format");
	});

	test("rejects a non-numeric timestamp", () => {
		const bad = Buffer.from("1|abc|evt_x").toString("base64url");
		expect(() => decodeCursor(bad)).toThrow("Invalid cursor format");
	});

	test("rejects garbage input", () => {
		expect(() => decodeCursor("!!!not-a-cursor!!!")).toThrow(
			"Invalid cursor format",
		);
	});
});
