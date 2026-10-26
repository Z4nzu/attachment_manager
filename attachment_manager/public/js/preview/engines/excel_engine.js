import * as XLSX from "xlsx";
import canvasDatagrid from "canvas-datagrid";

// Renders a workbook with sheet tabs + a virtualized canvas grid inside `container`.
export default class ExcelEngine {
	constructor({ container, fileUrl }) {
		this.container = container;
		this.fileUrl = fileUrl;
		this.sheetTabs = null;
		this.viewportContainer = null;
		this.workbook = null;
		this.grid = null;
		this.resizeObserver = null;
	}

	async init() {
		this.container.classList.add("am-pv-excel");
		await this.loadWorkbook();
		this.buildTabs();
		if (this.workbook?.SheetNames?.length) {
			this.renderSheet(this.workbook.SheetNames[0]);
		}
	}

	async loadWorkbook() {
		const response = await fetch(this.fileUrl);
		if (!response.ok) throw new Error(`Failed to load file (HTTP ${response.status})`);
		const arrayBuffer = await response.arrayBuffer();
		this.workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
	}

	buildTabs() {
		this.sheetTabs = document.createElement("div");
		this.sheetTabs.className = "am-pv-sheet-tabs";

		this.viewportContainer = document.createElement("div");
		this.viewportContainer.className = "am-pv-excel-viewport";

		this.container.innerHTML = "";
		this.container.append(this.sheetTabs, this.viewportContainer);

		if (!this.workbook?.SheetNames) return;

		this.workbook.SheetNames.forEach((sheetName, index) => {
			const tab = document.createElement("button");
			tab.className = "am-pv-sheet-tab";
			tab.textContent = sheetName;
			tab.addEventListener("click", () => {
				this.sheetTabs
					.querySelectorAll(".am-pv-sheet-tab")
					.forEach((t) => t.classList.remove("active"));
				tab.classList.add("active");
				this.renderSheet(sheetName);
			});
			if (index === 0) tab.classList.add("active");
			this.sheetTabs.appendChild(tab);
		});
	}

	renderSheet(sheetName) {
		const sheet = this.workbook.Sheets[sheetName];
		const data = XLSX.utils.sheet_to_json(sheet, { raw: true, defval: null });
		const grid = canvasDatagrid({ data, editable: false });
		grid.classList.add("am-pv-excel-grid");
		grid.style.width = "100%";
		grid.style.height = "100%";
		grid.style.display = "block";
		this.viewportContainer.innerHTML = "";
		this.viewportContainer.appendChild(grid);
		this.grid = grid;

		// canvas-datagrid measures its container at creation; inside a flex column the
		// viewport has no height until layout settles, so the canvas is born 0×0 and
		// never repaints. Force a resize after layout, and keep it in sync on resize.
		requestAnimationFrame(() => {
			try {
				grid.resize?.(true);
			} catch (e) {
				/* ignore */
			}
		});
		this.observeResize();
	}

	observeResize() {
		if (
			this.resizeObserver ||
			typeof ResizeObserver === "undefined" ||
			!this.viewportContainer
		)
			return;
		this.resizeObserver = new ResizeObserver(() => {
			try {
				this.grid?.resize?.(true);
			} catch (e) {
				/* ignore */
			}
		});
		this.resizeObserver.observe(this.viewportContainer);
	}

	destroy() {
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}
		this.grid = null;
		this.sheetTabs = null;
		this.viewportContainer = null;
		this.workbook = null;
		if (this.container) this.container.innerHTML = "";
	}
}
