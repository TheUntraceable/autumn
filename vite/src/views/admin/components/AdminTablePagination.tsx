import { Button } from "@autumn/ui";

export const AdminTablePagination = ({
	pageInfo,
	onPaginate,
}: {
	pageInfo: { hasNextPage: boolean; hasPrevPage: boolean; page: number };
	onPaginate: (direction: "next" | "prev") => void;
}) => (
	<div className="flex items-center justify-end space-x-2">
		<Button
			variant="secondary"
			size="sm"
			onClick={() => onPaginate("prev")}
			disabled={!pageInfo.hasPrevPage}
		>
			Previous
		</Button>
		<span className="text-sm text-tertiary-foreground">
			Page {pageInfo.page}
		</span>
		<Button
			variant="secondary"
			size="sm"
			onClick={() => onPaginate("next")}
			disabled={!pageInfo.hasNextPage}
		>
			Next
		</Button>
	</div>
);
