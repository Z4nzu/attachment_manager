import * as React from "react";
import { AlertDialog as A } from "radix-ui";
import { usePortal } from "./portal.js";
import { Button } from "./button.jsx";
import { useShadowFocusTrap } from "./use-shadow-focus-trap.js";

export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel,
	onConfirm,
}) {
	const trap = useShadowFocusTrap();
	return (
		<A.Root open={open} onOpenChange={onOpenChange}>
			<A.Portal container={usePortal()}>
				<A.Overlay className="fixed inset-0 z-overlay bg-black/40" />
				<A.Content
					{...trap}
					className="fixed left-1/2 top-1/2 z-overlay w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-6 shadow-xl"
				>
					<A.Title className="text-base font-semibold">{title}</A.Title>
					<A.Description className="mt-2 text-sm text-muted-foreground">
						{description}
					</A.Description>
					<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<A.Cancel asChild>
							<Button variant="outline">{__("Cancel")}</Button>
						</A.Cancel>
						<A.Action asChild>
							<Button variant="destructive" onClick={onConfirm}>
								{confirmLabel}
							</Button>
						</A.Action>
					</div>
				</A.Content>
			</A.Portal>
		</A.Root>
	);
}
