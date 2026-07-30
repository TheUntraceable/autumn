import { member, organizations, Scopes, user } from "@autumn/shared";
import { and, desc, eq, ilike, inArray, isNull, or } from "drizzle-orm";
import { createRoute } from "../../honoMiddlewares/routeHandler";
import { getRequestBlockConfigFromSource } from "../misc/requestBlocks/requestBlockStore.js";
import {
	ADMIN_LIST_FETCH_LIMIT,
	adminListCursorFilters,
	parseAdminListQuery,
	toAdminListPage,
} from "./adminListUtils.js";

export const handleListAdminOrgs = createRoute({
	scopes: [Scopes.Superuser],
	handler: async (c) => {
		const ctx = c.get("ctx");
		const { db } = ctx;

		const { searchTerm, after, before } = parseAdminListQuery(c.req.query());

		const orgs = await db
			.select()
			.from(organizations)
			.where(
				and(
					isNull(organizations.created_by),
					searchTerm
						? or(
								eq(organizations.id, searchTerm),
								ilike(organizations.name, `%${searchTerm}%`),
								ilike(organizations.slug, `%${searchTerm}%`),
							)
						: undefined,
					...adminListCursorFilters({
						createdAtColumn: organizations.createdAt,
						idColumn: organizations.id,
						after,
						before,
					}),
				),
			)
			.orderBy(desc(organizations.createdAt), desc(organizations.id))
			.limit(ADMIN_LIST_FETCH_LIMIT);

		const { pageRows, hasNextPage } = toAdminListPage(orgs);
		const orgIds = orgs.map((org) => org.id);
		let requestBlockConfig = {
			orgs: {} as Record<
				string,
				{ blockAll: boolean; blockedEndpoints: unknown[] }
			>,
		};

		try {
			requestBlockConfig = await getRequestBlockConfigFromSource();
		} catch {
			// Admin list should still render even if S3 is unavailable.
		}

		const memberships = await db
			.select()
			.from(member)
			.leftJoin(user, eq(member.userId, user.id))
			.where(inArray(member.organizationId, orgIds));

		return c.json({
			rows: pageRows.map((org) => {
				const { redis_config: rawRedisConfig, ...rest } = org;
				return {
					...rest,
					// Redact encrypted connection string from admin list — UI only
					// needs host + percent for the table column.
					redis_config: rawRedisConfig
						? {
								url: rawRedisConfig.url,
								migrationPercent: rawRedisConfig.migrationPercent,
							}
						: null,
					users: memberships
						.filter((membership) => membership.member.organizationId === org.id)
						.map((membership) => membership.user),
					requestBlockSummary: {
						blockAll: requestBlockConfig.orgs[org.id]?.blockAll ?? false,
						ruleCount:
							requestBlockConfig.orgs[org.id]?.blockedEndpoints.length ?? 0,
					},
				};
			}),
			hasNextPage,
		});
	},
});
