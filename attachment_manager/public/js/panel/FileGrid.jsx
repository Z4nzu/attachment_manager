import * as React from "react";
import { Download } from "lucide-react";
import { IconButton } from "../ui/icon-button.jsx";
import { formatFileSize } from "../lib/file_utils.js";
import { linkHost } from "../lib/attachments.js";
import { fileVisual, isImage, TypeChip, PrivateIcon, FavoriteButton } from "./FileIcon.jsx";
import { FileContextMenu, MoreMenu } from "./FileMenu.jsx";

function FileCard({ file, actions }) {
	const { Icon, badge, ext } = fileVisual(file.file_name, file.file_url);
	return (
		<FileContextMenu file={file} actions={actions}>
			<div className="group relative overflow-hidden rounded-lg border bg-card shadow-xs transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring">
				<button
					type="button"
					onClick={() => actions.preview(file)}
					aria-label={__("Preview {0}", [file.file_name])}
					className="relative flex aspect-[4/3] w-full cursor-pointer items-center justify-center bg-muted outline-none"
				>
					{isImage(file) ? (
						<img
							src={file.file_url}
							alt=""
							loading="lazy"
							draggable={false}
							className="size-full object-cover"
						/>
					) : (
						<Icon className="size-10 text-muted-foreground" aria-hidden />
					)}
					{!isImage(file) && (
						<span
							className={`absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white ${badge}`}
						>
							{ext}
						</span>
					)}
				</button>
				{/* Outside the preview button: no nested buttons, and a click never opens the preview. */}
				<FavoriteButton
					file={file}
					actions={actions}
					className="absolute right-2 top-2 size-7 bg-background/90 hover:bg-background"
				/>
				<input
					type="checkbox"
					checked={actions.selected.has(file.name)}
					onChange={() => actions.toggleSelect(file)}
					aria-label={__("Select {0}", [file.file_name])}
					className={`absolute bottom-[calc(25%+0.5rem)] left-2 size-4 accent-primary ${
						actions.hasSelection
							? ""
							: "[@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus:opacity-100"
					}`}
				/>
				<div className="flex items-start gap-1 p-2.5">
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-medium" title={file.file_name}>
							{file.file_name}
						</p>
						<p className="truncate text-xs text-muted-foreground">
							{file.attachment_type && <TypeChip type={file.attachment_type} />}
							<PrivateIcon file={file} />
							{linkHost(file.file_url) || formatFileSize(file.file_size)} ·{" "}
							{frappe.datetime.prettyDate(file.creation)}
						</p>
					</div>
					<div className="flex gap-0.5 opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
						<IconButton
							label={__("Download")}
							variant="ghost"
							className="hidden @md:inline-flex"
							onClick={() => actions.download(file)}
						>
							<Download />
						</IconButton>
						<MoreMenu file={file} actions={actions} />
					</div>
				</div>
			</div>
		</FileContextMenu>
	);
}

export function FileGrid({ files, actions }) {
	return (
		<div className="grid grid-cols-2 gap-3 @lg:grid-cols-3 @3xl:grid-cols-4 @5xl:grid-cols-5">
			{files.map((f) => (
				<FileCard key={f.name} file={f} actions={actions} />
			))}
		</div>
	);
}
