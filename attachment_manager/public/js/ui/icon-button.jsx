import * as React from "react";
import { Button } from "./button.jsx";
import { Tooltip } from "./tooltip.jsx";

export const IconButton = React.forwardRef(({ label, variant = "outline", ...props }, ref) => (
	<Tooltip label={label}>
		<Button ref={ref} size="icon" variant={variant} aria-label={label} {...props} />
	</Tooltip>
));
