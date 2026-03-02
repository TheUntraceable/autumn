import { Autumn as AutumnBase } from "@useautumn/sdk";
import { AiClient } from "./aiClient.js";

export type { AiTrackParams } from "./aiClient.js";
export { AiClient };

/** Extended Autumn client with an `ai` namespace for AI feature tracking. */
export class Autumn extends AutumnBase {
	private _ai?: AiClient;

	get ai(): AiClient {
		return (this._ai ??= new AiClient(this));
	}
}
