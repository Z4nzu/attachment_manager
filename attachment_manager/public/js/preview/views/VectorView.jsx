import * as React from "react";
import Loader from "./Loader.jsx";
import ErrorPanel from "./ErrorPanel.jsx";

// SVG is rendered via <img>, NOT injected as markup. An <img>-loaded SVG runs in a
// passive context (no script execution), which closes the previous SVG-injection XSS hole.
export default function VectorView({ fileUrl, fileName, onDownload }) {
	const [status, setStatus] = React.useState("loading");
	React.useEffect(() => {
		setStatus("loading");
	}, [fileUrl]);

	return (
		<div className="size-full grid place-items-center p-6">
			{status === "loading" && <Loader label={__("Loading vector…")} />}
			{status === "error" && (
				<ErrorPanel
					message={__("Could not load this vector image.")}
					onDownload={onDownload}
				/>
			)}
			<img
				src={fileUrl}
				alt={fileName}
				className="max-h-full max-w-full"
				style={{ display: status === "ready" ? "block" : "none" }}
				onLoad={() => setStatus("ready")}
				onError={() => setStatus("error")}
			/>
		</div>
	);
}
