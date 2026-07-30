import { describe, expect, test } from "bun:test";
import {
	formatMs,
	formatMsToDate,
	formatSeconds,
	formatSecondsToDate,
} from "./formatUnix";

// A fixed reference: 2021-06-15 12:34:56 UTC.
const REF_MS = Date.UTC(2021, 5, 15, 12, 34, 56);
const REF_SECONDS = REF_MS / 1000;

const DATE_RE = /^\d{2} [A-Za-z]{3} \d{4}$/;
const DATETIME_RE = /^\d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2}$/;
const DATETIME_NO_SECONDS_RE = /^\d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}$/;

describe("formatMsToDate", () => {
	test("returns 'undefined' for nullish input", () => {
		expect(formatMsToDate(undefined)).toBe("undefined");
		expect(formatMsToDate(null)).toBe("undefined");
		expect(formatMsToDate(0)).toBe("undefined");
	});

	test("formats a millisecond timestamp as a date", () => {
		expect(formatMsToDate(REF_MS)).toMatch(DATE_RE);
	});
});

describe("formatMs", () => {
	test("returns 'now' for the literal 'now'", () => {
		expect(formatMs("now")).toBe("now");
	});

	test("returns 'undefined' for nullish input", () => {
		expect(formatMs(undefined)).toBe("undefined");
		expect(formatMs(null)).toBe("undefined");
	});

	test("includes seconds by default", () => {
		expect(formatMs(REF_MS)).toMatch(DATETIME_RE);
	});

	test("excludes seconds when requested", () => {
		expect(formatMs(REF_MS, { excludeSeconds: true })).toMatch(
			DATETIME_NO_SECONDS_RE,
		);
	});
});

describe("formatSeconds", () => {
	test("returns sentinel for nullish (but not zero) input", () => {
		expect(formatSeconds(undefined)).toBe("undefined unix date");
		expect(formatSeconds(null)).toBe("undefined unix date");
	});

	test("formats zero as the epoch rather than the sentinel", () => {
		expect(formatSeconds(0)).toMatch(DATETIME_RE);
	});

	test("formats a seconds timestamp with time", () => {
		expect(formatSeconds(REF_SECONDS)).toMatch(DATETIME_RE);
	});
});

describe("formatSecondsToDate", () => {
	test("returns 'undefined' for nullish input", () => {
		expect(formatSecondsToDate(undefined)).toBe("undefined");
		expect(formatSecondsToDate(0)).toBe("undefined");
	});

	test("formats a seconds timestamp with time", () => {
		expect(formatSecondsToDate(REF_SECONDS)).toMatch(DATETIME_RE);
	});
});
