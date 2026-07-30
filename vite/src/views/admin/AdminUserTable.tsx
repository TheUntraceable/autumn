import { Input } from "@autumn/ui";
import { useMemo } from "react";
import { Table } from "@/components/general/table";
import { type AdminUser, createAdminUserColumns } from "./AdminUserColumns";
import { AdminTablePagination } from "./components/AdminTablePagination";
import { useAdminCursorList } from "./hooks/useAdminCursorList";
import { useAdminTable } from "./hooks/useAdminTable";

export const AdminUserTable = () => {
	const { rows, search, isLoading, pageInfo, handleSearch, handlePaginate } =
		useAdminCursorList<AdminUser>({
			queryKey: "admin-users",
			path: "/admin/users",
		});

	const columns = useMemo(() => createAdminUserColumns(), []);

	const table = useAdminTable({
		data: rows,
		columns,
	});

	const enableSorting = false;

	const tableConfig = useMemo(
		() => ({
			table,
			numberOfColumns: columns.length,
			enableSorting,
			isLoading,
			emptyStateText: "No users found.",
			rowClassName: "h-10",
			flexibleTableColumns: true,
		}),
		[table, columns.length, enableSorting, isLoading],
	);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-sm font-medium">Users</h2>
			</div>

			<div className="flex items-center gap-2">
				<Input
					placeholder="Search users..."
					value={search}
					onChange={(e) => handleSearch(e.target.value)}
					className="max-w-sm"
				/>
			</div>

			<Table.Provider config={tableConfig}>
				<Table.Container>
					<Table.Content className="w-fit">
						<Table.Header />
						<Table.Body />
					</Table.Content>
				</Table.Container>
			</Table.Provider>

			<AdminTablePagination pageInfo={pageInfo} onPaginate={handlePaginate} />
		</div>
	);
};
