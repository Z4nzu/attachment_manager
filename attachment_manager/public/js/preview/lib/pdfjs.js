import * as pdfjsLib from "pdfjs-dist";
// The worker is inlined and run from a Blob URL, so the IIFE bundle works from any path.
import workerSrcText from "pdfjs-dist/build/pdf.worker.min.mjs?raw";

globalThis.pdfjsLib = pdfjsLib;
pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(
	new Blob([workerSrcText], { type: "text/javascript" })
);
export default pdfjsLib;
