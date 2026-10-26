import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Self-contained IIFE bundles, built one per mode (IIFE lib mode allows one entry).
// Served by Frappe at /assets/attachment_manager/dist/react/<mode>.bundle.js.
const ENTRIES = {
	panel: "attachment_manager/public/js/panel/panel.entry.jsx",
	preview: "attachment_manager/public/js/preview/preview.entry.jsx",
	pdf: "attachment_manager/public/js/preview/pdf_frame.entry.js", // loaded inside the PDF preview iframe
};

export default defineConfig(({ mode }) => ({
	plugins: [react(), tailwindcss()],
	resolve: { dedupe: ["@codemirror/state", "@codemirror/view"] }, // yarn leaves a nested copy of each; CM needs one instance
	build: {
		outDir: path.resolve(__dirname, "attachment_manager/public/dist/react"),
		emptyOutDir: false,
		lib: {
			entry: path.resolve(__dirname, ENTRIES[mode]),
			name: `AttachmentManager_${mode}`,
			fileName: () => `${mode}.bundle.js`,
			cssFileName: `${mode}.bundle`,
			formats: ["iife"],
		},
		rollupOptions: { output: { inlineDynamicImports: true } },
		target: "es2022",
		sourcemap: true,
		minify: "esbuild",
	},
	define: { "process.env.NODE_ENV": JSON.stringify("production") },
}));
