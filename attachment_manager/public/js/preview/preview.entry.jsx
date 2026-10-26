import * as React from "react";
import { createRoot } from "react-dom/client";
import PreviewDialog from "./PreviewDialog.jsx";
import css from "../styles/am.css?inline";
import { createShadowMount } from "../lib/shadow.js";
import { PortalContext } from "../ui/portal.js";

// Single React root for the whole desk session. The vanilla footer calls
// frappe.attachment_manager.preview.open(...) — the root is created lazily on first
// use and reused thereafter. This is the fix for the per-form-refresh dialog leak.

let root = null;
let mountEl = null;
let apiHandle = null; // { open } registered by PreviewHost once mounted

function PreviewHost({ register }) {
	const [state, setState] = React.useState({ open: false, attachments: [], index: 0, ctx: {} });

	React.useEffect(() => {
		register({
			open: (attachments, index, ctx) =>
				setState({
					open: true,
					attachments: attachments || [],
					index: index || 0,
					ctx: ctx || {},
				}),
		});
	}, [register]);

	const onSaved = (file, mode) => {
		state.ctx.onSaved?.();
		setState((s) => {
			const list = [...s.attachments];
			if (mode === "replace") list[s.index] = file;
			else list.splice(s.index + 1, 0, file);
			return { ...s, attachments: list, index: mode === "replace" ? s.index : s.index + 1 };
		});
	};

	return (
		<PreviewDialog
			open={state.open}
			attachments={state.attachments}
			index={state.index}
			canDelete={!!state.ctx.canDelete}
			onSaved={onSaved}
			onClose={() => setState((s) => ({ ...s, open: false }))}
			onIndex={(i) => setState((s) => ({ ...s, index: i }))}
		/>
	);
}

function ensureMounted() {
	if (root) return;
	mountEl = document.createElement("div");
	mountEl.id = "am-preview-root";
	document.body.appendChild(mountEl);
	// Radix closes on Esc in the capture phase; keep it from desk's handle_escape_key (ui/keyboard.js), which blurs focus.
	mountEl.addEventListener("keydown", (e) => e.key === "Escape" && e.stopPropagation());
	// Radix's scroll lock checks wheel/touch targets on document, where the shadow retargets them to this host,
	// so it cancels every scroll inside the dialog. Body stays locked; only our own scrolls get through.
	for (const type of ["wheel", "touchmove"])
		mountEl.addEventListener(type, (e) => e.stopPropagation(), { passive: true });
	const { app, portal } = createShadowMount(mountEl, css);
	root = createRoot(app);
	root.render(
		<PortalContext.Provider value={portal}>
			<PreviewHost
				register={(h) => {
					apiHandle = h;
				}}
			/>
		</PortalContext.Provider>
	);
}

function open(attachments, index = 0, ctx) {
	ensureMounted();
	// PreviewHost may register its handle on the next tick; retry until ready.
	const attempt = () => {
		if (apiHandle) apiHandle.open(attachments, index, ctx);
		else window.requestAnimationFrame(attempt);
	};
	attempt();
}

window.frappe = window.frappe || {};
window.frappe.attachment_manager = window.frappe.attachment_manager || {};
window.frappe.attachment_manager.preview = { open };
