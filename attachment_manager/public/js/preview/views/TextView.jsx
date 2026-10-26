import * as React from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import Loader from "./Loader.jsx";
import ErrorPanel from "./ErrorPanel.jsx";

// Read-only text / code preview via CodeMirror 6. Theme follows the desk (light/dark).
export default function TextView({ fileUrl, zoom = 1, onDownload }) {
	const hostRef = React.useRef(null);
	const [status, setStatus] = React.useState("loading");
	const [error, setError] = React.useState(null);

	React.useEffect(() => {
		let view = null;
		let cancelled = false;
		setStatus("loading");
		setError(null);

		(async () => {
			try {
				const response = await fetch(fileUrl);
				if (!response.ok) throw new Error(`Failed to load file (HTTP ${response.status})`);
				const text = await response.text();
				if (cancelled) return;

				const extensions = [
					basicSetup,
					EditorState.readOnly.of(true),
					EditorView.lineWrapping,
				];
				if (document.documentElement.dataset.theme === "dark") extensions.push(oneDark);

				view = new EditorView({
					state: EditorState.create({ doc: text, extensions }),
					parent: hostRef.current,
				});
				setStatus("ready");
			} catch (err) {
				if (cancelled) return;
				console.error("[attachment-preview] text render failed", err);
				setError(err);
				setStatus("error");
			}
		})();

		return () => {
			cancelled = true;
			try {
				view?.destroy();
			} catch (e) {
				/* ignore */
			}
		};
	}, [fileUrl]);

	return (
		<div className="size-full">
			{status === "loading" && <Loader label={__("Loading file…")} />}
			{status === "error" && (
				<ErrorPanel
					message={error?.message || __("Could not load this file.")}
					onDownload={onDownload}
				/>
			)}
			<div
				ref={hostRef}
				className="size-full overflow-auto"
				style={{ display: status === "ready" ? "block" : "none", fontSize: 13 * zoom }}
			/>
		</div>
	);
}
