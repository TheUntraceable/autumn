import { Input } from "@autumn/ui";
import { useMemo, useState } from "react";
import { Table } from "@/components/general/table";
import { type AdminOrg, createAdminOrgColumns } from "./AdminOrgColumns";
import { AdminTablePagination } from "./components/AdminTablePagination";
import { OrgRedisConfigDialog } from "./components/OrgRedisConfigDialog";
import { RequestBlockDialog } from "./components/RequestBlockDialog";
import { useAdminCursorList } from "./hooks/useAdminCursorList";
import { useAdminTable } from "./hooks/useAdminTable";

export const AdminOrgTable = () => {
	const [selectedOrg, setSelectedOrg] = useState<AdminOrg | null>(null);
	const [redisOrg, setRedisOrg] = useState<AdminOrg | null>(null);

	const {
		rows,
		search,
		isLoading,
		refetch,
		pageInfo,
		handleSearch,
		handlePaginate,
	} = useAdminCursorList<AdminOrg>({
		queryKey: "admin-orgs",
		path: "/admin/orgs",
	});

	const columns = useMemo(
		() =>
			createAdminOrgColumns({
				onManageRequestBlocks: (org) => setSelectedOrg(org),
				onManageRedis: (org) => setRedisOrg(org),
			}),
		[],
	);

	const table = useAdminTable({
		data: rows,
		columns,
	});

	const enableSorting = false;

	return (
		<div className="space-y-4 flex-1">
			<RequestBlockDialog
				open={Boolean(selectedOrg)}
				onOpenChange={(open) => {
					if (!open) {
						setSelectedOrg(null);
					}
				}}
				orgId={selectedOrg?.id}
				orgName={selectedOrg?.name}
				onSaved={async () => {
					await refetch();
				}}
			/>
			<OrgRedisConfigDialog
				open={Boolean(redisOrg)}
				onOpenChange={(open) => {
					if (!open) {
						setRedisOrg(null);
					}
				}}
				orgId={redisOrg?.id}
				orgName={redisOrg?.name}
				onSaved={async () => {
					await refetch();
				}}
			/>
			<div className="flex items-center justify-between">
				<h2 className="text-sm font-medium">Organizations</h2>
			</div>

			<div className="flex items-center gap-2">
				<Input
					placeholder="Search organizations..."
					value={search}
					onChange={(e) => handleSearch(e.target.value)}
					className="max-w-sm"
				/>
			</div>

			<Table.Provider
				config={{
					table,
					numberOfColumns: columns.length,
					enableSorting,
					isLoading,
					emptyStateText: "No organizations found.",
					rowClassName: "h-10",
					flexibleTableColumns: true,
				}}
			>
				<Table.Container>
					<Table.Content className="w-full">
						<Table.Header />
						<Table.Body />
					</Table.Content>
				</Table.Container>
			</Table.Provider>

			<AdminTablePagination pageInfo={pageInfo} onPaginate={handlePaginate} />
		</div>
	);
};
