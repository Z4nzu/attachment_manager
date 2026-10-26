// Every Frappe call the panel makes.

// Frappe error responses carry the message JSON-encoded twice in _server_messages.
export function serverMessage(json) {
	try {
		return JSON.parse(JSON.parse(json._server_messages || "[]")[0] || "{}").message;
	} catch {
		return null;
	}
}

// frappe.call rejects with a jqXHR that frappe already msgprinted; only real Errors (ours) need an alert.
// status 0 (offline/aborted) is the one failure frappe's request.js leaves silent (no handler, no msgprint).
export function alertError(e) {
	const message =
		e instanceof Error ? e.message : e?.status === 0 && __("Network error. Please try again.");
	if (message) frappe.show_alert({ message, indicator: "red" });
}

const api = (method, args) =>
	frappe.call({ method: `attachment_manager.api.${method}`, args }).then((r) => r.message);

// docinfo lacks owner/creation (frappe/desk/form/load.py:190-203); fetch them in one call.
export async function loadAttachments(frm) {
	const base = frm.get_docinfo()?.attachments || [];
	if (!base.length) return [];
	const names = base.map((a) => a.name);
	const [{ message = [] }, state] = await Promise.all([
		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "File",
				fields: ["name", "owner", "creation", "attachment_type"],
				filters: { name: ["in", names] },
				limit_page_length: 0,
			},
		}),
		api("get_user_state", { file_ids: names }),
	]);
	const byName = Object.fromEntries(message.map((f) => [f.name, f]));
	return base.map((a) => ({
		...a,
		...byName[a.name],
		is_favorite: state[a.name]?.is_favorite || 0,
		file_url: frm.attachments.get_file_url(a),
	}));
}

// `type` tags each uploaded file with that attachment type (checklist row uploads).
export function openUploader(frm, files, type) {
	const restrictions = {};
	if (frm.meta.max_attachments) {
		restrictions.max_number_of_files =
			frm.meta.max_attachments - frm.attachments.get_attachments().length;
	}
	new frappe.ui.FileUploader({
		doctype: frm.doctype,
		docname: frm.docname,
		frm,
		folder: "Home/Attachments",
		files: files?.length ? files : undefined,
		restrictions,
		make_attachments_public: frm.meta.make_attachments_public,
		on_success: async (file_doc) => {
			if (type) await setAttachmentType([file_doc.name], type).catch(alertError);
			frm.attachments.attachment_uploaded(file_doc);
		},
	});
}

export async function deleteAttachment(frm, name) {
	await frm.attachments.remove_attachment(name);
	frappe.show_alert({ message: __("Attachment deleted"), indicator: "green" });
}

// Core upload_file takes file_url + file_name, so the label becomes the File name (no label keeps core's URL tail).
export async function addLink(frm, url, label) {
	const body = new FormData();
	const fields = {
		file_url: url,
		doctype: frm.doctype,
		docname: frm.docname,
		is_private: 0,
		...(label ? { file_name: label } : {}),
	};
	for (const [k, v] of Object.entries(fields)) body.append(k, v);
	const r = await fetch("/api/method/upload_file", {
		method: "POST",
		body,
		credentials: "same-origin",
		headers: { "X-Frappe-CSRF-Token": frappe.csrf_token },
	});
	const json = await r.json();
	if (!r.ok) throw new Error(serverMessage(json) || __("Could not add the link."));
	frm.attachments.attachment_uploaded(json.message);
}

export const renameFile = (fileId, newName) =>
	api("rename_attachment", { file_id: fileId, new_name: newName });
export const setPrivate = (fileIds, isPrivate) =>
	api("set_private", { file_ids: fileIds, is_private: isPrivate ? 1 : 0 });
export const setAttachmentType = (fileIds, type) =>
	api("set_attachment_type", { file_ids: fileIds, attachment_type: type || "" });
export const getChecklist = (frm) =>
	api("get_checklist", { doctype: frm.doctype, name: frm.docname });
export const toggleFavorite = (fileId) => api("toggle_favorite", { file_id: fileId });

export async function deleteMany(frm, names) {
	let ok = 0;
	for (const name of names) {
		try {
			await frm.attachments.remove_attachment(name);
			ok++;
		} catch {
			// counted in the summary alert
		}
	}
	frappe.show_alert({
		message: __("Deleted {0} of {1} attachments", [ok, names.length]),
		indicator: ok === names.length ? "green" : "red",
	});
}

export function downloadFile(url, fileName) {
	const a = document.createElement("a");
	a.href = url;
	// `download` is ignored cross-origin, so the click would navigate the desk away.
	if (/^https?:$/.test(a.protocol) && a.origin !== location.origin)
		Object.assign(a, { target: "_blank", rel: "noopener" });
	else a.download = fileName || "attachment";
	document.body.appendChild(a);
	a.click();
	a.remove();
}

function zipName(response) {
	const header = response.headers.get("content-disposition") || "";
	const utf = header.match(/filename\*=UTF-8''([^;]+)/i);
	if (utf) return decodeURIComponent(utf[1]);
	return header.match(/filename="?([^"]+)"?/i)?.[1] || "attachments.zip";
}

export async function downloadZip(names) {
	const body = new FormData();
	body.append("files", JSON.stringify(names));
	body.append("csrf_token", frappe.csrf_token);
	const response = await fetch("/api/method/frappe.core.api.file.zip_files", {
		method: "POST",
		body,
		credentials: "same-origin",
	});
	if (
		!response.ok ||
		(response.headers.get("content-type") || "").includes("application/json")
	) {
		throw new Error(__("Failed to download attachments."));
	}
	const url = URL.createObjectURL(await response.blob());
	downloadFile(url, zipName(response));
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
