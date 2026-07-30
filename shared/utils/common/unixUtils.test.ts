import { describe, expect, test } from "bun:test";
import {
	isFutureStartDate,
	isPastStartDate,
	isValidMsTimestamp,
	ms,
	msToSeconds,
	seconds,
	secondsToMs,
	stripePhaseStartsInFuture,
	timestampsMatch,
	truncateMsToSecondPrecision,
} from "./unixUtils";

describe("ms", () => {
	test("converts each unit to milliseconds", () => {
		expect(ms.seconds(1)).toBe(1000);
		expect(ms.minutes(1)).toBe(60_000);
		expect(ms.hours(1)).toBe(3_600_000);
		expect(ms.days(1)).toBe(86_400_000);
		expect(ms.weeks(1)).toBe(604_800_000);
		expect(ms.months(1)).toBe(2_592_000_000);
	});

	test("scales linearly", () => {
		expect(ms.minutes(2)).toBe(2 * 60_000);
	});
});

describe("seconds", () => {
	test("converts each unit to seconds", () => {
		expect(seconds.minutes(1)).toBe(60);
		expect(seconds.hours(1)).toBe(3600);
		expect(seconds.days(1)).toBe(86_400);
		expect(seconds.weeks(1)).toBe(604_800);
		expect(seconds.months(1)).toBe(2_592_000);
	});
});

describe("isValidMsTimestamp", () => {
	test("accepts millisecond-scale timestamps", () => {
		expect(isValidMsTimestamp(Date.now())).toBe(true);
		expect(isValidMsTimestamp(1_000_000_000_000)).toBe(true);
	});

	test("rejects second-scale timestamps as too small", () => {
		expect(isValidMsTimestamp(1_700_000_000)).toBe(false);
		expect(isValidMsTimestamp(999_999_999_999)).toBe(false);
	});

	test("rejects timestamps that are too large", () => {
		expect(isValidMsTimestamp(10_000_000_000_001)).toBe(false);
	});
});

describe("secondsToMs", () => {
	test("multiplies valid seconds by 1000", () => {
		expect(secondsToMs(1_700_000_000)).toBe(1_700_000_000_000);
		expect(secondsToMs(0)).toBe(0);
	});

	test("passes undefined through", () => {
		expect(secondsToMs(undefined)).toBeUndefined();
	});

	test("rejects out-of-range values", () => {
		expect(secondsToMs(-1)).toBeUndefined();
		expect(secondsToMs(10_000_000_001)).toBeUndefined();
	});
});

describe("msToSeconds", () => {
	test("floors milliseconds to whole seconds", () => {
		expect(msToSeconds(1500)).toBe(1);
		expect(msToSeconds(1999)).toBe(1);
		expect(msToSeconds(2000)).toBe(2);
	});
});

describe("truncateMsToSecondPrecision", () => {
	test("removes the sub-second component", () => {
		expect(truncateMsToSecondPrecision(1234)).toBe(1000);
		expect(truncateMsToSecondPrecision(2000)).toBe(2000);
	});
});

describe("timestampsMatch", () => {
	test("matches within the default 1s tolerance", () => {
		expect(timestampsMatch(1000, 1999)).toBe(true);
		expect(timestampsMatch(1999, 1000)).toBe(true);
	});

	test("does not match outside the default tolerance", () => {
		expect(timestampsMatch(1000, 2001)).toBe(false);
	});

	test("honours a custom tolerance", () => {
		expect(timestampsMatch(1000, 6000, ms.seconds(5))).toBe(true);
		expect(timestampsMatch(1000, 6001, ms.seconds(5))).toBe(false);
	});
});

describe("isFutureStartDate", () => {
	const now = 1_000_000_000_000;

	test("is true when start is beyond now plus tolerance", () => {
		expect(isFutureStartDate(now + ms.minutes(2), now)).toBe(true);
	});

	test("is false within the 1-minute tolerance window", () => {
		expect(isFutureStartDate(now + ms.seconds(30), now)).toBe(false);
	});

	test("is false for undefined start date", () => {
		expect(isFutureStartDate(undefined, now)).toBe(false);
	});
});

describe("isPastStartDate", () => {
	const now = 1_000_000_000_000;

	test("is true when start is before now minus tolerance", () => {
		expect(isPastStartDate(now - ms.minutes(2), now)).toBe(true);
	});

	test("is false within the 1-minute tolerance window", () => {
		expect(isPastStartDate(now - ms.seconds(30), now)).toBe(false);
	});
});

describe("stripePhaseStartsInFuture", () => {
	const now = 1_000_000_000_000; // ms

	test("treats a future seconds timestamp as in the future", () => {
		const futureSeconds = msToSeconds(now) + seconds.days(1);
		expect(stripePhaseStartsInFuture(futureSeconds, now)).toBe(true);
	});

	test("treats a past seconds timestamp as not in the future", () => {
		const pastSeconds = msToSeconds(now) - seconds.days(1);
		expect(stripePhaseStartsInFuture(pastSeconds, now)).toBe(false);
	});

	test("is false for 'now' and undefined", () => {
		expect(stripePhaseStartsInFuture("now", now)).toBe(false);
		expect(stripePhaseStartsInFuture(undefined, now)).toBe(false);
	});
});
