import io
import os

import frappe
from frappe.tests import IntegrationTestCase
from pypdf import PdfWriter

from attachment_manager.api import (
	boot,
	get_user_state,
	rename_attachment,
	save_pdf,
	set_private,
	toggle_favorite,
)


def make_pdf(pages=1):
	"""Valid PDF bytes: Frappe parses PDFs on save, and page count varies the content hash."""
	w = PdfWriter()
	for _ in range(pages):
		w.add_blank_page(100, 100)
	out = io.BytesIO()
	w.write(out)
	return out.getvalue()


PDF, EDITED = make_pdf(1), make_pdf(2)


class TestSavePdf(IntegrationTestCase):
	def setUp(self):
		self.todo = frappe.get_doc({"doctype": "ToDo", "description": "am save_pdf test"}).insert()
		self.file = self._attach("invoice.pdf", PDF)

	def _attach(self, name, content, doctype="ToDo", docname=None):
		return frappe.get_doc(
			{
				"doctype": "File",
				"file_name": name,
				"content": content,
				"is_private": 1,
				"attached_to_doctype": doctype,
				"attached_to_name": docname or self.todo.name,
			}
		).insert()

	def test_copy_keeps_original(self):
		new = save_pdf(self.file.name, "copy", EDITED)
		self.assertTrue(frappe.db.exists("File", self.file.name))
		self.assertEqual(new.file_name, "invoice (edited).pdf")
		self.assertEqual(new.attached_to_name, self.todo.name)
		self.assertEqual(new.is_private, 1)

	def test_second_copy_keeps_clean_name(self):
		save_pdf(self.file.name, "copy", EDITED)
		# Same target path, bytes no other test uses (a hash match would dedupe instead of writing): save_file suffixes file_name.
		new = save_pdf(self.file.name, "copy", make_pdf(7))
		self.assertEqual(new.file_name, "invoice (edited).pdf")

	def test_replace_removes_old_file_doc(self):
		new = save_pdf(self.file.name, "replace", EDITED)
		self.assertFalse(frappe.db.exists("File", self.file.name))
		self.assertEqual(new.file_name, "invoice.pdf")
		self.assertEqual(new.get_content(), EDITED)

	def test_replace_keeps_bytes_shared_with_another_file(self):
		other_todo = frappe.get_doc({"doctype": "ToDo", "description": "am share"}).insert()
		other = self._attach("invoice.pdf", PDF, docname=other_todo.name)
		self.assertEqual(other.file_url, self.file.file_url)  # same content hash -> same bytes on disk
		save_pdf(self.file.name, "replace", EDITED)
		self.assertTrue(frappe.get_doc("File", other.name).exists_on_disk())

	def test_replace_refused_when_set_in_attach_field(self):
		user = frappe.get_doc(
			{"doctype": "User", "email": "am-attach@example.com", "first_name": "AM"}
		).insert()
		f = self._attach("avatar.pdf", make_pdf(3), doctype="User", docname=user.name)
		frappe.db.set_value("User", user.name, "user_image", f.file_url)
		with self.assertRaises(frappe.ValidationError):
			save_pdf(f.name, "replace", EDITED)

	def test_needs_write_on_parent(self):
		frappe.set_user("Guest")
		try:
			with self.assertRaises(frappe.PermissionError):
				save_pdf(self.file.name, "copy", EDITED)
		finally:
			frappe.set_user("Administrator")

	def test_rejects_non_pdf(self):
		txt = self._attach("notes.txt", b"hello")
		with self.assertRaises(frappe.ValidationError):
			save_pdf(txt.name, "copy", PDF)


