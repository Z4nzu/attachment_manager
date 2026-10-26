import * as React from "react";
import { DropdownMenu, ContextMenu } from "radix-ui";
import { ChevronRight } from "lucide-react";
import { cn } from "./cn.js";
import { usePortal } from "./portal.js";

const CONTENT =
	"z-overlay min-w-44 overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg";
const ITEM =
	"relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-muted-foreground [@media(pointer:coarse)]:py-2.5";
const DANGER = "text-destructive [&_svg]:!text-destructive";

function build(P) {
	const Content = React.forwardRef(({ className, ...props }, ref) => (
		<P.Portal container={usePortal()}>
			<P.Content ref={ref} className={cn(CONTENT, className)} {...props} />
		</P.Portal>
	));
	const Item = React.forwardRef(({ className, danger, ...props }, ref) => (
		<P.Item ref={ref} className={cn(ITEM, danger && DANGER, className)} {...props} />
	));
	const RadioItem = React.forwardRef(({ className, children, ...props }, ref) => (
		<P.RadioItem ref={ref} className={cn(ITEM, "pr-8", className)} {...props}>
			{children}
			<P.ItemIndicator className="absolute right-2 size-1.5 rounded-full bg-foreground" />
		</P.RadioItem>
	));
	const SubTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
		<P.SubTrigger
			ref={ref}
			className={cn(ITEM, "data-[state=open]:bg-accent", className)}
			{...props}
		>
			{children}
			<ChevronRight className="ml-auto" />
		</P.SubTrigger>
	));
	const SubContent = React.forwardRef(({ className, ...props }, ref) => (
		<P.Portal container={usePortal()}>
			<P.SubContent ref={ref} className={cn(CONTENT, className)} {...props} />
		</P.Portal>
	));
	const Separator = (props) => <P.Separator className="-mx-1 my-1 h-px bg-border" {...props} />;
	const Label = (props) => (
		<P.Label className="px-2 py-1.5 text-xs font-medium text-muted-foreground" {...props} />
	);
	return {
		Root: P.Root,
		Trigger: P.Trigger,
		Content,
		Item,
		RadioGroup: P.RadioGroup,
		RadioItem,
		Separator,
		Label,
		Sub: P.Sub,
		SubTrigger,
		SubContent,
	};
}

export const Dropdown = build(DropdownMenu);
export const Context = build(ContextMenu);
