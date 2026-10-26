import { getExtension, getFileType } from "./file_utils.js";

export const SORTS = {
	date_desc: {
		label: "Newest",
		fn: (a, b) => (b.creation || "").localeCompare(a.creation || ""),
	},
	date_asc: {
		label: "Oldest",
		fn: (a, b) => (a.creation || "").localeCompare(b.creation || ""),
	},
	name_asc: {
		label: "Name A–Z",
		fn: (a, b) => (a.file_name || "").localeCompare(b.file_name || ""),
	},
	name_desc: {
		label: "Name Z–A",
		fn: (a, b) => (b.file_name || "").localeCompare(a.file_name || ""),
	},
	size_desc: { label: "Largest", fn: (a, b) => (b.file_size || 0) - (a.file_size || 0) },
	size_asc: { label: "Smallest", fn: (a, b) => (a.file_size || 0) - (b.file_size || 0) },
};

export const UNTYPED = "__untyped";

// `type`: "" = all, UNTYPED = files without a type, else that attachment type.
export function filterAndSort(
	list,
	{ query = "", sort = "date_desc", favoritesOnly = false, type = "" } = {}
) {
	const q = query.trim().toLowerCase();
	const out = list.filter((f) => {
		if (favoritesOnly && !f.is_favorite) return false;
		if (type && (type === UNTYPED ? f.attachment_type : f.attachment_type !== type))
			return false;
		if (!q) return true;
		const name = (f.file_name || "").toLowerCase();
		return (
			name.includes(q) ||
			getExtension(f.file_name).includes(q) ||
			getFileType(f.file_name).includes(q)
		);
	});
	return out.sort((SORTS[sort] || SORTS.date_desc).fn);
}

// Checklist rows with their files; `done` = at least one file of that type. Counts cover required rows only.
export function checklist(rows, files) {
	const items = rows.map((r) => {
		const matched = files.filter((f) => f.attachment_type === r.attachment_type);
		return { ...r, files: matched, done: matched.length > 0 };
	});
	const required = items.filter((i) => i.required);
	return { items, required: required.length, done: required.filter((i) => i.done).length };
}

export const ONLYOFFICE_EXTS = [
	"csv",
	"djvu",
	"doc",
	"docm",
	"docx",
	"docxf",
	"dot",
	"dotm",
	"dotx",
	"epub",
	"fb2",
	"fodp",
	"fods",
	"fodt",
	"html",
	"mht",
	"odp",
	"ods",
	"odt",
	"oform",
	"otp",
	"ots",
	"ott",
	"oxps",
	"pdf",
	"pot",
	"potm",
	"potx",
	"pps",
	"ppsm",
	"ppsx",
	"ppt",
	"pptm",
	"pptx",
	"rtf",
	"txt",
	"xls",
	"xlsb",
	"xlsm",
	"xlsx",
	"xlt",
	"xltm",
	"xltx",
	"xml",
	"xps",
];

export function onlyOfficeUrl(file, versions = window.frappe?.boot?.versions) {
	if (!versions?.onlyoffice_integration || !file) return null;
	return ONLYOFFICE_EXTS.includes(getExtension(file.file_name))
		? `/frontend/onlyoffice-editor/${file.name}`
		: null;
}

// Hostname when the file is a link to another origin (not an uploaded file), else null.
export function linkHost(fileUrl, origin = globalThis.location?.origin) {
	try {
		const u = new URL(fileUrl);
		return /^https?:$/.test(u.protocol) && u.origin !== origin ? u.hostname : null;
	} catch {
		return null;
	}
}
