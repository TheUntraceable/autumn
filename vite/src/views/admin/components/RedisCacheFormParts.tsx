import {
	Button,
	DialogFooter,
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@autumn/ui";
import type { ReactNode } from "react";
import { getBackendErr } from "@/utils/genUtils";

type RedisInstanceOption<T extends string> = {
	value: T;
	label: string;
	description: string;
};

export const RedisInstanceSelect = <T extends string>({
	value,
	options,
	onChange,
	isOptionDisabled,
	children,
}: {
	value: T;
	options: readonly RedisInstanceOption<T>[];
	onChange: (value: T) => void;
	isOptionDisabled?: (option: RedisInstanceOption<T>) => boolean;
	children?: ReactNode;
}) => (
	<div className="flex flex-col gap-2">
		<div className="text-xs font-medium uppercase tracking-wide text-tertiary-foreground">
			Active instance
		</div>
		<Select
			value={value}
			onValueChange={(selected) => onChange(selected as T)}
			items={options.map((option) => ({
				value: option.value,
				label: option.label,
			}))}
		>
			<SelectTrigger>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					{options.map((option) => (
						<SelectItem
							key={option.value}
							value={option.value}
							disabled={isOptionDisabled?.(option)}
						>
							<div className="flex flex-col">
								<span className="text-sm text-foreground">{option.label}</span>
								<span className="text-xs text-tertiary-foreground">
									{option.description}
								</span>
							</div>
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
		{children}
	</div>
);

export const RedisCacheFormFooter = ({
	error,
	isSubmitting,
	saveDisabled,
	onSave,
	onClose,
}: {
	error: unknown;
	isSubmitting: boolean;
	saveDisabled: boolean;
	onSave: () => void;
	onClose: () => void;
}) => (
	<DialogFooter className="flex-wrap pt-2">
		{Boolean(error) && (
			<span role="alert" className="mr-auto text-xs text-destructive">
				{getBackendErr(error, "Failed to save config")}
			</span>
		)}
		<Button variant="secondary" onClick={onClose}>
			Cancel
		</Button>
		<Button
			variant="primary"
			onClick={onSave}
			isLoading={isSubmitting}
			disabled={saveDisabled}
		>
			Save
		</Button>
	</DialogFooter>
);
