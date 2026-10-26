import * as React from "react";
import { Search, Highlighter, Type, PenLine, ImagePlus, Save, ChevronDown } from "lucide-react";
import { serverMessage } from "../../panel/actions.js";
import { bundleUrl } from "../../lib/load_bundle.js";
import { stepZoom } from "../../lib/zoom.js";
import { Button } from "../../ui/button.jsx";
import { IconButton } from "../../ui/icon-button.jsx";
import { Dropdown } from "../../ui/menu.jsx";
import Loader from "./Loader.jsx";
import ErrorPanel from "./ErrorPanel.jsx";

const TOOLS = [
	["HIGHLIGHT", Highlighter, "Highlight"],
	["FREETEXT", Type, "Text"],
	["INK", PenLine, "Draw"],
	["STAMP", ImagePlus, "Image"],
];

const frameDoc =
	() => `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">
<div id="viewer" style="position:absolute;inset:0;overflow:auto"><div class="pdfViewer"></div></div>
<script src="${bundleUrl("pdf")}"></script></body></html>`;

// pdf.js runs in a same-origin iframe (pdf_frame.entry.js); this renders the toolbar and drives it.
// zoom is relative to page width (1 = fit).
export default function PdfView({
	fileUrl,
	fileId,
	zoom,
	onZoom,
	onEscape,
	onDownload,
	canReplace,
	onDirty,
	onSaved,
}) {
	const ctl = React.useRef(null);
	const findRef = React.useRef(null);
	const [status, setStatus] = React.useState("loading");
	const [error, setError] = React.useState(null);
	const [page, setPage] = React.useState({ current: 1, total: 0 });
	const [query, setQuery] = React.useState("");
	const [mode, setMode] = React.useState("NONE");
	const [dirty, setDirty] = React.useState(false);
	const [saving, setSaving] = React.useState(false);
	const [srcDoc] = React.useState(frameDoc); // once: bundleUrl() changes per call in developer mode, which would reload the frame
	// The frame keeps the handlers it was given; route them through a ref so they see current props.
	const latest = React.useRef();
	latest.current = { onZoom, onEscape, onDirty };

	React.useEffect(() => () => ctl.current?.destroy(), []);
	React.useEffect(() => {
		if (status === "ready") ctl.current.setZoom(zoom);
	}, [zoom, status]);

	const onFrameLoad = (e) => {
		// Absolute: the frame's location is about:srcdoc, which can't resolve /files/… URLs.
		ctl.current = e.target.contentWindow.amPdf.open(new URL(fileUrl, location.href).href, {
			onReady: (total) => {
				setPage({ current: 1, total });
				setStatus("ready");
			},
			onPage: (current) => setPage((p) => ({ ...p, current })),
			onDirty: (d) => {
				setDirty(d);
				latest.current.onDirty(d);
			},
			onError: (err) => {
				console.error("[attachment-preview] pdf render failed", err);
				setError(err);
				setStatus("error");
			},
			onWheelZoom: (dir) => latest.current.onZoom((z) => stepZoom(z, dir)),
			onKey: (key) => {
				if (key === "Escape") latest.current.onEscape();
				else if (key === "f") findRef.current?.focus();
				else
					latest.current.onZoom((z) =>
						key === "0" ? 1 : stepZoom(z, key === "-" ? -1 : 1)
					);
			},
		});
	};

	const find = (e) => {
		if (e.key === "Enter") ctl.current?.find(query, e.shiftKey);
	};
	const goTo = (n) => ctl.current?.goTo(Math.min(Math.max(n || 1, 1), page.total));
	const toggle = (key) => {
		const next = mode === key ? "NONE" : key;
		ctl.current.setMode(next);
		setMode(next);
	};
	const save = async (saveMode) => {
		setSaving(true);
		setMode("NONE"); // save() leaves edit mode to commit open ink
		try {
			const body = new FormData();
			body.append(
				"file",
				new Blob([await ctl.current.save()], { type: "application/pdf" }),
				"edited.pdf"
			);
			body.append("file_id", fileId);
			body.append("mode", saveMode);
			const r = await fetch("/api/method/attachment_manager.api.save_edited_pdf", {
				method: "POST",
				body,
				credentials: "same-origin",
				headers: { "X-Frappe-CSRF-Token": frappe.csrf_token },
			});
			const json = await r.json();
			if (!r.ok) throw new Error(serverMessage(json) || __("Could not save the PDF."));
			onDirty(false);
			onSaved(json.message, saveMode);
			frappe.show_alert({ message: __("PDF saved"), indicator: "green" });
		} catch (e) {
			frappe.show_alert({ message: e.message, indicator: "red" });
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="flex size-full flex-col">
			{status === "ready" && (
				<div className="flex items-center gap-2 border-b bg-background px-3 py-1.5 text-xs">
					<input
						type="number"
						min={1}
						max={page.total}
						value={page.current}
						aria-label={__("Page number")}
						onChange={(e) => goTo(+e.target.value)}
						className="h-7 w-14 rounded-md border bg-transparent px-1 text-center"
					/>
					<span className="text-muted-foreground">/ {page.total}</span>
					<div className="flex-1" />
					{TOOLS.map(([key, Icon, label]) => {
						const active = mode === key;
						return (
							<IconButton
								key={key}
								label={__(label)}
								variant={active ? "outline" : "ghost"}
								aria-pressed={active}
								className={active ? "bg-accent" : ""}
								onClick={() => toggle(key)}
							>
								<Icon />
							</IconButton>
						);
					})}
					{dirty &&
						(canReplace ? (
							<div className="flex">
								<Button
									size="sm"
									className="rounded-r-none"
									disabled={saving}
									onClick={() => save("replace")}
								>
									<Save />
									{__("Save")}
								</Button>
								<Dropdown.Root>
									<Dropdown.Trigger asChild>
										<Button
											size="sm"
											className="rounded-l-none border-l border-primary-foreground/30 px-2"
											disabled={saving}
											aria-label={__("More save options")}
										>
											<ChevronDown />
										</Button>
									</Dropdown.Trigger>
									<Dropdown.Content align="end">
										<Dropdown.Item onSelect={() => save("copy")}>
											{__("Save as copy")}
										</Dropdown.Item>
									</Dropdown.Content>
								</Dropdown.Root>
							</div>
						) : (
							<Button
								size="sm"
								variant="outline"
								disabled={saving}
								onClick={() => save("copy")}
							>
								{__("Save as copy")}
							</Button>
						))}
					<label className="flex items-center gap-1 rounded-md border px-2">
						<Search className="size-3.5 text-muted-foreground" aria-hidden />
						<input
							ref={findRef}
							data-pdf-find
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							onKeyDown={find}
							placeholder={__("Find in document")}
							className="h-7 w-44 bg-transparent outline-none"
						/>
					</label>
				</div>
			)}
			{status === "loading" && <Loader label={__("Loading {0}…", ["PDF"])} />}
			{status === "error" && (
				<ErrorPanel
					message={error?.message || __("Failed to load PDF")}
					onDownload={onDownload}
				/>
			)}
			<iframe
				title={__("PDF preview")}
				srcDoc={srcDoc}
				onLoad={onFrameLoad}
				className="min-h-0 w-full flex-1 border-0 bg-transparent"
				style={{ display: status === "error" ? "none" : "" }}
			/>
		</div>
	);
}
