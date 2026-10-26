import pdfjsLib from "./lib/pdfjs.js";
import {
	EventBus,
	PDFLinkService,
	PDFFindController,
	PDFViewer,
} from "pdfjs-dist/web/pdf_viewer.mjs";
import css from "pdfjs-dist/web/pdf_viewer.css?inline";

// Runs inside the preview's same-origin iframe: pdf.js's editor reads document.activeElement and
// document.getSelection(), which can't see into the preview's shadow root. The parent drives this via amPdf.open().
const style = document.createElement("style");
style.textContent = css;
document.head.append(style);

// The highlight editor throws without a named palette ("name=#HEX,…").
const HIGHLIGHT_COLORS = "yellow=#FFFF98,green=#53FFBC,blue=#80EBFF,pink=#FFCBE6,red=#FF4F5F";

function open(url, h) {
	const container = document.getElementById("viewer");
	const eventBus = new EventBus();
	const linkService = new PDFLinkService({ eventBus });
	const findController = new PDFFindController({ eventBus, linkService });
	const viewer = new PDFViewer({
		container,
		eventBus,
		linkService,
		findController,
		annotationEditorMode: pdfjsLib.AnnotationEditorType.NONE,
		annotationEditorHighlightColors: HIGHLIGHT_COLORS,
	});
	linkService.setViewer(viewer);
	let doc = null,
		base = 1,
		zoom = 1;
	// base = the page-width scale, so zoom 1 stays "fit"; re-fit and re-apply the zoom whenever it changes.
	const fit = () => {
		viewer.currentScaleValue = "page-width";
		base = viewer.currentScale;
		if (zoom !== 1) viewer.currentScale = base * zoom;
	};
	eventBus.on("pagesinit", () => {
		fit();
		h.onReady(doc.numPages);
	});
	let width = 0;
	new ResizeObserver(() => {
		if (container.offsetWidth === width) return; // offsetWidth includes the scrollbar, so toggling it can't loop
		width = container.offsetWidth;
		if (viewer.pagesCount) fit();
	}).observe(container);
	eventBus.on("pagechanging", (e) => h.onPage(e.pageNumber));

	// Keys and ctrl+wheel never leave the iframe; hand the ones the shell owns back to it.
	window.addEventListener("keydown", (e) => {
		const mod = e.ctrlKey || e.metaKey;
		if (mod && ["=", "+", "-", "0", "f"].includes(e.key)) {
			e.preventDefault();
			h.onKey(e.key);
		} else if (e.key === "Escape" && !e.defaultPrevented) h.onKey("Escape");
	});
	window.addEventListener(
		"wheel",
		(e) => {
			if (!(e.ctrlKey || e.metaKey)) return;
			e.preventDefault();
			h.onWheelZoom(-Math.sign(e.deltaY));
		},
		{ passive: false }
	);

	const task = pdfjsLib.getDocument({ url });
	task.promise.then((d) => {
		doc = d;
		viewer.setDocument(d);
		linkService.setDocument(d);
		d.annotationStorage.onSetModified = () => h.onDirty(true);
		d.annotationStorage.onResetModified = () => h.onDirty(false);
	}, h.onError);

	return {
		setZoom: (z) => {
			zoom = z;
			if (viewer.pagesCount) viewer.currentScale = base * z;
		},
		goTo: (n) => {
			viewer.currentPageNumber = n;
		},
		find: (query, previous) =>
			eventBus.dispatch("find", {
				source: null,
				type: "again",
				query,
				caseSensitive: false,
				entireWord: false,
				highlightAll: true,
				findPrevious: previous,
				matchDiacritics: false,
			}),
		setMode: (key) => {
			viewer.annotationEditorMode = { mode: pdfjsLib.AnnotationEditorType[key] };
			// Stamp mode alone creates nothing (clicks on the page are ignored); this event makes the editor and opens its file chooser.
			if (key === "STAMP")
				eventBus.on(
					"annotationeditormodechanged",
					(e) =>
						e.mode === pdfjsLib.AnnotationEditorType.STAMP &&
						eventBus.dispatch("switchannotationeditorparams", {
							source: null,
							type: pdfjsLib.AnnotationEditorParamsType.CREATE,
						}),
					{ once: true }
				);
		},
		save: async () => {
			// Ink stays in an open drawing session until the mode changes; leave edit mode so it's in the saved bytes.
			if (viewer.annotationEditorMode > 0) {
				const done = new Promise((r) =>
					eventBus.on("annotationeditormodechanged", r, { once: true })
				);
				viewer.annotationEditorMode = { mode: pdfjsLib.AnnotationEditorType.NONE };
				await done;
			}
			return doc.saveDocument();
		},
		destroy: () => {
			viewer.setDocument(null);
			task.destroy();
		},
	};
}

window.amPdf = { open };
