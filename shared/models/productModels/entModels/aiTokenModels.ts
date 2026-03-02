import { z } from "zod/v4";

export enum AiTokenType {
	Input = "input",
	Output = "output",
}

export const AiTokenAllowanceSchema = z.object({
	input: z.number(),
	output: z.number(),
});

export type AiTokenAllowance = z.infer<typeof AiTokenAllowanceSchema>;
