import type { ApiEventsListItem, TrackDeduction } from "@autumn/shared";
import { tinybirdTimestampToEpochMs } from "@autumn/shared/api/common/epochUtils";
import type { ListEventsCursorPipeRow } from "@/external/tinybird/pipes/listEventsCursorPipe.js";
import { validatePropertyPathForJSON } from "@/internal/analytics/actions/eventValidationUtils.js";

/** The pipes only accept `filter_key_0`..`filter_key_4`. */
const MAX_EVENT_FILTERS = 5;

/** Flattens `filter_by` into the indexed `filter_key_N` / `filter_value_N` pipe params. */
export const buildEventFilterParams = ({
	filterBy,
}: {
	filterBy?: Record<string, string>;
}): Record<string, string> => {
	const filterParams: Record<string, string> = {};
	if (!filterBy) return filterParams;

	const entries = Object.entries(filterBy).slice(0, MAX_EVENT_FILTERS);
	for (let i = 0; i < entries.length; i++) {
		const [key, value] = entries[i];
		validatePropertyPathForJSON({ propertyKey: key });
		filterParams[`filter_key_${i}`] = key;
		filterParams[`filter_value_${i}`] = value;
	}

	return filterParams;
};

const parseProperties = (
	properties: string | null,
): Record<string, unknown> => {
	if (!properties) return {};
	try {
		return JSON.parse(properties);
	} catch {
		// Invalid JSON, use empty object
		return {};
	}
};

const parseDeductions = (
	deductions: string | null | undefined,
): TrackDeduction[] | null => {
	if (!deductions) return null;

	try {
		const parsed = JSON.parse(deductions);
		// Tinybird's JSON column re-encodes nested-object array items
		// as strings; second parse brings them back to TrackDeduction.
		const rawList = Array.isArray(parsed)
			? parsed
			: parsed && Array.isArray(parsed.list)
				? parsed.list
				: null;
		if (!rawList) return null;

		return rawList.map((item: unknown) => {
			if (typeof item !== "string") return item as TrackDeduction;
			try {
				return JSON.parse(item) as TrackDeduction;
			} catch {
				return item as unknown as TrackDeduction;
			}
		});
	} catch {
		return null;
	}
};

/** Maps a Tinybird event row to the API list item shape. */
export const toApiEventsListItem = (
	row: ListEventsCursorPipeRow,
): ApiEventsListItem => ({
	id: row.id,
	timestamp: tinybirdTimestampToEpochMs(row.timestamp),
	feature_id: row.event_name,
	customer_id: row.customer_id,
	value: row.value ?? 0,
	properties: parseProperties(row.properties),
	deductions: parseDeductions(row.deductions),
});
