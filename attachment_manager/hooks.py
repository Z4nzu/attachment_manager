app_name = "attachment_manager"
app_title = "Attachment Manager"
app_publisher = "Hardik Zinzuvadiya"
app_description = "Attachment Manager"
app_email = "hardiktech7@gmail.com"
app_license = "agpl-3.0"
required_apps = ["frappe"]
app_logo_url = "/assets/attachment_manager/images/logo.svg"

add_to_apps_screen = [
	{
		"name": app_name,
		"logo": app_logo_url,
		"title": app_title,
		"route": "/desk/attachment-manager-settings",
		"has_permission": "attachment_manager.api.has_app_permission",
	}
]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
app_include_js = ["attachment_manager.bundle.js"]

# include js, css files in header of web template
# web_include_css = "/assets/attachment_manager/css/attachment_manager.css"
# web_include_js = "/assets/attachment_manager/js/attachment_manager.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "attachment_manager/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "attachment_manager/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "attachment_manager.utils.jinja_methods",
# 	"filters": "attachment_manager.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "attachment_manager.install.before_install"
# after_install = "attachment_manager.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "attachment_manager.uninstall.before_uninstall"
# after_uninstall = "attachment_manager.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "attachment_manager.utils.before_app_install"
# after_app_install = "attachment_manager.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "attachment_manager.utils.before_app_uninstall"
# after_app_uninstall = "attachment_manager.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "attachment_manager.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"attachment_manager.tasks.all"
# 	],
# 	"daily": [
# 		"attachment_manager.tasks.daily"
# 	],
# 	"hourly": [
# 		"attachment_manager.tasks.hourly"
# 	],
# 	"weekly": [
# 		"attachment_manager.tasks.weekly"
# 	],
# 	"monthly": [
# 		"attachment_manager.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "attachment_manager.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "attachment_manager.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "attachment_manager.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["attachment_manager.utils.before_request"]
# after_request = ["attachment_manager.utils.after_request"]

# Job Events
# ----------
# before_job = ["attachment_manager.utils.before_job"]
# after_job = ["attachment_manager.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"attachment_manager.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

extend_bootinfo = ["attachment_manager.api.boot"]
doc_events = {
	"File": {"on_trash": "attachment_manager.api.delete_user_state"},
	"*": {
		"validate": "attachment_manager.rules.validate",
		"before_submit": "attachment_manager.rules.before_submit",
	},
}
extend_doctype_class = {"File": ["attachment_manager.rules.FileLock"]}
after_install = "attachment_manager.install.after_install"
after_migrate = "attachment_manager.install.create_fields"
before_uninstall = "attachment_manager.install.before_uninstall"
# Favorite rows link to File; never let them block deleting the file.
ignore_links_on_delete = ["Attachment User State"]
