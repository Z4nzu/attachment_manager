# Copyright (c) 2026, Hardik Zinzuvadiya and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class AttachmentUserState(Document):
	def validate(self):
		if self.user != frappe.session.user and "System Manager" not in frappe.get_roles():
			frappe.throw(
				frappe._("You can only set your own attachment state."),
				frappe.PermissionError,
			)
		if frappe.db.exists(
			"Attachment User State",
			{"user": self.user, "file": self.file, "name": ["!=", self.name]},
		):
			frappe.throw(frappe._("This file already has a state row for {0}.").format(self.user))
