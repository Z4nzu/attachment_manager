import * as React from "react";
import { ChevronRight, CircleCheck, CircleX, ListChecks, Upload, FileCheck } from "lucide-react";
import { Button } from "../ui/button.jsx";
import { Dropdown } from "../ui/menu.jsx";
import { cn } from "../ui/cn.js";

function hint(item) {
	if (!item.required) return __("(optional)");
	return item.required_on === "Submit" ? __("(required on Submit)") : __("(required)");
}

function Row({ item, files, flagMissing, editable, onUpload, onTag }) {
	const red = flagMissing && item.required && !item.done;
	const others = files.filter((f) => f.attachment_type !== item.attachment_type);
	const names = item.files.map((f) => f.file_name).join(", ");
	return (
		<li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
			{item.done ? (
				<CircleCheck
					className="size-4 shrink-0 text-green-600"
					aria-label={__("Attached")}
				/>
			) : (
				<CircleX
					className={cn(
						"size-4 shrink-0",
						red ? "text-destructive" : "text-muted-foreground"
					)}
					aria-label={__("Missing")}
				/>
			)}
			<div className="min-w-0 flex-1">
				<p className={cn("text-sm font-medium", red && "text-destructive")}>
					{__(item.attachment_type)}{" "}
					<span className="text-xs font-normal text-muted-foreground">{hint(item)}</span>
				</p>
				{names && (
					<p className="truncate text-xs text-muted-foreground" title={names}>
						{names}
					</p>
				)}
			</div>
			{editable && (
				<div className="flex gap-2">
					<Button
						size="sm"
						variant="outline"
						onClick={() => onUpload(item.attachment_type)}
					>
						<Upload /> {__("Upload")}
					</Button>
					{others.length > 0 && (
						<Dropdown.Root>
							<Dropdown.Trigger asChild>
								<Button size="sm" variant="ghost">
									<FileCheck /> {__("Choose existing")}
								</Button>
							</Dropdown.Trigger>
							<Dropdown.Content align="end" className="max-w-72">
								{others.map((f) => (
									<Dropdown.Item
										key={f.name}
										onSelect={() => onTag([f], item.attachment_type)}
									>
										<span className="truncate">{f.file_name}</span>
									</Dropdown.Item>
								))}
							</Dropdown.Content>
						</Dropdown.Root>
					)}
				</div>
			)}
		</li>
	);
}

// `flagMissing` (after a failed Save/Submit) turns missing required rows red and reopens the list.
export function Checklist({ list, files, flagMissing, editable, onUpload, onTag }) {
	const [open, setOpen] = React.useState(true);
	React.useEffect(() => {
		if (flagMissing) setOpen(true);
	}, [flagMissing]);
	return (
		<details
			open={open}
			onToggle={(e) => setOpen(e.currentTarget.open)}
			className="group rounded-lg border"
		>
			<summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
				<ChevronRight
					className="size-4 text-muted-foreground transition-transform group-open:rotate-90"
					aria-hidden
				/>
				<ListChecks className="size-4 text-muted-foreground" aria-hidden />
				{list.required
					? __("Required documents {0} of {1}", [list.done, list.required])
					: __("Attachment types")}
			</summary>
			<ul className="divide-y border-t">
				{list.items.map((item) => (
					<Row
						key={item.attachment_type}
						item={item}
						files={files}
						flagMissing={flagMissing}
						editable={editable}
						onUpload={onUpload}
						onTag={onTag}
					/>
				))}
			</ul>
		</details>
	);
}
