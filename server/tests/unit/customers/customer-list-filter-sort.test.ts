import { describe, expect, test } from "bun:test";
import {
	AppEnv,
	BillingInterval,
	CusProductStatus,
	ListCustomersV2_3ParamsSchema,
} from "@autumn/shared";
import { type SQL, sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { DrizzleCli } from "@/db/initDrizzle.js";
import { CusSearchService } from "@/internal/customers/CusSearchService.js";
import { getCursorPaginatedFullCusQuery } from "@/internal/customers/cursorPaginatedFullCusQuery.js";
import { resolvePublicCustomerListSelection } from "@/internal/customers/customerListFilters.js";

const dialect = new PgDialect();
const normalize = (value: string) => value.replace(/\s+/g, " ").trim();

describe("customer list filters and sorting", () => {
	test("maps public filters onto the dashboard selection model", () => {
		const selection = resolvePublicCustomerListSelection({
			start_cursor: "",
			limit: 50,
			statuses: ["active", "past_due"],
			plans: [
				{ id: "pro", versions: [2, 3] },
				{ id: "custom", custom: true },
				{ id: "any" },
			],
			without_plan: true,
			processors: ["stripe"],
			billing_intervals: [BillingInterval.Month],
		});

		expect(selection).toEqual({
			statuses: ["active", "past_due"],
			products: [
				{ productId: "pro", version: 2 },
				{ productId: "pro", version: 3 },
				{ productId: "custom", custom: true },
				{ productId: "any", anyVersion: true },
			],
			withoutPlan: true,
			processors: ["stripe"],
			intervals: [BillingInterval.Month],
			defaultProductStatuses: [
				CusProductStatus.Active,
				CusProductStatus.PastDue,
				CusProductStatus.Scheduled,
			],
		});
	});

	test("only accepts the indexed created_at sort", () => {
		expect(
			ListCustomersV2_3ParamsSchema.safeParse({
				start_cursor: "",
				limit: 50,
				sort: { field: "created_at", direction: "asc" },
			}).success,
		).toBe(true);
		expect(
			ListCustomersV2_3ParamsSchema.safeParse({
				start_cursor: "",
				limit: 50,
				sort: { field: "name", direction: "asc" },
			}).success,
		).toBe(false);
	});

	test("uses keyset pagination for ascending order and peeks one row", async () => {
		let capturedQuery: ReturnType<PgDialect["sqlToQuery"]> | undefined;
		const db = {
			execute: async (query: SQL) => {
				capturedQuery = dialect.sqlToQuery(sql`${query}`);
				return [
					{ internal_id: "cus_1" },
					{ internal_id: "cus_2" },
					{ internal_id: "cus_3" },
				];
			},
		} as unknown as DrizzleCli;

		const result = await CusSearchService.resolveInternalIdsByCursor({
			db,
			orgId: "org_1",
			env: AppEnv.Live,
			search: "",
			selection: resolvePublicCustomerListSelection({
				start_cursor: "",
				limit: 2,
				statuses: ["active"],
			}),
			cursor: { t: 123, id: "cus_cursor" },
			sort: { field: "created_at", direction: "asc" },
			limit: 2,
		});

		const query = normalize(capturedQuery!.sql);
		expect(query).toContain("select distinct");
		expect(query).toContain('"customers"."created_at" >');
		expect(query).toContain(
			'order by "customers"."created_at" asc, "customers"."id" asc',
		);
		expect(capturedQuery!.params[capturedQuery!.params.length - 1]).toBe(3);
		expect(result).toEqual({
			internalIds: ["cus_1", "cus_2"],
			hasMore: true,
		});
	});

	test("uses the existing customer cursor index order in the hydration query", () => {
		const rendered = dialect.sqlToQuery(
			getCursorPaginatedFullCusQuery({
				orgId: "org_1",
				env: AppEnv.Live,
				limit: 50,
				cursor: { v: 0, t: 123, id: "cus_cursor" },
				cusProductLimit: 10,
				sortDirection: "asc",
			}),
		);
		const query = normalize(rendered.sql);

		expect(query).toContain("(c.created_at, c.id) > ($3, $4)");
		expect(query).toContain("ORDER BY c.created_at ASC, c.id ASC");
		expect(query).toContain(
			"json_agg(row_json ORDER BY created_at ASC, id ASC)",
		);
	});
});
