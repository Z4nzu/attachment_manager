from attachment_manager.install import seed_attachment_types


def execute():
	"""Seed the starting attachment types once; after_migrate would re-create ones users deleted."""
	seed_attachment_types()
