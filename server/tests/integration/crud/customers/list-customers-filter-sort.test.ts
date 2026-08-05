import { expect, test } from "bun:test";
import {
	type ApiCustomerV5,
	ApiVersion,
	BillingInterval,
} from "@autumn/shared";
import { items } from "@tests/utils/fixtures/items.js";
import { products } from "@tests/utils/fixtures/products.js";
import { initScenario, s } from "@tests/utils/testInitUtils/initScenario.js";
import { AutumnInt } from "@/external/autumn/autumnCli.js";

const customerIds = {
	attached: "list-filter-sort-attached",
	withoutPlan: "list-filter-sort-without-plan",
};

test("customers.list filters and sorts with cursor pagination", async () => {
	const product = products.pro({
		id: "list-filter-sort-pro",
		items: [items.monthlyMessages({ includedUsage: 50 })],
	});

	await initScenario({
		customerId: customerIds.attached,
		setup: [s.customer({ testClock: false }), s.products({ list: [product] })],
		actions: [s.attach({ productId: product.id })],
	});
	await initScenario({
		customerId: customerIds.withoutPlan,
		setup: [s.customer({ testClock: false })],
		actions: [],
	});

	const autumn = new AutumnInt({ version: ApiVersion.V2_3 });
	const list = async (params: Parameters<typeof autumn.customers.listV2>[0]) =>
		(await autumn.customers.listV2({
			start_cursor: "",
			limit: 10,
			search: "list-filter-sort-",
			...params,
		})) as { list: ApiCustomerV5[]; next_cursor: string | null };

	const [byPlan, byStatus, byInterval, withoutPlan, ascending, descending] =
		await Promise.all([
			list({ plans: [{ id: product.id }] }),
			list({ statuses: ["active"] }),
			list({ billing_intervals: [BillingInterval.Month] }),
			list({ without_plan: true }),
			list({ sort: { field: "created_at", direction: "asc" } }),
			list({ sort: { field: "created_at", direction: "desc" } }),
		]);

	expect(byPlan.list.map((customer) => customer.id)).toEqual([
		customerIds.attached,
	]);
	expect(byStatus.list.map((customer) => customer.id)).toEqual([
		customerIds.attached,
	]);
	expect(byInterval.list.map((customer) => customer.id)).toEqual([
		customerIds.attached,
	]);
	expect(withoutPlan.list.map((customer) => customer.id)).toEqual([
		customerIds.withoutPlan,
	]);
	expect(ascending.list.map((customer) => customer.id)).toEqual(
		descending.list.map((customer) => customer.id).reverse(),
	);

	const pageOne = await list({
		limit: 1,
		sort: { field: "created_at", direction: "asc" },
	});
	expect(pageOne.next_cursor).not.toBeNull();
	const pageTwo = await list({
		start_cursor: pageOne.next_cursor!,
		limit: 1,
		sort: { field: "created_at", direction: "asc" },
	});
	expect(pageTwo.list[0]!.id).not.toBe(pageOne.list[0]!.id);
});
