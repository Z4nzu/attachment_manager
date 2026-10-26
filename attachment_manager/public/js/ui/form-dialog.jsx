import * as React from "react";
import { Dialog } from "radix-ui";
import { usePortal } from "./portal.js";
import { Button } from "./button.jsx";
import { alertError } from "../panel/actions.js";
import { useShadowFocusTrap } from "./use-shadow-focus-trap.js";

// Small input dialog: children are named fields; onSubmit(formData) may return a promise (busy while pending, errors keep it open).
export function FormDialog({ open, onOpenChange, title, submitLabel, onSubmit, children }) {
	const trap = useShadowFocusTrap();
	const portal = usePortal();
	const [busy, setBusy] = React.useState(false);
	// Radix FocusScope can't see focus inside the shadow DOM and would focus the container; focus the first field ourselves.
	const onOpenAutoFocus = (e) => {
		trap.onOpenAutoFocus();
		e.preventDefault();
		e.currentTarget.querySelector("input")?.focus();
	};
	const submit = async (e) => {
		e.preventDefault();
		setBusy(true);
		try {
			await onSubmit(new FormData(e.currentTarget));
			onOpenChange(false);
		} catch (err) {
			alertError(err);
		} finally {
			setBusy(false);
		}
	};
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal container={portal}>
				<Dialog.Overlay className="fixed inset-0 z-overlay bg-black/40" />
				<Dialog.Content
					{...trap}
					onOpenAutoFocus={onOpenAutoFocus}
					aria-describedby={undefined}
					className="fixed left-1/2 top-1/2 z-overlay w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-6 shadow-xl"
				>
					<form onSubmit={submit} className="flex flex-col gap-4">
						<Dialog.Title className="text-base font-semibold">{title}</Dialog.Title>
						{children}
						<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
							<Dialog.Close asChild>
								<Button type="button" variant="outline">
									{__("Cancel")}
								</Button>
							</Dialog.Close>
							<Button type="submit" disabled={busy}>
								{submitLabel}
							</Button>
						</div>
					</form>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
