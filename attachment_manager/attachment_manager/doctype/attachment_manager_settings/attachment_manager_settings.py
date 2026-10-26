# Copyright (c) 2026, Hardik Zinzuvadiya and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document

from attachment_manager.rules import EXCLUDED_DOCTYPES, clear_rules_cache


class AttachmentManagerSettings(Document):
	def validate(self):
		seen = set()
		for row in self.rules:
			key = (row.document_type, row.attachment_type)
			if key in seen:
				frappe.throw(
					_("Row {0}: {1} already has a rule for {2}.").format(
						row.idx, row.document_type, row.attachment_type
					)
				)
			seen.add(key)
			if row.document_type in EXCLUDED_DOCTYPES:
				frappe.throw(
					_("Row {0}: {1} is a framework document type and can't have attachment rules.").format(
						row.idx, row.document_type
					)
				)
			meta = frappe.get_meta(row.document_type)
			if meta.istable:
				frappe.throw(
					_("Row {0}: {1} is a child table; add the rule to its parent document type.").format(
						row.idx, row.document_type
					)
				)
			needs_submit = row.lock_after_submit or (row.required and row.required_on == "Submit")
			if needs_submit and not meta.is_submittable:
				frappe.throw(
					_(
						"Row {0}: {1} can't be submitted, so it can't require attachments on Submit or lock them after submit."
					).format(row.idx, row.document_type)
				)

	def on_update(self):
		# Clear now for this request, and again once the rows are committed (or rolled back) so no worker caches stale rows.
		clear_rules_cache()
		frappe.db.after_commit.add(clear_rules_cache)
		frappe.db.after_rollback.add(clear_rules_cache)
