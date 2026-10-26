import * as React from "react";
import { TriangleAlert, Download } from "lucide-react";
import { Button } from "../../ui/button.jsx";

export default function ErrorPanel({ message, onDownload }) {
	return (
		<div className="m-auto flex max-w-sm flex-col items-center gap-3 p-6 text-center">
			<TriangleAlert className="size-8 text-destructive" />
			<p className="text-sm">
				{message || __("Something went wrong while loading the preview.")}
			</p>
			{onDownload && (
				<Button onClick={onDownload}>
					<Download /> {__("Download file")}
				</Button>
			)}
		</div>
	);
}
