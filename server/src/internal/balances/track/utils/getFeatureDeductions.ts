import {
	type AiTokenAllowance,
	extractAiTokenProperties,
	FeatureNotFoundError,
	FeatureType,
	RecaseError,
} from "@autumn/shared";
import type { AutumnContext } from "../../../../honoUtils/HonoEnv.js";
import type { FeatureDeduction } from "../../utils/types/featureDeduction.js";

const DEFAULT_VALUE = 1;

export const getTrackFeatureDeductions = ({
	ctx,
	featureId,
	value,
	properties,
}: {
	ctx: AutumnContext;
	featureId: string;
	value?: number;
	properties?: Record<string, unknown>;
}) => {
	const featureDeductions: FeatureDeduction[] = [];

	const features = ctx.features;
	const mainFeature = features.find((f) => f.id === featureId);
	if (!mainFeature) {
		throw new FeatureNotFoundError({
			featureId,
		});
	}

	// For AI features, extract input/output token deductions from properties
	let aiDeduction: AiTokenAllowance | undefined;
	if (mainFeature.type === FeatureType.AI) {
		const tokenProps = extractAiTokenProperties({ properties });
		if (tokenProps) {
			aiDeduction = {
				input: tokenProps.input_tokens,
				output: tokenProps.output_tokens,
			};
		}
	}

	const mainFeatureDeduction =
		aiDeduction != null
			? aiDeduction.input + aiDeduction.output
			: (value ?? DEFAULT_VALUE);

	featureDeductions.push({
		feature: mainFeature,
		deduction: mainFeatureDeduction,
		aiDeduction,
	});

	return featureDeductions;
};

export const getTrackEventNameDeductions = ({
	ctx,
	eventName,
	value,
	properties,
}: {
	ctx: AutumnContext;
	eventName: string;
	value?: number;
	properties?: Record<string, unknown>;
}) => {
	const features = ctx.features;

	const mainFeatures = features.filter((f) =>
		f.event_names?.includes(eventName),
	);

	const featureDeductions = mainFeatures.flatMap((f) =>
		getTrackFeatureDeductions({
			ctx,
			featureId: f.id,
			value,
			properties,
		}),
	);

	if (featureDeductions.length === 0) {
		throw new RecaseError({
			message: `No features found for event name: ${eventName}`,
		});
	}

	return featureDeductions;
};
