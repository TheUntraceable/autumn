import { describe, expect, test } from "bun:test";
import { BillingInterval } from "../../../models/productModels/intervals/billingInterval";
import { EntInterval } from "../../../models/productModels/intervals/entitlementInterval";
import { ProductItemInterval } from "../../../models/productModels/intervals/productItemInterval";
import { formatInterval } from "./formatInterval";

describe("formatInterval", () => {
	test("returns empty string when interval is missing", () => {
		expect(formatInterval({})).toBe("");
	});

	test("formats one_off as 'one-off'", () => {
		expect(formatInterval({ interval: BillingInterval.OneOff })).toBe(
			"one-off",
		);
	});

	test("formats lifetime as empty string", () => {
		expect(formatInterval({ interval: EntInterval.Lifetime })).toBe("");
	});

	test("uses the default 'per ' prefix and singular form", () => {
		expect(formatInterval({ interval: BillingInterval.Month })).toBe(
			"per month",
		);
	});

	test("pluralises and includes count when intervalCount > 1", () => {
		expect(
			formatInterval({ interval: BillingInterval.Month, intervalCount: 3 }),
		).toBe("per 3 months");
	});

	test("renders semi_annual as 'half year' across interval enums", () => {
		expect(formatInterval({ interval: BillingInterval.SemiAnnual })).toBe(
			"per half year",
		);
		expect(formatInterval({ interval: EntInterval.SemiAnnual })).toBe(
			"per half year",
		);
		expect(formatInterval({ interval: ProductItemInterval.SemiAnnual })).toBe(
			"per half year",
		);
	});

	test("pluralises 'half year' correctly", () => {
		expect(
			formatInterval({
				interval: BillingInterval.SemiAnnual,
				intervalCount: 2,
			}),
		).toBe("per 2 half years");
	});

	test("honours a custom prefix", () => {
		expect(
			formatInterval({ interval: BillingInterval.Year, prefix: "every " }),
		).toBe("every year");
	});
});
