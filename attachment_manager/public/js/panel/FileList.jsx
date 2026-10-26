import * as React from "react";
import { formatFileSize } from "../lib/file_utils.js";
import { linkHost } from "../lib/attachments.js";
import { fileVisual, isImage, TypeChip, PrivateIcon, FavoriteButton } from "./FileIcon.jsx";
import { FileContextMenu, MoreMenu } from "./FileMenu.jsx";

function FileRow({ file, actions }) {
	const { Icon, badge } = fileVisual(file.file_name, file.file_url);
	return (
		<FileContextMenu file={file} actions={actions}>
			<li className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent focus-within:bg-accent">
				<input
					type="checkbox"
					checked={actions.selected.has(file.name)}
					onChange={() => actions.toggleSelect(file)}
					aria-label={__("Select {0}", [file.file_name])}
					className={`size-4 shrink-0 accent-primary ${
						actions.hasSelection
							? ""
							: "[@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus:opacity-100"
					}`}
				/>
				<button
					type="button"
					onClick={() => actions.preview(file)}
					aria-label={__("Preview {0}", [file.file_name])}
					className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left outline-none"
				>
					{isImage(file) ? (
						<img
							src={file.file_url}
							alt=""
							loading="lazy"
							draggable={false}
							className="size-9 shrink-0 rounded-md object-cover"
						/>
					) : (
						<span
							className={`grid size-9 shrink-0 place-items-center rounded-md text-white ${badge}`}
						>
							<Icon className="size-4" aria-hidden />
						</span>
					)}
					<span className="min-w-0">
						<span className="block truncate text-sm font-medium">
							{file.file_name}
						</span>
						<span className="block truncate text-xs text-muted-foreground">
							{file.attachment_type && <TypeChip type={file.attachment_type} />}
							<PrivateIcon file={file} />
							{frappe.user.full_name(file.owner)} ·{" "}
							{frappe.datetime.prettyDate(file.creation)}
						</span>
					</span>
				</button>
				<span className="hidden w-16 shrink-0 text-right text-xs text-muted-foreground @md:block">
					{linkHost(file.file_url) || formatFileSize(file.file_size)}
				</span>
				<FavoriteButton file={file} actions={actions} />
				<MoreMenu file={file} actions={actions} />
			</li>
		</FileContextMenu>
	);
}

export const FileList = ({ files, actions }) => (
	<ul className="flex flex-col divide-y">
		{files.map((f) => (
			<FileRow key={f.name} file={f} actions={actions} />
		))}
	</ul>
);
