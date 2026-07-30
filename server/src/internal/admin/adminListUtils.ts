import { and, eq, gt, gte, lt, or, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

export const ADMIN_LIST_PAGE_SIZE = 20;
/** One extra row so the handler can tell whether another page exists. */
export const ADMIN_LIST_FETCH_LIMIT = ADMIN_LIST_PAGE_SIZE + 1;

type AdminListCursor = {
	id: string;
	createdAt: Date;
};

/**
 * Parses the shared `?search=&after=&before=` query of the admin list routes.
 * Cursors are `<id>,<createdAt>` pairs, and `before` is ignored when `after`
 * is present.
 */
export const parseAdminListQuery = (query: {
	search?: string;
	after?: string;
	before?: string;
}): {
	searchTerm: string | undefined;
	after: AdminListCursor | undefined;
	before: AdminListCursor | undefined;
} => {
	const trimmedSearch = query.search?.trim();

	const parseCursor = (raw: string): AdminListCursor => {
		const [id, createdAt] = raw.split(",");
		return { id, createdAt: new Date(createdAt) };
	};

	return {
		searchTerm: trimmedSearch ? trimmedSearch : undefined,
		after: query.after ? parseCursor(query.after) : undefined,
		before:
			!query.after && query.before ? parseCursor(query.before) : undefined,
	};
};

/**
 * Keyset filters for a `(createdAt desc, id desc)` ordering, to be spread into
 * the handler's `and(...)`.
 */
export const adminListCursorFilters = ({
	createdAtColumn,
	idColumn,
	after,
	before,
}: {
	createdAtColumn: PgColumn;
	idColumn: PgColumn;
	after: AdminListCursor | undefined;
	before: AdminListCursor | undefined;
}): (SQL | undefined)[] => [
	after
		? or(
				lt(createdAtColumn, after.createdAt),
				and(eq(createdAtColumn, after.createdAt), lt(idColumn, after.id)),
			)
		: undefined,
	before
		? or(
				gte(createdAtColumn, before.createdAt),
				and(eq(createdAtColumn, before.createdAt), gt(idColumn, before.id)),
			)
		: undefined,
];

/** Splits an `ADMIN_LIST_FETCH_LIMIT`-sized result into a page + next-page flag. */
export const toAdminListPage = <T>(
	rows: T[],
): { pageRows: T[]; hasNextPage: boolean } => ({
	pageRows: rows.slice(0, ADMIN_LIST_PAGE_SIZE),
	hasNextPage: rows.length > ADMIN_LIST_PAGE_SIZE,
});
