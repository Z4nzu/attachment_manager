import * as React from "react";
import ExcelEngine from "../engines/excel_engine.js";
import DocxEngine from "../engines/docx_engine.js";
import Loader from "./Loader.jsx";
import ErrorPanel from "./ErrorPanel.jsx";

const ENGINES = { excel: ExcelEngine, docx: DocxEngine };
const LABEL = { excel: "spreadsheet", docx: "document" };

// Wraps a container-based rendering engine (excel/docx) with React loading
// and error states. The engine builds its own DOM inside the ref node.
export default function EngineView({ kind, fileUrl, zoom = 1, onDownload }) {
	const hostRef = React.useRef(null);
	const engineRef = React.useRef(null);
	const [status, setStatus] = React.useState("loading");
	const [error, setError] = React.useState(null);

	React.useEffect(() => {
		let engine = null;
		let cancelled = false;
		setStatus("loading");
		setError(null);

		const Engine = ENGINES[kind];
		// hostRef points at the inner render node (created below).
		engine = new Engine({ container: hostRef.current, fileUrl });
		engineRef.current = engine;
		engine
			.init()
			.then(() => {
				if (!cancelled) setStatus("ready");
			})
			.catch((err) => {
				if (cancelled) return;
				console.error(`[attachment-preview] ${kind} render failed`, err);
				setError(err);
				setStatus("error");
			});

		return () => {
			cancelled = true;
			try {
				engine?.destroy();
			} catch (e) {
				/* ignore */
			}
		};
	}, [kind, fileUrl]);

	React.useEffect(() => {
		if (status === "ready") engineRef.current?.setZoom?.(zoom);
	}, [zoom, status]);

	return (
		<div className="flex size-full flex-col">
			{status === "loading" && <Loader label={__("Loading {0}…", [LABEL[kind]])} />}
			{status === "error" && (
				<ErrorPanel
					message={error?.message || `Failed to load ${LABEL[kind]}`}
					onDownload={onDownload}
				/>
			)}
			{/* Hide while loading/erroring. When ready, clear the inline display so each
			    engine's own class (.am-pv-excel/.am-pv-docx = flex column)
			    governs layout — an inline display:block here collapses their flex
			    viewports (e.g. canvas-datagrid renders into a 0-height container). */}
			<div
				ref={hostRef}
				className="am-pv-engine-host"
				style={{ display: status === "ready" ? "" : "none" }}
			/>
		</div>
	);
}
