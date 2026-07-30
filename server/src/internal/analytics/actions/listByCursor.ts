import type {
	ApiEventsListItem,
	CursorPaginatedResponse,
} from "@autumn/shared";
import { StandardCursor } from "@autumn/shared";
import {
	epochMicrosToDateTime,
	epochToDateTime,
	tinybirdTimestampToEpochMicros,
} from "@autumn/shared/api/common/epochUtils";
import { getTinybirdPipes } from "@/external/tinybird/initTinybird.js";
import type { AutumnContext } from "@/honoUtils/HonoEnv.js";
import {
	buildEventFilterParams,
	toApiEventsListItem,
} from "@/internal/analytics/actions/tinybirdEventUtils.js";

export const listByCursor = async ({
	ctx,
	params,
}: {
	ctx: AutumnContext;
	params: {
		customer_id?: string;
		entity_id?: string;
		feature_ids?: string[];
		custom_range?: { start?: number; end?: number };
		start_cursor: string;
		limit: number;
		filter_by?: Record<string, string>;
	};
}): Promise<CursorPaginatedResponse<ApiEventsListItem>> => {
	const pipes = getTinybirdPipes();
	const { org, env } = ctx;

	const cursor = StandardCursor.decode(params.start_cursor);

	const startDate = params.custom_range?.start
		? epochToDateTime(params.custom_range.start)
		: undefined;
	const endDate = params.custom_range?.end
		? epochToDateTime(params.custom_range.end)
		: undefined;

	const fetchLimit = params.limit + 1;

	ctx.logger.debug("Listing events via cursor", {
		customerId: params.customer_id,
		featureIds: params.feature_ids,
		startDate,
		endDate,
		cursor,
		limit: params.limit,
	});

	const filterParams = buildEventFilterParams({ filterBy: params.filter_by });

	const startTime = performance.now();
	const result = await pipes.listEventsCursor({
		org_id: org.id,
		env,
		start_date: startDate,
		end_date: endDate,
		customer_id: params.customer_id,
		entity_id: params.entity_id,
		event_names: params.feature_ids,
		limit: fetchLimit,
		...(cursor
			? {
					cursor_timestamp: epochMicrosToDateTime(cursor.t),
					cursor_id: cursor.id,
				}
			: {}),
		...filterParams,
	});

	const queryDuration = performance.now() - startTime;
	const hasMore = result.data.length > params.limit;
	const rows = hasMore ? result.data.slice(0, params.limit) : result.data;

	const list: ApiEventsListItem[] = rows.map(toApiEventsListItem);

	const lastRow = rows[rows.length - 1];
	const next_cursor =
		hasMore && lastRow
			? StandardCursor.encode({
					id: lastRow.id,
					t: tinybirdTimestampToEpochMicros(lastRow.timestamp),
				})
			: null;

	ctx.logger.debug("Events listByCursor result", {
		queryMs: Math.round(queryDuration),
		rowCount: list.length,
		hasMore,
	});

	return {
		list,
		next_cursor,
	};
};
