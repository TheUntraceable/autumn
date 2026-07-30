import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useAxiosInstance } from "@/services/useAxiosInstance";

type CursorRow = {
	id: string;
	createdAt: string | number;
};

/**
 * Search + `<id>,<createdAt>` cursor pagination shared by the admin list
 * tables, backed by the `{ rows, hasNextPage }` admin list endpoints.
 */
export const useAdminCursorList = <T extends CursorRow>({
	queryKey,
	path,
}: {
	queryKey: string;
	path: string;
}) => {
	const axiosInstance = useAxiosInstance();
	const [search, setSearch] = useState("");
	const [after, setAfter] = useState<string | undefined>(undefined);
	const [before, setBefore] = useState<string | undefined>(undefined);
	const [page, setPage] = useState(1);

	const params = new URLSearchParams();
	if (search) params.append("search", search);
	if (after) params.append("after", after);
	if (before) params.append("before", before);
	const url = `${path}${params.toString() ? `?${params.toString()}` : ""}`;

	const { data, isLoading, refetch } = useQuery({
		queryKey: [queryKey, search, after, before],
		queryFn: async () => {
			const { data } = await axiosInstance.get(url);
			return data;
		},
	});

	const rows: T[] = useMemo(() => data?.rows || [], [data?.rows]);

	const lastRow = rows[rows.length - 1];
	const firstRow = rows[0];

	const pageInfo = {
		hasNextPage: data?.hasNextPage || false,
		hasPrevPage: rows.length !== 0 && page > 1,
		lastItem: lastRow ? `${lastRow.id},${lastRow.createdAt}` : undefined,
		firstItem: firstRow ? `${firstRow.id},${firstRow.createdAt}` : undefined,
		page,
	};

	const handleSearch = (value: string) => {
		setSearch(value);
		setAfter(undefined);
		setBefore(undefined);
		setPage(1);
	};

	const handlePaginate = (direction: "next" | "prev") => {
		if (direction === "next") {
			setAfter(pageInfo.lastItem);
			setBefore(undefined);
		} else {
			setBefore(pageInfo.firstItem);
			setAfter(undefined);
		}
		setPage((p) => (direction === "next" ? p + 1 : Math.max(1, p - 1)));
	};

	return {
		rows,
		search,
		isLoading,
		refetch,
		pageInfo,
		handleSearch,
		handlePaginate,
	};
};
