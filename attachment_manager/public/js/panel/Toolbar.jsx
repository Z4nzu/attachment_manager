import * as React from "react";
import {
	Search,
	ArrowUpDown,
	LayoutGrid,
	List,
	Download,
	Plus,
	Upload,
	Loader2,
	Star,
	Link2,
	Lock,
	LockOpen,
	Trash2,
	X,
	Tag,
} from "lucide-react";
import { Dropdown } from "../ui/menu.jsx";
import { IconButton } from "../ui/icon-button.jsx";
import { Button } from "../ui/button.jsx";
import { Tooltip } from "../ui/tooltip.jsx";
import { cn } from "../ui/cn.js";
import { Input } from "../ui/input.jsx";
import { SORTS, UNTYPED } from "../lib/attachments.js";
import { TypeItems } from "./FileMenu.jsx";

// Selection-bar action: icon-only with a tooltip in narrow panels, icon + text from @3xl.
const BarButton = React.forwardRef(({ label, icon, danger, className, ...props }, ref) => (
	<Tooltip label={label}>
		<Button
			ref={ref}
			size="sm"
			variant="ghost"
			aria-label={label}
			className={cn(
				"px-2 @3xl:px-3",
				danger && "text-destructive hover:bg-destructive/10 [&_svg]:text-destructive",
				className
			)}
			{...props}
		>
			{icon}
			<span className="hidden @3xl:inline">{label}</span>
		</Button>
	</Tooltip>
));

