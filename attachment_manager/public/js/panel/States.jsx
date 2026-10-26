import * as React from "react";
import { FolderOpen, SearchX, TriangleAlert, Plus } from "lucide-react";
import { Button } from "../ui/button.jsx";

function Shell({ icon: Icon, title, children }) {
	return (
		<div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center">
			<Icon className="size-8 text-muted-foreground" aria-hidden />
			<p className="font-medium">{title}</p>
			{children}
		</div>
	);
}

export const EmptyState = ({ onAdd }) => (
	<Shell icon={FolderOpen} title={__("No attachments yet")}>
		{onAdd && (
			<>
				<p className="text-sm text-muted-foreground">
					{__("Drag files here or add them from your device.")}
				</p>
				<Button size="sm" className="mt-2" onClick={onAdd}>
					<Plus /> {__("Add files")}
				</Button>
			</>
		)}
	</Shell>
);

export const NoResults = ({ query, favoritesOnly, typeFiltered, onClear }) => (
	<Shell
		icon={SearchX}
		title={
			query.trim()
				? __("No files match “{0}”", [query])
				: favoritesOnly
				? __("No favorites yet")
				: __("No files of this type")
		}
	>
		<Button size="sm" variant="outline" onClick={onClear}>
			{favoritesOnly || typeFiltered ? __("Clear filters") : __("Clear search")}
		</Button>
	</Shell>
);

export const ErrorState = ({ onRetry }) => (
	<Shell icon={TriangleAlert} title={__("Couldn't load attachments")}>
		<Button size="sm" variant="outline" onClick={onRetry}>
			{__("Retry")}
		</Button>
	</Shell>
);

export const LoadingState = () => (
	<div
		className="grid grid-cols-2 gap-3 @lg:grid-cols-3 @3xl:grid-cols-4 @5xl:grid-cols-5"
		aria-busy="true"
	>
		{Array.from({ length: 4 }, (_, i) => (
			<div key={i} className="h-36 animate-pulse rounded-lg bg-muted" />
		))}
	</div>
);