class TestWriteApis(IntegrationTestCase):
	def setUp(self):
		self.todo = frappe.get_doc({"doctype": "ToDo", "description": "am write api test"}).insert()
		self.file = frappe.get_doc(
			{
				"doctype": "File",
				"file_name": "am_test_privacy_fixture.pdf",
				"content": make_pdf(11),
				"is_private": 0,
				"attached_to_doctype": "ToDo",
				"attached_to_name": self.todo.name,
			}
		).insert()

	def test_rename_keeps_extension(self):
		self.assertEqual(rename_attachment(self.file.name, "  Q3 summary "), "Q3 summary.pdf")
		doc = frappe.get_doc("File", self.file.name)
		self.assertEqual(doc.file_name, "Q3 summary.pdf")
		self.assertEqual(doc.file_url, self.file.file_url)

	def test_rename_accepts_own_extension(self):
		self.assertEqual(rename_attachment(self.file.name, "final.PDF"), "final.PDF")

	def test_rename_rejects_empty(self):
		with self.assertRaises(frappe.ValidationError):
			rename_attachment(self.file.name, "   ")

	def test_rename_needs_write(self):
		frappe.set_user("Guest")
		try:
			with self.assertRaises(frappe.PermissionError):
				rename_attachment(self.file.name, "x")
		finally:
			frappe.set_user("Administrator")

	def test_set_private_moves_file(self):
		set_private(frappe.as_json([self.file.name]), 1)
		doc = frappe.get_doc("File", self.file.name)
		self.assertTrue(doc.file_url.startswith("/private/files/"))
		self.assertTrue(doc.exists_on_disk())
		# core's rollback moves the bytes back to the public path and leaves them there
		frappe.db.rollback()
		public = frappe.get_site_path("public", "files", "am_test_privacy_fixture.pdf")
		if os.path.exists(public) and not frappe.db.exists(
			"File", {"file_url": "/files/am_test_privacy_fixture.pdf"}
		):
			os.remove(public)


class TestUserState(IntegrationTestCase):
	def setUp(self):
		self.todo = frappe.get_doc({"doctype": "ToDo", "description": "am fav test"}).insert()
		self.file = frappe.get_doc(
			{
				"doctype": "File",
				"file_name": "fav.pdf",
				"content": make_pdf(12),
				"is_private": 0,
				"attached_to_doctype": "ToDo",
				"attached_to_name": self.todo.name,
			}
		).insert()

	def test_toggle_favorite(self):
		self.assertEqual(toggle_favorite(self.file.name), 1)
		self.assertEqual(
			get_user_state(frappe.as_json([self.file.name])),
			{self.file.name: {"is_favorite": 1}},
		)
		self.assertEqual(toggle_favorite(self.file.name), 0)
		self.assertEqual(frappe.db.count("Attachment User State", {"file": self.file.name}), 1)

	def test_delete_file_removes_state(self):
		toggle_favorite(self.file.name)
		frappe.delete_doc("File", self.file.name)
		self.assertEqual(frappe.db.count("Attachment User State", {"file": self.file.name}), 0)

	def test_boot_flag(self):
		bootinfo = frappe._dict()
		boot(bootinfo)
		self.assertEqual(bootinfo.attachment_manager["show_native_attachments"], 0)
		self.assertIn("DocType", bootinfo.attachment_manager["excluded_doctypes"])


class TestUserStateIsolation(IntegrationTestCase):
	def setUp(self):
		self.users = [
			frappe.get_doc(
				{
					"doctype": "User",
					"email": f"am-state-{i}@example.com",
					"first_name": f"AM{i}",
					"user_type": "System User",
					"send_welcome_email": 0,
					# a desk-access role makes them System Users, which grants the automatic Desk User role
					"roles": [{"role": "Report Manager"}],
				}
			).insert()
			for i in "ab"
		]
		for u in self.users:
			self.addCleanup(frappe.delete_doc, "User", u.name, force=True)
		todo = frappe.get_doc({"doctype": "ToDo", "description": "am iso test"}).insert()
		self.file = frappe.get_doc(
			{
				"doctype": "File",
				"file_name": "iso.pdf",
				"content": make_pdf(14),
				"is_private": 0,
				"attached_to_doctype": "ToDo",
				"attached_to_name": todo.name,
			}
		).insert()

	def test_cannot_set_state_for_another_user(self):
		a, b = (u.name for u in self.users)
		frappe.set_user(a)
		try:
			with self.assertRaises(frappe.PermissionError):
				frappe.get_doc(
					{
						"doctype": "Attachment User State",
						"user": b,
						"file": self.file.name,
					}
				).insert()
		finally:
			frappe.set_user("Administrator")

	def test_states_are_per_user(self):
		ids = frappe.as_json([self.file.name])

		def as_user(user, fn, *args):
			frappe.set_user(user)
			try:
				return fn(*args)
			finally:
				frappe.set_user("Administrator")

		a, b = (u.name for u in self.users)
		self.assertEqual(as_user(a, toggle_favorite, self.file.name), 1)
		self.assertEqual(as_user(a, get_user_state, ids), {self.file.name: {"is_favorite": 1}})
		self.assertEqual(as_user(b, get_user_state, ids), {})
		self.assertEqual(as_user(b, toggle_favorite, self.file.name), 1)
		self.assertEqual(frappe.db.count("Attachment User State", {"file": self.file.name}), 2)
