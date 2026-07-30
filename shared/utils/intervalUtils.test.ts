import { describe, expect, test } from "bun:test";
import { BillingInterval } from "@models/productModels/intervals/billingInterval.js";
import { EntInterval } from "@models/productModels/intervals/entitlementInterval.js";
import {
	billingAndEntIntervalsDifferent,
	billingAndEntIntervalsSame,
	billingIntervalToSeconds,
	entIntervalsDifferent,
	entIntervalsSame,
	entIntervalToValue,
	intervalToValue,
} from "./intervalUtils";

describe("intervalToValue", () => {
	test("maps billing intervals to month-equivalent values", () => {
		expect(intervalToValue(BillingInterval.OneOff)).toBe(0);
		expect(intervalToValue(BillingInterval.Week)).toBe(0.25);
		expect(intervalToValue(BillingInterval.Month)).toBe(1);
		expect(intervalToValue(BillingInterval.Quarter)).toBe(3);
		expect(intervalToValue(BillingInterval.SemiAnnual)).toBe(6);
		expect(intervalToValue(BillingInterval.Year)).toBe(12);
	});

	test("multiplies by intervalCount (defaulting to 1)", () => {
		expect(intervalToValue(BillingInterval.Month, 3)).toBe(3);
		expect(intervalToValue(BillingInterval.Month, null)).toBe(1);
	});

	test("orders intervals so longer periods are larger", () => {
		expect(intervalToValue(BillingInterval.Year)).toBeGreaterThan(
			intervalToValue(BillingInterval.Month),
		);
	});
});

describe("entIntervalToValue", () => {
	test("maps ent intervals to minute-equivalent values", () => {
		expect(entIntervalToValue(EntInterval.Minute).toNumber()).toBe(1);
		expect(entIntervalToValue(EntInterval.Hour).toNumber()).toBe(60);
		expect(entIntervalToValue(EntInterval.Day).toNumber()).toBe(60 * 24);
		expect(entIntervalToValue(EntInterval.Month).toNumber()).toBe(60 * 24 * 30);
	});

	test("multiplies by intervalCount", () => {
		expect(entIntervalToValue(EntInterval.Hour, 2).toNumber()).toBe(120);
	});

	test("returns a large sentinel when interval is missing", () => {
		expect(entIntervalToValue(null).toNumber()).toBe(10_000_000);
		expect(entIntervalToValue(undefined).toNumber()).toBe(10_000_000);
	});
});

describe("billingIntervalToSeconds", () => {
	test("converts each interval to approximate seconds", () => {
		expect(billingIntervalToSeconds({ interval: BillingInterval.OneOff })).toBe(
			0,
		);
		expect(billingIntervalToSeconds({ interval: BillingInterval.Week })).toBe(
			7 * 24 * 60 * 60,
		);
		expect(billingIntervalToSeconds({ interval: BillingInterval.Month })).toBe(
			30 * 24 * 60 * 60,
		);
		expect(billingIntervalToSeconds({ interval: BillingInterval.Year })).toBe(
			365 * 24 * 60 * 60,
		);
	});
});

describe("entIntervalsSame / entIntervalsDifferent", () => {
	test("equal interval + count are the same", () => {
		const args = {
			intervalA: { interval: EntInterval.Month, intervalCount: 1 },
			intervalB: { interval: EntInterval.Month, intervalCount: 1 },
		};
		expect(entIntervalsSame(args)).toBe(true);
		expect(entIntervalsDifferent(args)).toBe(false);
	});

	test("different counts are not the same", () => {
		const args = {
			intervalA: { interval: EntInterval.Month, intervalCount: 1 },
			intervalB: { interval: EntInterval.Month, intervalCount: 2 },
		};
		expect(entIntervalsSame(args)).toBe(false);
		expect(entIntervalsDifferent(args)).toBe(true);
	});

	test("count 3 months equals one quarter (same minute-equivalent)", () => {
		expect(
			entIntervalsSame({
				intervalA: { interval: EntInterval.Month, intervalCount: 3 },
				intervalB: { interval: EntInterval.Quarter, intervalCount: 1 },
			}),
		).toBe(true);
	});
});

describe("billingAndEntIntervalsSame / Different", () => {
	test("matching finite intervals with same count are the same", () => {
		const params = {
			billingInterval: BillingInterval.Month,
			billingIntervalCount: 1,
			entInterval: EntInterval.Month,
			entIntervalCount: 1,
		};
		expect(billingAndEntIntervalsSame(params)).toBe(true);
		expect(billingAndEntIntervalsDifferent(params)).toBe(false);
	});

	test("one_off billing pairs only with lifetime ent", () => {
		expect(
			billingAndEntIntervalsSame({
				billingInterval: BillingInterval.OneOff,
				entInterval: EntInterval.Lifetime,
			}),
		).toBe(true);
		expect(
			billingAndEntIntervalsSame({
				billingInterval: BillingInterval.OneOff,
				entInterval: EntInterval.Month,
			}),
		).toBe(false);
	});

	test("differing interval counts are different", () => {
		expect(
			billingAndEntIntervalsSame({
				billingInterval: BillingInterval.Month,
				billingIntervalCount: 1,
				entInterval: EntInterval.Month,
				entIntervalCount: 2,
			}),
		).toBe(false);
	});
});
