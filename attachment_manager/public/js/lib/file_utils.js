// Shared file helpers for the panel and preview bundles.

export const FILE_EXTENSIONS = {
	image: ["jpg", "jpeg", "png", "gif", "bmp", "webp", "ico"],
	audio: ["mp3", "wav", "ogg", "m4a", "aac", "flac"],
	video: ["mp4", "webm", "mov", "avi", "mkv"],
	pdf: ["pdf"],
	document: ["doc", "docx", "odt"],
	spreadsheet: ["xls", "xlsx", "csv", "ods"],
	presentation: ["ppt", "pptx", "odp"],
	archive: ["zip", "rar", "tar", "gz", "7z"],
	text: ["txt", "rtf", "md", "log"],
	script: [
		"js",
		"jsx",
		"ts",
		"tsx",
		"mjs",
		"sh",
		"bat",
		"py",
		"html",
		"xml",
		"json",
		"css",
		"scss",
		"less",
		"yaml",
		"yml",
		"sql",
		"toml",
		"ini",
	],
	font: ["ttf", "otf", "woff", "woff2"],
	calendar: ["ics"],
	vector: ["svg"],
};

export function getExtension(fileName = "") {
	const parts = String(fileName).split(".");
	return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

export function getFileType(fileName) {
	const ext = getExtension(fileName);
	for (const [type, extensions] of Object.entries(FILE_EXTENSIONS)) {
		if (extensions.includes(ext)) return type;
	}
	return "unknown";
}

export function formatFileSize(bytes) {
	if (!bytes) return "0 B";
	const units = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
