import * as React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import css from "../styles/am.css?inline";
import { createShadowMount } from "../lib/shadow.js";
import { PortalContext } from "../ui/portal.js";
import { AttachmentPanel } from "./AttachmentPanel.jsx";

// One root per footer host; footer.js calls render() on every form refresh.
function mount(host, props) {
	// Radix dialogs close on Esc in the capture phase; keep it from desk's handle_escape_key (ui/keyboard.js), which blurs focus.
	host.addEventListener("keydown", (e) => e.key === "Escape" && e.stopPropagation());
	const { app, portal } = createShadowMount(host, css);
	const root = createRoot(app);
	// Synchronous: frm is reused across docs, so an async render could paint the previous doc's files for a frame.
	const render = (p) =>
		flushSync(() =>
			root.render(
				<PortalContext.Provider value={portal}>
					<AttachmentPanel {...p} />
				</PortalContext.Provider>
			)
		);
	render(props);
	return { render };
}

window.frappe.attachment_manager = window.frappe.attachment_manager || {};
window.frappe.attachment_manager.panel = { mount };
