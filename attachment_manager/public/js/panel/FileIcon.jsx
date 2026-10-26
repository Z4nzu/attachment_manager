import * as React from "react";
import {
	File,
	FileText,
	FileSpreadsheet,
	FileImage,
	FileVideo,
	FileAudio,
	FileCode,
	FileArchive,
	Presentation,
	FileType,
	Link2,
	Lock,
	Star,
} from "lucide-react";
import { IconButton } from "../ui/icon-button.jsx";
import { cn } from "../ui/cn.js";
import { getExtension, getFileType } from "../lib/file_utils.js";
import { linkHost } from "../lib/attachments.js";

const TYPES = {
	pdf: [FileText, "bg-red-600"],
	document: [FileText, "bg-blue-600"],
	spreadsheet: [FileSpreadsheet, "bg-green-700"],
	presentation: [Presentation, "bg-orange-600"],
	image: [FileImage, "bg-violet-600"],
	vector: [FileImage, "bg-violet-600"],
	video: [FileVideo, "bg-pink-600"],
	audio: [FileAudio, "bg-teal-700"],
	script: [FileCode, "bg-slate-700"],
	text: [FileText, "bg-slate-600"],
	archive: [FileArchive, "bg-amber-700"],
	font: [FileType, "bg-slate-600"],
};

export function fileVisual(fileName, fileUrl) {
	if (linkHost(fileUrl)) return { Icon: Link2, badge: "bg-sky-600", ext: "LINK" };
	const [Icon, badge] = TYPES[getFileType(fileName)] || [File, "bg-slate-500"];
	return { Icon, badge, ext: (getExtension(fileName) || "file").toUpperCase().slice(0, 4) };
}

export const TypeChip = ({ type }) => (
	<span className="mr-1 inline-block max-w-full truncate rounded bg-muted px-1.5 align-middle text-[10px] font-medium text-foreground">
		{__(type)}
	</span>
);

export const PrivateIcon = ({ file }) =>
	file.is_private ? (
		<span className="mr-1 inline-block align-[-1px]" title={__("Private")}>
			<Lock className="size-3" aria-label={__("Private")} />
		</span>
	) : null;

// One-click favorite; an unfavorited star only shows on hover/focus where hovering exists.
export const FavoriteButton = ({ file, actions, className }) => (
	<IconButton
		label={file.is_favorite ? __("Remove from favorites") : __("Add to favorites")}
		variant="ghost"
		aria-pressed={!!file.is_favorite}
		onClick={(e) => {
			e.stopPropagation();
			actions.toggleFavorite(file);
		}}
		className={cn(
			!file.is_favorite &&
				"[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100",
			className
		)}
	>
		<Star className={file.is_favorite ? "fill-amber-400 text-amber-400" : ""} />
	</IconButton>
);

export const isImage = (f) => getFileType(f.file_name) === "image";
