import frappe
import frappe.client
from frappe.core.doctype.doctype.test_doctype import new_doctype
from frappe.tests import IntegrationTestCase

from attachment_manager.api import (
	get_checklist,
	rename_attachment,
	save_pdf,
	set_attachment_type,
	set_private,
)
from attachment_manager.install import SEED_TYPES, seed_attachment_types
from attachment_manager.rules import clear_rules_cache
from attachment_manager.tests.test_api import make_pdf

TYPES = ("AM Test Drawing", "AM Test Invoice")


class TestRules(IntegrationTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		# DocType DDL commits implicitly, so it lives outside the test transaction and is dropped explicitly.
		cls.dt = (
			new_doctype(
				is_submittable=1,
				fields=[{"fieldname": "amount", "fieldtype": "Int", "label": "Amount"}],
			)
			.insert()
			.name
		)
		frappe.db.commit()
		cls.addClassCleanup(cls._drop_doctype)
		for t in TYPES:
			frappe.get_doc({"doctype": "Attachment Type", "attachment_type": t}).insert()

	@classmethod
	def _drop_doctype(cls):
		frappe.db.rollback()
		frappe.delete_doc("DocType", cls.dt, force=True)
		frappe.db.commit()
		clear_rules_cache()

	def setUp(self):
		# The DB rolls back per class, not per test: start each test with no rules.
		self.set_rules()
		self.addCleanup(clear_rules_cache)

	def set_rules(self, *rows):
		settings = frappe.get_doc("Attachment Manager Settings")
		settings.set("rules", list(rows))
		settings.save()

	def rule(self, attachment_type=TYPES[0], doctype=None, **kw):
		return {
			"document_type": doctype or self.dt,
			"attachment_type": attachment_type,
			**kw,
		}

	def make_doc(self, amount=5):
		return frappe.get_doc({"doctype": self.dt, "amount": amount}).insert()

	def attach(self, doc, attachment_type=None, n=1):
		return frappe.get_doc(
			{
				"doctype": "File",
				"file_name": f"am-rule-{frappe.generate_hash(length=6)}.pdf",
				"content": make_pdf(20 + n),
				"is_private": 1,
				"attached_to_doctype": doc.doctype,
				"attached_to_name": doc.name,
				"attachment_type": attachment_type,
			}
		).insert()

	def test_required_on_submit_lists_missing(self):
		self.set_rules(
			self.rule(required=1, required_on="Submit"),
			self.rule(TYPES[1], required=1, required_on="Submit"),
		)
		doc = self.make_doc()
		doc.save()  # Submit rules don't block Save
		with self.assertRaises(frappe.ValidationError) as cm:
			doc.submit()
		self.assertIn(
			f"Attach these before submitting: {TYPES[0]}, {TYPES[1]}.",
			str(cm.exception),
		)
		self.attach(doc, TYPES[0])
		self.attach(doc, TYPES[1], n=2)
		doc.reload()
		doc.submit()
		self.assertEqual(doc.docstatus, 1)

	def test_required_on_save_skips_new_doc(self):
		self.set_rules(self.rule(doctype="ToDo", required=1, required_on="Save"))
		todo = frappe.get_doc({"doctype": "ToDo", "description": "am rule"}).insert()
		with self.assertRaises(frappe.ValidationError) as cm:
			todo.save()
		self.assertIn(f"Attach these before saving: {TYPES[0]}.", str(cm.exception))
		self.attach(todo, TYPES[0])
		todo.reload()
		todo.save()

	def test_condition(self):
		self.set_rules(self.rule(required=1, required_on="Submit", condition="doc.amount > 10"))
		self.make_doc(amount=5).submit()  # condition false: optional
		with self.assertRaises(frappe.ValidationError):
			self.make_doc(amount=50).submit()

	def test_broken_condition_throws(self):
		self.set_rules(self.rule(required=1, required_on="Submit", condition="unknown_name > 1"))
		with self.assertRaises(frappe.ValidationError) as cm:
			self.make_doc().submit()
		self.assertIn(f"{self.dt} / {TYPES[0]}", str(cm.exception))

	def test_settings_validation(self):
		for row in (
			self.rule(doctype="ToDo", required=1, required_on="Submit"),
			self.rule(doctype="ToDo", lock_after_submit=1),
		):
			with self.assertRaises(frappe.ValidationError):
				self.set_rules(row)
		with self.assertRaises(frappe.ValidationError):
			self.set_rules(self.rule(), self.rule(required=1))
		with self.assertRaises(frappe.ValidationError):
			self.set_rules(self.rule(doctype="Has Role"))  # child table
		with self.assertRaises(frappe.ValidationError):
			self.set_rules(self.rule(doctype="DocType"))  # framework doctype
		with self.assertRaises(frappe.ValidationError):
			self.set_rules(self.rule(condition="x = 1"))  # statement, not an expression

	def test_save_rule_at_submit_says_submitting(self):
		self.set_rules(self.rule(required=1, required_on="Save"))
		doc = self.make_doc()
		with self.assertRaises(frappe.ValidationError) as cm:
			doc.submit()
		self.assertIn(f"Attach these before submitting: {TYPES[0]}.", str(cm.exception))

	def test_lock_after_submit(self):
		self.set_rules(self.rule(lock_after_submit=1))
		doc = self.make_doc()
		f = self.attach(doc, TYPES[0])
		other = self.make_doc()
		doc.submit()

		def edit(**values):
			frappe.get_doc("File", f.name).update(values).save()

		for attempt in (
			lambda: edit(attached_to_name=None, attached_to_doctype=None),
			lambda: edit(attached_to_name=other.name),
			lambda: edit(file_url="/private/files/elsewhere.pdf"),
			lambda: frappe.delete_doc("File", f.name),
			lambda: rename_attachment(f.name, "renamed"),
			lambda: set_private(frappe.as_json([f.name]), 0),
			lambda: set_attachment_type(frappe.as_json([f.name]), ""),
		):
			with self.assertRaisesRegex(frappe.ValidationError, "are locked"):
				attempt()
		# Checked before core deletes the bytes, so a refused delete leaves the file intact.
		self.assertTrue(frappe.get_doc("File", f.name).exists_on_disk())
		self.attach(doc, n=3)  # new uploads still allowed
		self.assertTrue(get_checklist(self.dt, doc.name)["locked"])
		doc.cancel()
		self.assertFalse(get_checklist(self.dt, doc.name)["locked"])
		frappe.delete_doc("File", f.name)

	def test_set_attachment_type(self):
		self.set_rules(self.rule())
		doc = self.make_doc()
		f = self.attach(doc)
		ids = frappe.as_json([f.name])
		set_attachment_type(ids, TYPES[0])
		self.assertEqual(frappe.db.get_value("File", f.name, "attachment_type"), TYPES[0])
		for attempt in (
			lambda: set_attachment_type(ids, TYPES[1]),  # not a rule type for this doctype
			lambda: frappe.client.set_value("File", f.name, "attachment_type", TYPES[1]),
		):
			with self.assertRaises(frappe.ValidationError):
				attempt()
		set_attachment_type(ids, "")
		self.assertIsNone(frappe.db.get_value("File", f.name, "attachment_type"))
		frappe.set_user("Guest")
		try:
			with self.assertRaises(frappe.PermissionError):
				set_attachment_type(ids, TYPES[0])
		finally:
			frappe.set_user("Administrator")

	def test_save_pdf_carries_type(self):
		self.set_rules(self.rule())
		f = self.attach(self.make_doc(), TYPES[0])
		self.assertEqual(save_pdf(f.name, "copy", make_pdf(30)).attachment_type, TYPES[0])

	def test_get_checklist(self):
		self.assertEqual(get_checklist(self.dt, self.make_doc().name), {"rows": [], "locked": False})
		self.set_rules(
			self.rule(required=1, required_on="Submit", condition="doc.amount > 10"),
			self.rule(TYPES[1]),
		)
		self.assertEqual(
			get_checklist(self.dt, self.make_doc(amount=50).name)["rows"],
			[
				{
					"attachment_type": TYPES[0],
					"required": True,
					"required_on": "Submit",
				},
				{"attachment_type": TYPES[1], "required": False, "required_on": "Save"},
			],
		)
		self.assertFalse(get_checklist(self.dt, self.make_doc(amount=5).name)["rows"][0]["required"])

	def test_seed_types_idempotent(self):
		frappe.delete_doc("Attachment Type", SEED_TYPES[0])
		seed_attachment_types()
		seed_attachment_types()
		self.assertEqual(
			frappe.db.count("Attachment Type", {"name": ["in", SEED_TYPES]}),
			len(SEED_TYPES),
		)
