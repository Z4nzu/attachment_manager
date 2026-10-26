"""Attachment rules: required attachment types per doctype, and the attachment lock after submit."""

import frappe
from frappe import _
from frappe.model.workflow import get_workflow_safe_globals

CACHE_KEY = "attachment_manager_rules"
LOCKED_FIELDS = (
	"file_name",
	"file_url",
	"is_private",
	"attachment_type",
	"attached_to_doctype",
	"attached_to_name",
	"attached_to_field",
)
# Framework doctypes that get no attachment panel and can't carry rules.
EXCLUDED_DOCTYPES = frozenset(
	(
		"DocType",
		"Custom Field",
		"Property Setter",
		"DocType Layout",
		"Module Def",
		"Page",
		"Report",
		"Print Format",
		"Print Format Field Template",
		"Web Form",
		"Workflow",
		"Workspace",
		"Server Script",
		"Client Script",
		"Notification",
		"Data Import",
		"File",
		"Version",
		"Deleted Document",
		"Error Log",
		"Attachment Type",
	)
)


def get_rules(doctype):
	"""Rule rows for a doctype, cached until Settings is saved."""
	# Patches and installs can save docs before the Attachment Rule table exists; rules and the lock are off then.
	if frappe.flags.in_install or frappe.flags.in_migrate:
		return []
	return frappe.cache.hget(
		CACHE_KEY,
		doctype,
		generator=lambda: frappe.get_all(
			"Attachment Rule",
			filters={"parent": "Attachment Manager Settings", "document_type": doctype},
			fields=[
				"attachment_type",
				"required",
				"required_on",
				"condition",
				"lock_after_submit",
			],
			order_by="idx",
		),
	)


def is_locked(doctype):
	return any(r.lock_after_submit for r in get_rules(doctype))


def clear_rules_cache():
	frappe.cache.delete_value(CACHE_KEY)


def applies(rule, doc):
	"""Whether the rule's condition holds, evaluated like a workflow transition condition."""
	if not rule.condition:
		return True
	try:
		return bool(frappe.safe_eval(rule.condition, get_workflow_safe_globals(), {"doc": doc.as_dict()}))
	except Exception as e:
		frappe.throw(
			_("The attachment rule condition for {0} / {1} is invalid: {2}").format(
				_(doc.doctype), rule.attachment_type, e
			)
		)


def check_required(doc, on):
	if doc.doctype in ("Attachment Manager Settings", "File"):
		return
	rows = [r for r in get_rules(doc.doctype) if r.required and r.required_on == on]
	if not rows:
		return
	attached = set(
		frappe.get_all(
			"File",
			filters={"attached_to_doctype": doc.doctype, "attached_to_name": doc.name},
			pluck="attachment_type",
		)
	)
	missing = [r.attachment_type for r in rows if applies(r, doc) and r.attachment_type not in attached]
	if missing:
		# Save rules also run in validate during a submit.
		msg = (
			_("Attach these before submitting: {0}.")
			if getattr(doc, "_action", None) == "submit"
			else _("Attach these before saving: {0}.")
		)
		frappe.throw(msg.format(", ".join(missing)), title=_("Missing attachments"))


def validate(doc, method=None):
	# A new doc can't have attachments yet.
	if not doc.is_new():
		check_required(doc, "Save")


def before_submit(doc, method=None):
	check_required(doc, "Submit")


def check_unlocked(file):
	dt, dn = file.attached_to_doctype, file.attached_to_name
	if dt and dn and is_locked(dt) and frappe.db.get_value(dt, dn, "docstatus") == 1:
		frappe.throw(_("Attachments on a submitted {0} are locked.").format(_(dt)))


def check_type(file):
	"""A file's type must be one of its parent doctype's rule types; doctypes without rules (and unattached files) accept any."""
	dt = file.attached_to_doctype
	if not (file.attachment_type and dt):
		return
	types = {r.attachment_type for r in get_rules(dt)}
	if types and file.attachment_type not in types:
		frappe.throw(_("{0} isn't an attachment type for {1}.").format(file.attachment_type, _(dt)))


class FileLock:
	"""File mixin; checks the lock before core File.validate/on_trash move or delete the bytes on disk."""

	def validate(self):
		if not self.is_new() and any(self.has_value_changed(f) for f in LOCKED_FIELDS):
			# The old parent: detaching or re-attaching must not escape its lock.
			check_unlocked(self.get_doc_before_save() or self)
		if self.has_value_changed("attachment_type") or self.has_value_changed("attached_to_doctype"):
			check_type(self)
		super().validate()

	def on_trash(self):
		check_unlocked(self)
		super().on_trash()
