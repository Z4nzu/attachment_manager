import os

import frappe
from frappe import _
from frappe.utils import cint

from attachment_manager.rules import EXCLUDED_DOCTYPES, applies, get_rules, is_locked

ATTACH_FIELDS = ("Attach", "Attach Image")


@frappe.whitelist(methods=["POST"])
def save_edited_pdf(file_id: str, mode: str):
	"""Save an annotated PDF (uploaded as `file`) as a copy or in place of the original."""
	new = save_pdf(file_id, mode, frappe.request.files["file"].stream.read())
	return {k: new.get(k) for k in ("name", "file_name", "file_url", "is_private")}


def save_pdf(file_id: str, mode: str, content: bytes):
	old = frappe.get_doc("File", file_id)
	if mode not in ("copy", "replace") or not old.file_name.lower().endswith(".pdf"):
		frappe.throw(_("Only PDF attachments can be saved here."))
	parent = _writable_parent(old)
	# ponytail: top-level fields only; child-table Attach fields aren't checked.
	if mode == "replace" and any(
		parent.get(df.fieldname) == old.file_url for df in parent.meta.fields if df.fieldtype in ATTACH_FIELDS
	):
		frappe.throw(_("This file is set in a field on the document. Save it as a copy instead."))

	name = old.file_name if mode == "replace" else f"{old.file_name[:-4]} (edited).pdf"
	new = frappe.get_doc(
		{
			"doctype": "File",
			"file_name": name,
			"content": content,
			"is_private": old.is_private,
			"attached_to_doctype": old.attached_to_doctype,
			"attached_to_name": old.attached_to_name,
			"attachment_type": old.get("attachment_type"),
		}
	).insert()
	# save_file suffixes file_name when that path is taken on disk; keep the disk path, restore the display name.
	if new.file_name != name:
		new.db_set("file_name", name)
	if mode == "replace":
		# Core delete: runs protected-file checks and keeps bytes still shared by another File.
		frappe.delete_doc("File", old.name)
	return new


def _writable_parent(file_doc):
	if not (file_doc.attached_to_doctype and file_doc.attached_to_name):
		frappe.throw(_("This file isn't attached to a document."))
	parent = frappe.get_doc(file_doc.attached_to_doctype, file_doc.attached_to_name)
	parent.check_permission("write")
	return parent


def with_extension(name: str, original: str) -> str:
	ext = os.path.splitext(original)[1]
	if not name or not ext or name.lower().endswith(ext.lower()):
		return name
	return name + ext


@frappe.whitelist(methods=["POST"])
def rename_attachment(file_id: str, new_name: str):
	doc = frappe.get_doc("File", file_id)
	_writable_parent(doc)
	name = with_extension((new_name or "").strip(), doc.file_name)
	if not name:
		frappe.throw(_("Name can't be empty."))
	doc.file_name = name
	doc.save()
	return doc.file_name


@frappe.whitelist(methods=["POST"])
def set_private(file_ids, is_private):
	"""Core File.save moves the bytes and fixes shared copies and Attach fields; any failure rolls back the request."""
	is_private = cint(is_private)
	for file_id in frappe.parse_json(file_ids):
		doc = frappe.get_doc("File", file_id)
		_writable_parent(doc)
		if cint(doc.is_private) != is_private:
			doc.is_private = is_private
			doc.save()


@frappe.whitelist(methods=["POST"])
def set_attachment_type(file_ids, attachment_type=None):
	"""Tag files with an attachment type, or clear it (""); File validation checks the type and the lock."""
	for file_id in frappe.parse_json(file_ids):
		doc = frappe.get_doc("File", file_id)
		_writable_parent(doc)
		if (doc.attachment_type or "") != (attachment_type or ""):
			doc.attachment_type = attachment_type or None
			doc.save()


@frappe.whitelist()
def get_checklist(doctype: str, name: str):
	doc = frappe.get_doc(doctype, name)
	doc.check_permission("read")
	return {
		"rows": [
			{
				"attachment_type": r.attachment_type,
				"required": bool(r.required and applies(r, doc)),
				"required_on": r.required_on,
			}
			for r in get_rules(doctype)
		],
		"locked": doc.docstatus == 1 and is_locked(doctype),
	}


@frappe.whitelist(methods=["POST"])
def toggle_favorite(file_id: str):
	frappe.get_doc("File", file_id).check_permission("read")
	name = frappe.db.get_value("Attachment User State", {"user": frappe.session.user, "file": file_id})
	doc = frappe.get_doc("Attachment User State", name) if name else frappe.new_doc("Attachment User State")
	doc.update(
		{
			"user": frappe.session.user,
			"file": file_id,
			"is_favorite": 0 if doc.is_favorite else 1,
		}
	)
	doc.save()
	return doc.is_favorite


@frappe.whitelist()
def get_user_state(file_ids):
	rows = frappe.get_all(
		"Attachment User State",
		filters={
			"user": frappe.session.user,
			"file": ["in", frappe.parse_json(file_ids)],
		},
		fields=["file", "is_favorite"],
	)
	return {r.file: {"is_favorite": r.is_favorite} for r in rows}


def delete_user_state(doc, method=None):
	frappe.db.delete("Attachment User State", {"file": doc.name})


def has_app_permission():
	"""Show the apps-screen tile to users who can open Attachment Manager Settings."""
	return frappe.has_permission("Attachment Manager Settings")


def boot(bootinfo):
	show = frappe.db.get_single_value("Attachment Manager Settings", "show_native_attachments")
	bootinfo.attachment_manager = {
		"show_native_attachments": cint(show),
		"excluded_doctypes": sorted(EXCLUDED_DOCTYPES),
	}
