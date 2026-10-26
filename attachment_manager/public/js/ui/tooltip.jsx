import * as React from "react";
import { Tooltip as T } from "radix-ui";
import { usePortal } from "./portal.js";

export const TooltipProvider = T.Provider;
export function Tooltip({ label, children }) {
	return (
		<T.Root>
			<T.Trigger asChild>{children}</T.Trigger>
			<T.Portal container={usePortal()}>
				<T.Content
					sideOffset={6}
					className="z-overlay rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md"
				>
					{label}
				</T.Content>
			</T.Portal>
		</T.Root>
	);
}
