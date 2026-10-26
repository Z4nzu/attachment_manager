import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def create_fields():
	create_custom_fields(
		{
			"File": [
				{
					"fieldname": "attachment_type",
					"label": "Attachment Type",
					"fieldtype": "Link",
					"options": "Attachment Type",
					"insert_after": "attached_to_field",
				}
			]
		}
	)


SEED_TYPES = (
	"Quotation",
	"Purchase Order",
	"Invoice",
	"Delivery Note",
	"Contract",
	"Certificate",
	"ID Proof",
	"Drawing",
	"Photo",
	"Other",
)


def after_install():
	create_fields()
	seed_attachment_types()


def seed_attachment_types():
	"""Insert the starting attachment types that don't exist yet."""
	for name in SEED_TYPES:
		if not frappe.db.exists("Attachment Type", name):
			frappe.get_doc({"doctype": "Attachment Type", "attachment_type": name}).insert()


def before_uninstall():
	frappe.delete_doc("Custom Field", "File-attachment_type")
	# Frappe's after_app_uninstall looks the icon up by app_name, not app_title, so it misses ours.
	frappe.delete_doc_if_exists("Desktop Icon", "Attachment Manager")
