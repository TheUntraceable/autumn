import { AppEnv } from "@autumn/shared";
import { createRoute } from "../../../../honoMiddlewares/routeHandler.js";
import { createOrgResponse } from "../../orgUtils.js";

export const handleGetOrg = createRoute({
	scopes: [],
	handler: async (c) => {
		const ctx = c.get("ctx");
		const { db, org, env } = ctx;
		const response = createOrgResponse({ org, env });

		if (response.deployed) {
			return c.json(response);
		}

		const [liveProduct, liveFeature] = await Promise.all([
			db.query.products.findFirst({
				columns: { internal_id: true },
				where: (products, { and, eq }) =>
					and(eq(products.org_id, org.id), eq(products.env, AppEnv.Live)),
			}),
			db.query.features.findFirst({
				columns: { internal_id: true },
				where: (features, { and, eq }) =>
					and(eq(features.org_id, org.id), eq(features.env, AppEnv.Live)),
			}),
		]);
		response.deployed = !!liveProduct || !!liveFeature;

		return c.json(response);
	},
});