export function Toolbar({
	count,
	shown,
	query,
	onQuery,
	sort,
	onSort,
	view,
	onView,
	zipping,
	onZip,
	onUpload,
	favoritesOnly,
	filtered,
	onFavoritesOnly,
	canWrite,
	onAddLink,
	selection,
	types,
	typeFilter,
	onTypeFilter,
}) {
	const normal = React.useRef(null);
	const wasSelecting = React.useRef(false);
	// The keys force a remount (else React reuses the divs and focus lands on whichever button shares the slot). When the selection bar unmounts with focus inside it (focus fixup moves it to body; focus elsewhere, e.g. a form field, is left alone), hand focus to the normal toolbar so keyboard users aren't dropped to body.
	React.useEffect(() => {
		if (wasSelecting.current && !selection && document.activeElement === document.body)
			normal.current?.querySelector("input, button")?.focus();
		wasSelecting.current = !!selection;
	}, [selection]);
	if (selection)
		return (
			<div
				key="selection"
				className="flex items-center gap-1 @3xl:gap-2"
				role="toolbar"
				aria-label={__("Selection actions")}
			>
				<input
					type="checkbox"
					checked={selection.allShown}
					ref={(el) => el && (el.indeterminate = !selection.allShown)}
					onChange={selection.onToggleAll}
					aria-label={
						selection.allShown
							? __("Deselect all")
							: __("Select all {0}", [selection.shownCount])
					}
					title={
						selection.allShown
							? __("Deselect all")
							: __("Select all {0}", [selection.shownCount])
					}
					className="size-4 shrink-0 accent-primary"
				/>
				<span className="mr-auto truncate text-sm font-semibold">
					{__("{0} selected", [selection.count])}
				</span>
				<BarButton label={__("Download")} icon={<Download />} onClick={selection.onZip} />
				{selection.canWrite && (
					<BarButton
						label={__("Make private")}
						icon={<Lock />}
						onClick={selection.onPrivate}
					/>
				)}
				{selection.canWrite && (
					<BarButton
						label={__("Make public")}
						icon={<LockOpen />}
						onClick={selection.onPublic}
					/>
				)}
				{selection.canWrite && types.length > 0 && (
					<Dropdown.Root>
						<Dropdown.Trigger asChild>
							<BarButton label={__("Set type")} icon={<Tag />} />
						</Dropdown.Trigger>
						<Dropdown.Content align="end">
							<TypeItems M={Dropdown} types={types} onChange={selection.onSetType} />
						</Dropdown.Content>
					</Dropdown.Root>
				)}
				{selection.canDelete && (
					<BarButton
						label={__("Delete")}
						icon={<Trash2 />}
						danger
						onClick={selection.onDelete}
					/>
				)}
				<IconButton
					label={__("Clear selection")}
					variant="ghost"
					onClick={selection.onClear}
				>
					<X />
				</IconButton>
			</div>
		);
	return (
		<div key="normal" ref={normal} className="flex flex-wrap items-center gap-2">
			<h3 className="mr-auto flex items-center gap-2 text-sm font-semibold">
				{__("Attachments")}
				<span className="rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground">
					{count}
				</span>
			</h3>
			<div className="relative order-last w-full @xl:order-none @xl:w-56">
				<Search
					className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
					aria-hidden
				/>
				<Input
					type="search"
					value={query}
					onChange={(e) => onQuery(e.target.value)}
					placeholder={__("Search files")}
					aria-label={__("Search files")}
					className="pl-8"
				/>
			</div>
			<Dropdown.Root>
				<Dropdown.Trigger asChild>
					<IconButton label={__("Sort: {0}", [__(SORTS[sort].label)])}>
						<ArrowUpDown />
					</IconButton>
				</Dropdown.Trigger>
				<Dropdown.Content align="end">
					<Dropdown.Label>{__("Sort by")}</Dropdown.Label>
					<Dropdown.RadioGroup value={sort} onValueChange={onSort}>
						{Object.entries(SORTS).map(([k, s]) => (
							<Dropdown.RadioItem key={k} value={k}>
								{__(s.label)}
							</Dropdown.RadioItem>
						))}
					</Dropdown.RadioGroup>
				</Dropdown.Content>
			</Dropdown.Root>
			<div
				className="hidden rounded-md border p-0.5 @xl:flex"
				role="group"
				aria-label={__("View")}
			>
				<IconButton
					label={__("Grid view")}
					variant="ghost"
					aria-pressed={view === "grid"}
					className="size-7 aria-pressed:bg-accent"
					onClick={() => onView("grid")}
				>
					<LayoutGrid />
				</IconButton>
				<IconButton
					label={__("List view")}
					variant="ghost"
					aria-pressed={view === "list"}
					className="size-7 aria-pressed:bg-accent"
					onClick={() => onView("list")}
				>
					<List />
				</IconButton>
			</div>
			{types.length > 0 && (
				<Dropdown.Root>
					<Dropdown.Trigger asChild>
						<IconButton
							label={
								typeFilter
									? __("Type: {0}", [
											typeFilter === UNTYPED
												? __("Untyped")
												: __(typeFilter),
									  ])
									: __("Filter by type")
							}
							aria-pressed={!!typeFilter}
							className="aria-pressed:bg-accent"
						>
							<Tag />
						</IconButton>
					</Dropdown.Trigger>
					<Dropdown.Content align="end">
						<Dropdown.Label>{__("Attachment type")}</Dropdown.Label>
						<Dropdown.RadioGroup value={typeFilter} onValueChange={onTypeFilter}>
							<Dropdown.RadioItem value="">{__("All")}</Dropdown.RadioItem>
							{types.map((t) => (
								<Dropdown.RadioItem key={t} value={t}>
									{__(t)}
								</Dropdown.RadioItem>
							))}
							<Dropdown.RadioItem value={UNTYPED}>
								{__("Untyped")}
							</Dropdown.RadioItem>
						</Dropdown.RadioGroup>
					</Dropdown.Content>
				</Dropdown.Root>
			)}
			<IconButton
				label={__("Favorites")}
				aria-pressed={favoritesOnly}
				className="aria-pressed:bg-accent"
				onClick={() => onFavoritesOnly(!favoritesOnly)}
			>
				<Star className={favoritesOnly ? "fill-current" : ""} />
			</IconButton>
			<IconButton
				label={filtered ? __("Download {0} shown", [shown]) : __("Download all")}
				disabled={!shown || zipping}
				aria-busy={zipping}
				onClick={onZip}
			>
				{zipping ? <Loader2 className="animate-spin" /> : <Download />}
			</IconButton>
			{canWrite && (
				<Dropdown.Root>
					<Dropdown.Trigger asChild>
						<Button size="sm">
							<Plus /> {__("Add")}
						</Button>
					</Dropdown.Trigger>
					<Dropdown.Content align="end">
						<Dropdown.Item onSelect={onUpload}>
							<Upload /> {__("Upload files")}
						</Dropdown.Item>
						<Dropdown.Item onSelect={onAddLink}>
							<Link2 /> {__("Add link")}
						</Dropdown.Item>
					</Dropdown.Content>
				</Dropdown.Root>
			)}
		</div>
	);
}
