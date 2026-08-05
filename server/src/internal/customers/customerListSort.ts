import {
	customers,
	type FullCustomer,
	type ListCustomersV2_3Params,
	type StandardCursorFields,
} from "@autumn/shared";
import { and, asc, desc, eq, gt, lt, or } from "drizzle-orm";

export type CustomerListSort = NonNullable<ListCustomersV2_3Params["sort"]>;

export const DEFAULT_CUSTOMER_LIST_SORT = {
	field: "created_at",
	direction: "desc",
} as const satisfies CustomerListSort;

export const resolveCustomerListSort = (
	sort: ListCustomersV2_3Params["sort"],
): CustomerListSort => sort ?? DEFAULT_CUSTOMER_LIST_SORT;

const getComparator = (direction: CustomerListSort["direction"]) =>
	direction === "asc" ? gt : lt;

export const getCustomerListCursorPredicate = ({
	sort,
	cursor,
}: {
	sort: CustomerListSort;
	cursor: Pick<StandardCursorFields, "t" | "id"> | null;
}) => {
	if (!cursor) return undefined;

	const compare = getComparator(sort.direction);
	return or(
		compare(customers.created_at, cursor.t),
		and(eq(customers.created_at, cursor.t), compare(customers.id, cursor.id)),
	);
};

export const getCustomerListOrderBy = ({
	sort,
}: {
	sort: CustomerListSort;
}) => {
	const order = sort.direction === "asc" ? asc : desc;
	return [order(customers.created_at), order(customers.id)] as const;
};

export const orderCustomersByInternalIds = ({
	customers: customerList,
	internalIds,
}: {
	customers: FullCustomer[];
	internalIds: string[];
}) => {
	const order = new Map(internalIds.map((id, index) => [id, index]));
	return [...customerList].sort(
		(a, b) =>
			(order.get(a.internal_id) ?? Number.MAX_SAFE_INTEGER) -
			(order.get(b.internal_id) ?? Number.MAX_SAFE_INTEGER),
	);
};
