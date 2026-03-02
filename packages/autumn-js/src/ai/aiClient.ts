import {
	Autumn as AutumnBase,
	type TrackParams,
	type TrackResponse,
} from "@useautumn/sdk";
import type { RequestOptions } from "@useautumn/sdk/lib/sdks.js";

/** Parameters for tracking AI feature usage. */
export type AiTrackParams = Omit<TrackParams, "value" | "properties"> & {
	/** Number of input tokens consumed. */
	inputTokens: number;
	/** Number of output tokens consumed. */
	outputTokens: number;
};

/** Namespace for AI feature helpers attached to the Autumn client. */
export class AiClient {
	constructor(private readonly autumn: AutumnBase) {}

	/** Records AI feature usage, mapping inputTokens/outputTokens to server properties. */
	async track(
		{ inputTokens, outputTokens, ...rest }: AiTrackParams,
		options?: RequestOptions,
	): Promise<TrackResponse> {
		return this.autumn.track(
			{
				...rest,
				properties: {
					input_tokens: inputTokens,
					output_tokens: outputTokens,
				},
			},
			options,
		);
	}
}
