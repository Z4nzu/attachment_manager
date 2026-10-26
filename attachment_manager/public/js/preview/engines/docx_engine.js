import * as docx from "docx-preview";

// Renders a .docx into `container` using docx-preview.
export default class DocxEngine {
	constructor({ container, fileUrl }) {
		this.container = container;
		this.fileUrl = fileUrl;
	}

	async init() {
		this.container.classList.add("am-pv-docx");
		const response = await fetch(this.fileUrl);
		if (!response.ok) throw new Error(`Failed to load document (HTTP ${response.status})`);
		const arrayBuffer = await response.arrayBuffer();
		await docx.renderAsync(arrayBuffer, this.container, null, {
			className: "docx-renderer",
			inWrapper: true,
			ignoreLastRenderedPageBreak: true,
			ignoreWidth: false,
			ignoreFonts: false,
			renderHeaders: true,
			renderFooters: true,
			renderFootnotes: true,
			useBase64URL: true,
			experimental: true,
		});
	}

	setZoom(z) {
		this.container.style.zoom = z;
	}

	destroy() {
		if (this.container) this.container.innerHTML = "";
	}
}
