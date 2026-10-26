import * as React from "react";
import { Dialog } from "radix-ui";
import {
	X,
	Download,
	ChevronLeft,
	ChevronRight,
	ZoomIn,
	ZoomOut,
	Maximize,
	SquarePen,
	Lock,
} from "lucide-react";
import { stepZoom } from "../lib/zoom.js";
import { getFileType } from "../lib/file_utils.js";
import { onlyOfficeUrl } from "../lib/attachments.js";
import { usePortal } from "../ui/portal.js";
import { ConfirmDialog } from "../ui/alert-dialog.jsx";
import { IconButton } from "../ui/icon-button.jsx";
import { TooltipProvider } from "../ui/tooltip.jsx";
import { useShadowFocusTrap } from "../ui/use-shadow-focus-trap.js";
import { fileVisual } from "../panel/FileIcon.jsx";
import { downloadFile } from "../panel/actions.js";
import ImageView from "./views/ImageView.jsx";
import EngineView from "./views/EngineView.jsx";
import PdfView from "./views/PdfView.jsx";
import TextView from "./views/TextView.jsx";
import MediaView from "./views/MediaView.jsx";
import VectorView from "./views/VectorView.jsx";
import UnsupportedView from "./views/UnsupportedView.jsx";

const ZOOMABLE = new Set(["image", "pdf", "document", "text", "script"]);

