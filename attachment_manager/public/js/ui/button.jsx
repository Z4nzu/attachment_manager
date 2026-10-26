import * as React from "react";
import { Slot } from "radix-ui";
import { cva } from "class-variance-authority";
import { cn } from "./cn.js";

const buttonVariants = cva(
	"inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [@media(pointer:coarse)]:min-h-11",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
				destructive: "bg-destructive text-white shadow-sm hover:bg-destructive/90",
				outline: "border bg-background shadow-xs hover:bg-accent",
				ghost: "hover:bg-accent",
			},
			size: {
				default: "h-9 px-4",
				sm: "h-8 px-3",
				icon: "size-8 [@media(pointer:coarse)]:min-w-11",
			},
		},
		defaultVariants: { variant: "default", size: "default" },
	}
);

export const Button = React.forwardRef(({ className, variant, size, asChild, ...props }, ref) => {
	const Comp = asChild ? Slot.Root : "button";
	return (
		<Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
	);
});
