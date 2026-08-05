import {
	ACTIVE_STATUSES,
	type CusProductStatus,
	type ListCustomersV2_3Params,
	RELEVANT_STATUSES,
} from "@autumn/shared";
import { z } from "zod/v4";
import {
	type DashboardIntervalFilter,
	type DashboardProductVersionFilter,
	type DashboardStatusFilter,
	parseDashboardIntervalFilter,
	parseDashboardProcessorFilter,
	parseDashboardStatusFilter,
	parseDashboardVersionFilter,
} from "./getFullCusQuery.js";

export const CustomerListFiltersSchema = z.object({
	status: z.array(z.string()).optional(),
	version: z.array(z.string()).optional(),
	none: z.boolean().optional(),
	processor: z.array(z.string()).optional(),
	interval: z.array(z.string()).optional(),
});

export type CustomerListFilters = z.infer<typeof CustomerListFiltersSchema>;

export type CustomerListStatusFilter = DashboardStatusFilter | "scheduled";

export type CustomerListIntervalFilter = DashboardIntervalFilter;

export type CustomerListProductFilter =
	| DashboardProductVersionFilter
	| { productId: string; anyVersion: true; version?: never; custom?: never };

export type CustomerListSelection = {
	statuses: CustomerListStatusFilter[];
	products: CustomerListProductFilter[];
	withoutPlan: boolean;
	processors: NonNullable<ListCustomersV2_3Params["processors"]>;
	intervals: CustomerListIntervalFilter[];
	defaultProductStatuses: CusProductStatus[];
};

export const isAnyVersionCustomerListProductFilter = (
	filter: CustomerListProductFilter,
): filter is Extract<CustomerListProductFilter, { anyVersion: true }> =>
	"anyVersion" in filter;

const resolvePublicProductFilters = (
	plans: ListCustomersV2_3Params["plans"],
): CustomerListProductFilter[] =>
	(plans ?? []).flatMap((plan) => {
		const filters: CustomerListProductFilter[] = [];
		if (plan.custom) filters.push({ productId: plan.id, custom: true });
		if (plan.versions?.length) {
			filters.push(
				...plan.versions.map((version) => ({ productId: plan.id, version })),
			);
		} else if (!plan.custom) {
			filters.push({ productId: plan.id, anyVersion: true });
		}
		return filters;
	});

export const resolveDashboardCustomerListSelection = (
	filters?: CustomerListFilters,
): CustomerListSelection => ({
	statuses: parseDashboardStatusFilter(filters?.status),
	products: parseDashboardVersionFilter(filters?.version),
	withoutPlan: filters?.none ?? false,
	processors: parseDashboardProcessorFilter(filters?.processor) ?? [],
	intervals: parseDashboardIntervalFilter(filters?.interval),
	defaultProductStatuses: ACTIVE_STATUSES,
});

export const resolvePublicCustomerListSelection = (
	query: ListCustomersV2_3Params,
): CustomerListSelection => ({
	statuses:
		query.statuses?.length || !query.subscription_status
			? (query.statuses ?? [])
			: [query.subscription_status],
	products: resolvePublicProductFilters(query.plans),
	withoutPlan: query.without_plan ?? false,
	processors: query.processors ?? [],
	intervals: query.billing_intervals ?? [],
	defaultProductStatuses: query.plans?.length
		? RELEVANT_STATUSES
		: ACTIVE_STATUSES,
});

export const customerListSelectionRequiresResolution = (
	selection: CustomerListSelection,
) =>
	selection.statuses.length > 0 ||
	selection.products.length > 0 ||
	selection.withoutPlan ||
	selection.intervals.length > 0;
