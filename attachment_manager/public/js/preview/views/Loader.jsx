import * as React from "react";
import { Loader2 } from "lucide-react";

export default function Loader({ label = __("Loading…") }) {
	return (
		<div
			role="status"
			aria-live="polite"
			className="m-auto flex items-center gap-2 text-sm text-muted-foreground"
		>
			<Loader2 className="size-4 animate-spin" />
			{label}
		</div>
	);
}
