import { z } from "zod/v4";
import { BillingInterval } from "../../../models/productModels/intervals/billingInterval.js";
import {
	CursorRequestFieldSchema,
	createCursorLimitSchema,
	PaginationDefaults,
} from "../../common/cursorPaginationSchemas.js";

export const ListCustomersStatusSchema = z.enum([
	"active",
	"past_due",
	"scheduled",
	"canceled",
	"free_trial",
	"expired",
]);

export const ListCustomersBillingIntervalSchema = z.enum([
	BillingInterval.Week,
	BillingInterval.Month,
	BillingInterval.Quarter,
	BillingInterval.SemiAnnual,
	BillingInterval.Year,
]);

export const ListCustomersSortFieldSchema = z.literal("created_at");

export const ListCustomersSortDirectionSchema = z.enum(["asc", "desc"]);

export const ListCustomersSortSchema = z.object({
	field: ListCustomersSortFieldSchema.default("created_at"),
	direction: ListCustomersSortDirectionSchema.default("desc"),
});

export const ListCustomersV2_3ParamsSchema = z.object({
	start_cursor: CursorRequestFieldSchema,
	limit: createCursorLimitSchema({
		defaultLimit: PaginationDefaults.DefaultLimit,
	}),

	plans: z
		.array(
			z.object({
				id: z.string(),
				versions: z.number().array().optional(),
				custom: z.boolean().optional(),
			}),
		)
		.optional()
		.meta({
			description:
				"Filter by plan ID and version. Returns customers with active subscriptions to this plan.",
		}),

	subscription_status: z.enum(["active", "scheduled"]).optional().meta({
		description:
			"Filter by customer product status. Defaults to active and scheduled.",
	}),

	search: z.string().optional().meta({
		description: "Search customers by id, name, or email.",
	}),

	processors: z
		.array(z.enum(["stripe", "revenuecat", "vercel"]))
		.optional()
		.meta({
			description:
				"Filter by customer processor type (stripe, revenuecat, vercel).",
		}),

	statuses: z.array(ListCustomersStatusSchema).optional().meta({
		description:
			"Filter customers by subscription status. Multiple statuses are matched with OR semantics.",
	}),

	without_plan: z.boolean().optional().meta({
		description:
			"Return customers without an active, past due, or scheduled plan.",
	}),

	billing_intervals: z
		.array(ListCustomersBillingIntervalSchema)
		.optional()
		.meta({
			description:
				"Filter customers by the billing interval of an attached plan.",
		}),

	sort: ListCustomersSortSchema.optional().meta({
		description:
			"Sort customers by a customer field. Defaults to created_at descending.",
	}),
});

export type ListCustomersV2_3Params = z.infer<
	typeof ListCustomersV2_3ParamsSchema
>;
