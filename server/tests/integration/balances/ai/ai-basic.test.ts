import { expect, test } from "bun:test";
import type { CheckResponseV3 } from "@autumn/shared";
import { TestFeature } from "@tests/setup/v2Features.js";
import { items } from "@tests/utils/fixtures/items.js";
import { products } from "@tests/utils/fixtures/products.js";
import { initScenario, s } from "@tests/utils/testInitUtils/initScenario.js";
import chalk from "chalk";

// ═══════════════════════════════════════════════════════════════════
// AI-BASIC-1: Track tokens, balance decrements correctly
// ═══════════════════════════════════════════════════════════════════

test.concurrent(
	`${chalk.yellowBright("ai-basic-1: tracking input/output tokens decrements balance correctly")}`,
	async () => {
		const aiItem = items.monthlyAiModel({
			inputIncluded: 1_000_000,
			outputIncluded: 2_000_000,
		});
		const free = products.base({ id: "free", items: [aiItem] });

		const { customerId, autumnV2 } = await initScenario({
			customerId: "ai-basic-1",
			setup: [
				s.customer({ testClock: false }),
				s.products({ list: [free] }),
			],
			actions: [s.attach({ productId: free.id })],
		});

		await autumnV2.track({
			customer_id: customerId,
			feature_id: TestFeature.AiModel,
			properties: { input_tokens: 100_000, output_tokens: 50_000 },
		});

		const checkRes = await autumnV2.check<CheckResponseV3>({
			customer_id: customerId,
			feature_id: TestFeature.AiModel,
		});

		expect(checkRes.balance?.remaining).toMatchObject({
			input: 900_000,
			output: 1_950_000,
		});
	},
);

// ═══════════════════════════════════════════════════════════════════
// AI-BASIC-2: Check allowed when tokens are available
// ═══════════════════════════════════════════════════════════════════

test.concurrent(
	`${chalk.yellowBright("ai-basic-2: check is allowed when tokens are available")}`,
	async () => {
		const aiItem = items.monthlyAiModel({
			inputIncluded: 500_000,
			outputIncluded: 500_000,
		});
		const free = products.base({ id: "free", items: [aiItem] });

		const { customerId, autumnV2 } = await initScenario({
			customerId: "ai-basic-2",
			setup: [
				s.customer({ testClock: false }),
				s.products({ list: [free] }),
			],
			actions: [s.attach({ productId: free.id })],
		});

		const checkRes = await autumnV2.check<CheckResponseV3>({
			customer_id: customerId,
			feature_id: TestFeature.AiModel,
			properties: { input_tokens: 100_000, output_tokens: 50_000 },
		});

		expect(checkRes.allowed).toBe(true);
	},
);

// ═══════════════════════════════════════════════════════════════════
// AI-BASIC-3: Check denied when balance is exhausted
// ═══════════════════════════════════════════════════════════════════

test.concurrent(
	`${chalk.yellowBright("ai-basic-3: check is denied after balance is exhausted")}`,
	async () => {
		const aiItem = items.monthlyAiModel({
			inputIncluded: 100_000,
			outputIncluded: 100_000,
		});
		const free = products.base({ id: "free", items: [aiItem] });

		const { customerId, autumnV2 } = await initScenario({
			customerId: "ai-basic-3",
			setup: [
				s.customer({ testClock: false }),
				s.products({ list: [free] }),
			],
			actions: [s.attach({ productId: free.id })],
		});

		// Exhaust the entire balance
		await autumnV2.track({
			customer_id: customerId,
			feature_id: TestFeature.AiModel,
			properties: { input_tokens: 100_000, output_tokens: 100_000 },
		});

		const checkRes = await autumnV2.check<CheckResponseV3>({
			customer_id: customerId,
			feature_id: TestFeature.AiModel,
			properties: { input_tokens: 1, output_tokens: 1 },
		});

		expect(checkRes.allowed).toBe(false);
	},
);

// ═══════════════════════════════════════════════════════════════════
// AI-BASIC-4: Overage allowed - check still passes when balance is gone
// ═══════════════════════════════════════════════════════════════════

test.concurrent(
	`${chalk.yellowBright("ai-basic-4: check is allowed when overage is enabled, even past balance")}`,
	async () => {
		const aiItem = items.monthlyAiModel({
			inputIncluded: 100_000,
			outputIncluded: 100_000,
			allowOverusage: true,
		});
		const free = products.base({ id: "free", items: [aiItem] });

		const { customerId, autumnV2 } = await initScenario({
			customerId: "ai-basic-4",
			setup: [
				s.customer({ testClock: false }),
				s.products({ list: [free] }),
			],
			actions: [s.attach({ productId: free.id })],
		});

		// Exhaust the entire balance
		await autumnV2.track({
			customer_id: customerId,
			feature_id: TestFeature.AiModel,
			properties: { input_tokens: 100_000, output_tokens: 100_000 },
		});

		const checkRes = await autumnV2.check<CheckResponseV3>({
			customer_id: customerId,
			feature_id: TestFeature.AiModel,
			properties: { input_tokens: 50_000, output_tokens: 50_000 },
		});

		expect(checkRes.allowed).toBe(true);
	},
);

// ═══════════════════════════════════════════════════════════════════
// AI-BASIC-5: AI feature included in a paid plan
// ═══════════════════════════════════════════════════════════════════

test.concurrent(
	`${chalk.yellowBright("ai-basic-5: AI feature included in a paid pro plan")}`,
	async () => {
		const aiItem = items.monthlyAiModel({
			inputIncluded: 5_000_000,
			outputIncluded: 5_000_000,
		});
		const pro = products.pro({ items: [aiItem] });

		const { customerId, autumnV2 } = await initScenario({
			customerId: "ai-basic-5",
			setup: [
				s.customer({ paymentMethod: "success" }),
				s.products({ list: [pro] }),
			],
			actions: [s.attach({ productId: pro.id })],
		});

		const checkRes = await autumnV2.check<CheckResponseV3>({
			customer_id: customerId,
			feature_id: TestFeature.AiModel,
			properties: { input_tokens: 1_000_000, output_tokens: 500_000 },
		});

		expect(checkRes.allowed).toBe(true);
		expect(checkRes.balance?.remaining).toMatchObject({
			input: 5_000_000,
			output: 5_000_000,
		});
	},
);
