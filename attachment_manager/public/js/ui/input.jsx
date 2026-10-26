import * as React from "react";
import { cn } from "./cn.js";

export const Input = React.forwardRef(({ className, ...props }, ref) => (
	<input
		ref={ref}
		className={cn(
			"h-8 w-full min-w-0 rounded-md border bg-background px-2.5 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring [@media(pointer:coarse)]:h-11",
			className
		)}
		{...props}
	/>
));
