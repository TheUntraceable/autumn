import { Scopes, user } from "@autumn/shared";
import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { createRoute } from "../../honoMiddlewares/routeHandler";
import {
	ADMIN_LIST_FETCH_LIMIT,
	adminListCursorFilters,
	parseAdminListQuery,
	toAdminListPage,
} from "./adminListUtils.js";

export const handleListAdminUsers = createRoute({
	scopes: [Scopes.Superuser],
	handler: async (c) => {
		const ctx = c.get("ctx");
		const { db } = ctx;

		const { searchTerm, after, before } = parseAdminListQuery(c.req.query());

		const users = await db
			.select()
			.from(user)
			.where(
				and(
					isNull(user.createdBy),
					searchTerm
						? or(
								eq(user.id, searchTerm),
								ilike(user.email, `%${searchTerm}%`),
								ilike(user.name, `%${searchTerm}%`),
							)
						: undefined,
					...adminListCursorFilters({
						createdAtColumn: user.createdAt,
						idColumn: user.id,
						after,
						before,
					}),
				),
			)
			.orderBy(desc(user.createdAt), desc(user.id))
			.limit(ADMIN_LIST_FETCH_LIMIT);

		const { pageRows, hasNextPage } = toAdminListPage(users);

		return c.json({
			rows: pageRows,
			hasNextPage,
		});
	},
});