export default function PreviewDialog({
	open,
	attachments,
	index,
	onClose,
	onIndex,
	canDelete,
	onSaved,
}) {
	const [zoom, setZoom] = React.useState(1);
	const portal = usePortal();
	const trap = useShadowFocusTrap();
	const attachment = attachments[index] || null;
	const fileName = attachment?.file_name || "";
	const fileUrl = attachment?.file_url || "";
	const fileType = fileName ? getFileType(fileName) : "unknown";
	const zoomable = ZOOMABLE.has(fileType);
	React.useEffect(() => setZoom(1), [fileUrl]);
	const [dirty, setDirty] = React.useState(false);
	const [pending, setPending] = React.useState(null); // action waiting on "Discard"
	React.useEffect(() => setDirty(false), [fileUrl]);
	const guard = (fn) => () => dirty ? setPending(() => fn) : fn();

	const [content, setContent] = React.useState(null);
	React.useEffect(() => {
		if (!content) return;
		const onWheel = (e) => {
			if (!(e.ctrlKey || e.metaKey) || !zoomable || e.defaultPrevented) return; // ImageView already handled it (zooms around the cursor)
			e.preventDefault(); // trackpad pinch arrives as ctrl+wheel; stop browser zoom
			setZoom((z) => stepZoom(z, -Math.sign(e.deltaY)));
		};
		content.addEventListener("wheel", onWheel, { passive: false });
		return () => content.removeEventListener("wheel", onWheel);
	}, [content, zoomable]);

	const goPrev = guard(() => index > 0 && onIndex(index - 1));
	const goNext = guard(() => index < attachments.length - 1 && onIndex(index + 1));
	const onKeyDown = (e) => {
		trap.onKeyDown(e);
		if ((e.ctrlKey || e.metaKey) && zoomable && ["=", "+", "-", "0"].includes(e.key)) {
			e.preventDefault();
			setZoom((z) => (e.key === "0" ? 1 : stepZoom(z, e.key === "-" ? -1 : 1)));
			return;
		}
		if ((e.ctrlKey || e.metaKey) && e.key === "f" && fileType === "pdf") {
			e.preventDefault();
			content?.querySelector("[data-pdf-find]")?.focus();
			return;
		}
		if (
			e.defaultPrevented ||
			e.target.closest?.("input, textarea, [contenteditable], video, audio")
		)
			return;
		if (e.key === "ArrowLeft") goPrev();
		if (e.key === "ArrowRight") goNext();
	};
	if (!attachment) return null;

	const onDownload = () => downloadFile(fileUrl, fileName);
	const ooUrl = onlyOfficeUrl(attachment);
	const { Icon, badge } = fileVisual(fileName);
	const prevButton = (props) => (
		<IconButton label={__("Previous")} onClick={goPrev} {...props}>
			<ChevronLeft />
		</IconButton>
	);
	const nextButton = (props) => (
		<IconButton label={__("Next")} onClick={goNext} {...props}>
			<ChevronRight />
		</IconButton>
	);

	const renderBody = () => {
		switch (fileType) {
			case "image":
				return (
					<ImageView
						key={fileUrl}
						fileUrl={fileUrl}
						fileName={fileName}
						zoom={zoom}
						onZoom={setZoom}
						onDownload={onDownload}
					/>
				);
			case "pdf":
				return (
					<PdfView
						key={fileUrl}
						fileUrl={fileUrl}
						fileId={attachment.name}
						zoom={zoom}
						onZoom={setZoom}
						onEscape={guard(onClose)}
						onDownload={onDownload}
						canReplace={canDelete}
						onDirty={setDirty}
						onSaved={onSaved}
					/>
				);
			case "spreadsheet":
				return (
					<EngineView
						key={fileUrl}
						kind="excel"
						fileUrl={fileUrl}
						onDownload={onDownload}
					/>
				);
			case "document":
				return (
					<EngineView
						key={fileUrl}
						kind="docx"
						fileUrl={fileUrl}
						zoom={zoom}
						onDownload={onDownload}
					/>
				);
			case "text":
			case "script":
				return (
					<TextView
						key={fileUrl}
						fileUrl={fileUrl}
						zoom={zoom}
						onDownload={onDownload}
					/>
				);
			case "audio":
				return (
					<MediaView key={fileUrl} kind="audio" fileUrl={fileUrl} fileName={fileName} />
				);
			case "video":
				return (
					<MediaView key={fileUrl} kind="video" fileUrl={fileUrl} fileName={fileName} />
				);
			case "vector":
				return (
					<VectorView
						key={fileUrl}
						fileUrl={fileUrl}
						fileName={fileName}
						onDownload={onDownload}
					/>
				);
			case "presentation":
				return (
					<UnsupportedView
						key={fileUrl}
						fileName={fileName}
						message={__("Presentation preview isn't available here.")}
						onDownload={onDownload}
						onlyOfficeUrl={ooUrl}
					/>
				);
			default:
				return (
					<UnsupportedView
						key={fileUrl}
						fileName={fileName}
						message={__("Preview not available for this file type.")}
						onDownload={onDownload}
						onlyOfficeUrl={ooUrl}
					/>
				);
		}
	};

	return (
		<Dialog.Root open={open} onOpenChange={(o) => !o && guard(onClose)()}>
			<Dialog.Portal container={portal}>
				<Dialog.Overlay className="fixed inset-0 z-overlay bg-black/60" />
				<Dialog.Content
					ref={setContent}
					onKeyDown={onKeyDown}
					aria-describedby={undefined}
					// Focus the content, not the first button: its tooltip would open and eat the first Esc.
					onOpenAutoFocus={(e) => {
						trap.onOpenAutoFocus();
						e.preventDefault();
						e.target.focus();
					}}
					onCloseAutoFocus={trap.onCloseAutoFocus}
					onBlur={trap.onBlur}
					className="fixed inset-0 z-overlay flex flex-col bg-background outline-none sm:inset-6 sm:rounded-xl sm:border sm:shadow-2xl"
				>
					<TooltipProvider delayDuration={300}>
						<header className="flex items-center gap-3 border-b px-3 py-2 sm:px-4">
							<span
								className={`grid size-8 shrink-0 place-items-center rounded-md text-white ${badge}`}
							>
								<Icon className="size-4" aria-hidden />
							</span>
							<div className="min-w-0 flex-1">
								<Dialog.Title className="flex items-center gap-1.5 truncate text-sm font-semibold">
									{fileName}
									{attachment.is_private ? (
										<Lock
											className="size-3.5 shrink-0 text-muted-foreground"
											aria-label={__("Private")}
										/>
									) : null}
								</Dialog.Title>
								<p className="text-xs text-muted-foreground">
									{index + 1} / {attachments.length}
								</p>
							</div>
							{attachments.length > 1 && (
								<div className="flex sm:hidden">
									{prevButton({ variant: "ghost", disabled: index === 0 })}
									{nextButton({
										variant: "ghost",
										disabled: index === attachments.length - 1,
									})}
								</div>
							)}
							{ooUrl && (
								<IconButton
									label={__("Open in OnlyOffice")}
									variant="ghost"
									onClick={() => window.open(ooUrl, "_blank", "noopener")}
								>
									<SquarePen />
								</IconButton>
							)}
							<IconButton
								label={__("Download")}
								variant="ghost"
								onClick={onDownload}
							>
								<Download />
							</IconButton>
							<Dialog.Close asChild>
								<IconButton label={__("Close")} variant="ghost">
									<X />
								</IconButton>
							</Dialog.Close>
						</header>
						<div className="relative min-h-0 flex-1 bg-muted/40">
							{/* isolate: viewer z-indexes (docx pages, pdf.js layers) stay below the zoom bar and nav buttons. */}
							<div className="absolute inset-0 isolate flex">{renderBody()}</div>
							{zoomable && (
								<div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border bg-background/95 p-1 shadow-lg">
									<IconButton
										label={__("Zoom out")}
										variant="ghost"
										className="rounded-full"
										onClick={() => setZoom((z) => stepZoom(z, -1))}
									>
										<ZoomOut />
									</IconButton>
									<span className="w-12 text-center text-xs tabular-nums">
										{Math.round(zoom * 100)}%
									</span>
									<IconButton
										label={__("Zoom in")}
										variant="ghost"
										className="rounded-full"
										onClick={() => setZoom((z) => stepZoom(z, 1))}
									>
										<ZoomIn />
									</IconButton>
									<IconButton
										label={__("Fit")}
										variant="ghost"
										className="rounded-full"
										onClick={() => setZoom(1)}
									>
										<Maximize />
									</IconButton>
								</div>
							)}
							{index > 0 &&
								prevButton({
									className:
										"absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full shadow-md sm:inline-flex",
								})}
							{index < attachments.length - 1 &&
								nextButton({
									className:
										"absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full shadow-md sm:inline-flex",
								})}
						</div>
					</TooltipProvider>
					<ConfirmDialog
						open={!!pending}
						onOpenChange={(o) => !o && setPending(null)}
						title={__("Discard annotations?")}
						description={__("Your changes to this PDF haven't been saved.")}
						confirmLabel={__("Discard")}
						onConfirm={() => {
							setDirty(false);
							pending();
							setPending(null);
						}}
					/>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
