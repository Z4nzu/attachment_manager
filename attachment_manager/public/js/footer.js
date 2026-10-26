/* global $ */
import { loadBundle } from "./lib/load_bundle.js";

frappe.provide("frappe.ui.form");

// Core re-shows .form-attachments with an inline style on every refresh, so hide it with a class rule instead.
document.head.insertAdjacentHTML(
	"beforeend",
	"<style>.am-hide-native .form-attachments{display:none!important}</style>"
);

frappe.ui.form.CustomFormFooter = class extends frappe.ui.form.Footer {
	refresh() {
		super.refresh();
		this.render_attachment_panel();
	}

	// One shadow host + React root per footer, re-rendered (never recreated) on refresh.
	render_attachment_panel(save_failed = false) {
		// Settings pages (Single DocTypes) and framework doctypes keep core's sidebar list and get no panel; guarded here so the failed-save re-render skips them too.
		const am = frappe.boot.attachment_manager;
		if (this.frm.meta.issingle || am?.excluded_doctypes?.includes(this.frm.doctype)) return;
		this.frm.sidebar?.sidebar?.toggleClass("am-hide-native", !am?.show_native_attachments);
		if (!this.am_host) {
			this.am_host = document.createElement("div");
			this.am_host.className = "am-host";
			this.wrapper.get(0).prepend(this.am_host);
			// Fired by the sidebar on every upload/delete (form/sidebar/attachments.js notify_change).
			$(this.frm.wrapper).on("attachments_change", () => this.render_attachment_panel());
		}
		this.am_version = (this.am_version || 0) + 1;
		this.am_props = { frm: this.frm, version: this.am_version, saveFailed: save_failed };
		if (this.am_panel) return this.am_panel.render(this.am_props);
		if (this.am_loading) return; // the in-flight load mounts with the latest am_props

		this.am_loading = loadBundle("panel")
			.then((panel) => {
				this.am_panel = panel.mount(this.am_host, this.am_props);
			})
			.catch(() => this.render_load_error())
			.finally(() => {
				this.am_loading = null;
			});
	}

	render_load_error() {
		// A failed mount may already have attached the shadow root, which hides light-DOM children.
		const root = this.am_host.shadowRoot || this.am_host;
		root.textContent = "";
		const btn = document.createElement("button");
		btn.className = "btn btn-default btn-sm";
		btn.textContent = __("Couldn't load attachments. Retry");
		btn.onclick = () => this.render_attachment_panel();
		root.append(btn);
	}
};

frappe.ui.form.Footer = frappe.ui.form.CustomFormFooter;

// A failed Save/Submit doesn't refresh the form; re-render the panel so the checklist flags what's missing.
const core_save = frappe.ui.form.save;
frappe.ui.form.save = (frm, action, callback, btn) =>
	core_save(
		frm,
		action,
		(r) => {
			callback(r);
			if (r?.exc) frm.footer?.render_attachment_panel?.(true);
		},
		btn
	);
