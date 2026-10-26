import * as React from "react";
import { FileQuestion, Download, SquarePen } from "lucide-react";
import { Button } from "../../ui/button.jsx";

// Shown for formats with no inline renderer (presentations, archives, fonts, unknown).
export default function UnsupportedView({ fileName, message, onDownload, onlyOfficeUrl }) {
	return (
		<div className="m-auto flex max-w-sm flex-col items-center gap-3 p-6 text-center">
			<FileQuestion className="size-8 text-muted-foreground" />
			<p className="font-medium">{message || __("Preview not available")}</p>
			<p className="break-all text-sm text-muted-foreground">{fileName}</p>
			<div className="flex gap-2">
				{onDownload && (
					<Button onClick={onDownload}>
						<Download /> {__("Download")}
					</Button>
				)}
				{onlyOfficeUrl && (
					<Button variant="outline" asChild>
						<a href={onlyOfficeUrl} target="_blank" rel="noopener noreferrer">
							<SquarePen /> {__("Open in OnlyOffice")}
						</a>
					</Button>
				)}
			</div>
		</div>
	);
}
