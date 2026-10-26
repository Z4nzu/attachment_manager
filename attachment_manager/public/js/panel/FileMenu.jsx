import * as React from "react";
import {
	Eye,
	Download,
	SquarePen,
	Trash2,
	MoreHorizontal,
	Star,
	Pencil,
	Lock,
	LockOpen,
	Tag,
} from "lucide-react";
import { Dropdown, Context } from "../ui/menu.jsx";
import { IconButton } from "../ui/icon-button.jsx";

// Radio items for picking a file's attachment type ("" = none); `M` is Dropdown or Context.
export function TypeItems({ M, types, value, onChange }) {
	return (
		<M.RadioGroup value={value} onValueChange={onChange}>
			<M.RadioItem value="">{__("None")}</M.RadioItem>
			{types.map((t) => (
				<M.RadioItem key={t} value={t}>
					{__(t)}
				</M.RadioItem>
			))}
		</M.RadioGroup>
	);
}

// Same items for the context menu and the ⋯ menu; `M` is Dropdown or Context from ui/menu.jsx.
function MenuItems({ M, file, actions }) {
	return (
		<>
			<M.Item onSelect={() => actions.preview(file)}>
				<Eye /> {__("Preview")}
			</M.Item>
			<M.Item onSelect={() => actions.download(file)}>
				<Download /> {__("Download")}
			</M.Item>
			{actions.onlyOffice(file) && (
				<M.Item
					onSelect={() => window.open(actions.onlyOffice(file), "_blank", "noopener")}
				>
					<SquarePen /> {__("Open in OnlyOffice")}
				</M.Item>
			)}
			<M.Item onSelect={() => actions.toggleFavorite(file)}>
				<Star /> {file.is_favorite ? __("Remove from favorites") : __("Add to favorites")}
			</M.Item>
			{actions.canWrite && (
				<>
					<M.Item onSelect={() => actions.askRename(file)}>
						<Pencil /> {__("Rename")}
					</M.Item>
					{actions.types.length > 0 && (
						<M.Sub>
							<M.SubTrigger>
								<Tag /> {__("Set type")}
							</M.SubTrigger>
							<M.SubContent>
								<TypeItems
									M={M}
									types={actions.types}
									value={file.attachment_type || ""}
									onChange={(t) => actions.setType([file], t)}
								/>
							</M.SubContent>
						</M.Sub>
					)}
					<M.Item onSelect={() => actions.setPrivate([file], !file.is_private)}>
						{file.is_private ? <LockOpen /> : <Lock />}{" "}
						{file.is_private ? __("Make public") : __("Make private")}
					</M.Item>
				</>
			)}
			{actions.canDelete && (
				<>
					<M.Separator />
					<M.Item danger onSelect={() => actions.askDelete(file)}>
						<Trash2 /> {__("Delete")}
					</M.Item>
				</>
			)}
		</>
	);
}

export function FileContextMenu({ file, actions, children }) {
	return (
		<Context.Root>
			<Context.Trigger asChild>{children}</Context.Trigger>
			<Context.Content>
				<MenuItems M={Context} file={file} actions={actions} />
			</Context.Content>
		</Context.Root>
	);
}

export function MoreMenu({ file, actions }) {
	return (
		<Dropdown.Root>
			<Dropdown.Trigger asChild>
				<IconButton label={__("More actions")} variant="ghost">
					<MoreHorizontal />
				</IconButton>
			</Dropdown.Trigger>
			<Dropdown.Content align="end">
				<MenuItems M={Dropdown} file={file} actions={actions} />
			</Dropdown.Content>
		</Dropdown.Root>
	);
}
