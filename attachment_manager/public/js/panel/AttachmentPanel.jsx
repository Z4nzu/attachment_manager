import * as React from "react";
import { UploadCloud, Lock } from "lucide-react";
import { TooltipProvider } from "../ui/tooltip.jsx";
import { ConfirmDialog } from "../ui/alert-dialog.jsx";
import { FormDialog } from "../ui/form-dialog.jsx";
import { Input } from "../ui/input.jsx";
import { checklist, filterAndSort, linkHost, onlyOfficeUrl } from "../lib/attachments.js";
import { loadBundle } from "../lib/load_bundle.js";
import * as api from "./actions.js";
import { Toolbar } from "./Toolbar.jsx";
import { FileGrid } from "./FileGrid.jsx";
import { FileList } from "./FileList.jsx";
import { Checklist } from "./Checklist.jsx";
import { EmptyState, NoResults, ErrorState, LoadingState } from "./States.jsx";

const PREFS = "am:prefs";
function readPrefs() {
	try {
		return JSON.parse(localStorage.getItem(PREFS)) || {};
	} catch {
		return {};
	}
}
function savePrefs(p) {
	try {
		localStorage.setItem(PREFS, JSON.stringify(p));
	} catch {
		/* storage unavailable */
	}
}

export function AttachmentPanel({ frm, version, saveFailed }) {
	const [files, setFiles] = React.useState(null); // null = loading
	const [failed, setFailed] = React.useState(false);
	const [query, setQuery] = React.useState("");
	const [prefs, setPrefs] = React.useState(() => ({
		view: "grid",
		sort: "date_desc",
		...readPrefs(),
	}));
	const [zipping, setZipping] = React.useState(false);
	const [pendingDelete, setPendingDelete] = React.useState(null);
	const [dragging, setDragging] = React.useState(0);
	const [docname, setDocname] = React.useState(frm.docname);
	const [favoritesOnly, setFavoritesOnly] = React.useState(false);
	const [linkOpen, setLinkOpen] = React.useState(false);
	const [renaming, setRenaming] = React.useState(null); // file being renamed
	const [selected, setSelected] = React.useState(() => new Set());
	const [bulkDelete, setBulkDelete] = React.useState(false);
	const [rules, setRules] = React.useState(null); // get_checklist result: { rows, locked }
	const [typeFilter, setTypeFilter] = React.useState("");
	const latest = React.useRef(0);
	const canWrite = !!frm.perm?.[0]?.write;
	const locked = !!rules?.locked;
	const canEdit = canWrite && !locked;
	const types = rules?.rows.map((r) => r.attachment_type) || [];

	// frm is shared by every doc of this doctype: drop the old doc's list before the new one paints.
	if (docname !== frm.docname) {
		setDocname(frm.docname);
		setFiles(null);
		setRules(null);
		setSelected(new Set());
	}

	const reload = React.useCallback(() => {
		const id = ++latest.current;
		setFailed(false);
		setSelected(new Set());
		api.loadAttachments(frm).then(
			(f) => id === latest.current && setFiles(f),
			() => id === latest.current && setFailed(true)
		);
		// frappe already shows server errors (e.g. a broken rule condition); the panel just goes without a checklist.
		if (frm.is_new()) setRules(null);
		else
			api.getChecklist(frm).then(
				(c) => id === latest.current && setRules(c),
				() => id === latest.current && setRules(null)
			);
	}, [frm]);
	// `version` changes on every footer refresh, so docinfo changes (uploads elsewhere, doc reload) show up.
	React.useEffect(reload, [reload, version]);
	const refresh = () => frm.sidebar.reload_docinfo(reload);

	const updatePrefs = (patch) =>
		setPrefs((p) => {
			const n = { ...p, ...patch };
			savePrefs(n);
			return n;
		});
	const shown = files
		? filterAndSort(files, { query, sort: prefs.sort, favoritesOnly, type: typeFilter })
		: [];

	const chosen = shown.filter((f) => selected.has(f.name)); // only files on screen, so filtering never acts on hidden ones
	const actions = {
		preview: (f) => {
			if (linkHost(f.file_url)) return window.open(f.file_url, "_blank", "noopener");
			const files = shown.filter((x) => !linkHost(x.file_url)); // links open in a tab, not the dialog
			return loadBundle("preview").then(
				(p) =>
					p.open(files, files.indexOf(f), {
						canDelete: actions.canDelete,
						onSaved: refresh,
					}),
				(e) => {
					console.error("[attachment-manager] preview load failed", e);
					frappe.msgprint(__("Could not open the preview. Please try again."));
				}
			);
		},
		download: (f) => api.downloadFile(f.file_url, f.file_name),
		onlyOffice: (f) => onlyOfficeUrl(f),
		canDelete: !locked && frm.attachments.can_delete_attachment(),
		askDelete: setPendingDelete,
		canWrite: canEdit,
		types,
		setType: (list, type) =>
			api
				.setAttachmentType(
					list.map((f) => f.name),
					type
				)
				.then(refresh, api.alertError),
		askRename: setRenaming,
		toggleFavorite: (f) =>
			api
				.toggleFavorite(f.name)
				.then(
					(fav) =>
						setFiles((list) =>
							list?.map((x) => (x.name === f.name ? { ...x, is_favorite: fav } : x))
						),
					api.alertError
				),
		setPrivate: (list, priv) =>
			api
				.setPrivate(
					list.map((f) => f.name),
					priv
				)
				.then(refresh, api.alertError),
		selected,
		hasSelection: chosen.length > 0,
		toggleSelect: (f) =>
			setSelected((s) => {
				const n = new Set(s);
				n.has(f.name) ? n.delete(f.name) : n.add(f.name);
				return n;
			}),
	};
	const selection = chosen.length
		? {
				count: chosen.length,
				canWrite: canEdit,
				canDelete: actions.canDelete,
				onSetType: (type) => actions.setType(chosen, type),
				onClear: () => setSelected(new Set()),
				// Like Gmail: acts on the files shown (search and filters applied); bulk actions also only touch shown files.
				shownCount: shown.length,
				allShown: chosen.length === shown.length,
				onToggleAll: () =>
					setSelected(
						chosen.length === shown.length
							? new Set()
							: new Set(shown.map((f) => f.name))
					),
				onZip: () => api.downloadZip(chosen.map((f) => f.name)).catch(api.alertError),
				onPrivate: () => actions.setPrivate(chosen, true),
				onPublic: () => actions.setPrivate(chosen, false),
				onDelete: () => setBulkDelete(true),
		  }
		: null;
	const upload = (dropped, type) => api.openUploader(frm, dropped, type);
	const zip = async () => {
		setZipping(true);
		try {
			await api.downloadZip(shown.map((f) => f.name));
		} catch (e) {
			frappe.show_alert({ message: e.message, indicator: "red" });
		} finally {
			setZipping(false);
		}
	};

	const dnd = {
		onDragEnter: (e) => {
			e.preventDefault();
			setDragging((d) => d + 1);
		},
		onDragOver: (e) => {
			e.preventDefault();
			e.dataTransfer.dropEffect = "copy";
		},
		onDragLeave: () => setDragging((d) => Math.max(0, d - 1)),
		// Stop it reaching the form wrapper's own drop uploader (form/form.js setup_file_drop).
		onDrop: (e) => {
			e.preventDefault();
			e.stopPropagation();
			setDragging(0);
			if (canWrite && e.dataTransfer.files.length) upload([...e.dataTransfer.files]);
		},
	};

	let body;
	if (failed) body = <ErrorState onRetry={reload} />;
	else if (!files) body = <LoadingState />;
	else if (!files.length) body = <EmptyState onAdd={canWrite ? () => upload() : null} />;
	else if (!shown.length)
		body = (
			<NoResults
				query={query}
				favoritesOnly={favoritesOnly}
				typeFiltered={!!typeFilter}
				onClear={() => {
					setQuery("");
					setFavoritesOnly(false);
					setTypeFilter("");
				}}
			/>
		);
	else
		body =
			prefs.view === "list" ? (
				<FileList files={shown} actions={actions} />
			) : (
				<div className="contents @max-xl:hidden">
					<FileGrid files={shown} actions={actions} />
				</div>
			);

	return (
		<TooltipProvider delayDuration={300}>
			{/* Line up with the form's fields. .form-footer and .section-body share max-width --page-max-width, but only the
			   section adds 15px padding outside it: below that width fields sit 15px further in than the footer's content.
			   100% here is the footer's content width, so this is 15px below the cap and 0 at it (form.scss .form-footer, .std-form-layout).
			   ponytail: assumes the default (not full-width) desk layout; in full-width mode it stays 15px short. */}
			<section
				className="@container relative flex flex-col gap-4 px-[clamp(0px,calc((var(--page-max-width,900px)_-_30px_-_100%)_*_1000),15px)] py-4"
				aria-label={__("Attachments")}
				{...dnd}
			>
				<Toolbar
					count={files?.length || 0}
					shown={shown.length}
					query={query}
					onQuery={setQuery}
					sort={prefs.sort}
					onSort={(sort) => updatePrefs({ sort })}
					view={prefs.view}
					onView={(view) => updatePrefs({ view })}
					zipping={zipping}
					onZip={zip}
					onUpload={() => upload()}
					favoritesOnly={favoritesOnly}
					filtered={!!query.trim() || favoritesOnly || !!typeFilter}
					onFavoritesOnly={setFavoritesOnly}
					canWrite={canWrite}
					onAddLink={() => setLinkOpen(true)}
					selection={selection}
					types={types}
					typeFilter={typeFilter}
					onTypeFilter={setTypeFilter}
				/>
				{locked && (
					<p className="flex items-center gap-2 text-sm text-muted-foreground">
						<Lock className="size-4" aria-hidden />{" "}
						{__("Attachments are locked after submit")}
					</p>
				)}
				{files && types.length > 0 && (
					<Checklist
						list={checklist(rules.rows, files)}
						files={files}
						flagMissing={!!saveFailed}
						editable={canEdit}
						onUpload={(type) => upload(undefined, type)}
						onTag={actions.setType}
					/>
				)}
				{body}
				{/* Narrow panels always get the list, whatever the saved view. */}
				{!failed && files?.length && shown.length && prefs.view === "grid" ? (
					<div className="@xl:hidden">
						<FileList files={shown} actions={actions} />
					</div>
				) : null}
				{dragging > 0 && canWrite && (
					<div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-lg border-2 border-dashed border-primary bg-background/85">
						<p className="flex items-center gap-2 font-medium">
							<UploadCloud className="size-5" /> {__("Drop files to upload")}
						</p>
					</div>
				)}
			</section>
			<ConfirmDialog
				open={!!pendingDelete}
				onOpenChange={(o) => !o && setPendingDelete(null)}
				title={__("Delete attachment?")}
				description={__("“{0}” will be permanently deleted.", [pendingDelete?.file_name])}
				confirmLabel={__("Delete")}
				onConfirm={() =>
					api.deleteAttachment(frm, pendingDelete.name).catch(api.alertError)
				}
			/>
			<ConfirmDialog
				open={bulkDelete}
				onOpenChange={setBulkDelete}
				title={__("Delete {0} attachments?", [chosen.length])}
				description={__("They will be permanently deleted.")}
				confirmLabel={__("Delete")}
				onConfirm={() =>
					api.deleteMany(
						frm,
						chosen.map((f) => f.name)
					)
				}
			/>
			<FormDialog
				open={linkOpen}
				onOpenChange={setLinkOpen}
				title={__("Add link")}
				submitLabel={__("Add")}
				onSubmit={(d) => api.addLink(frm, d.get("url").trim(), d.get("label").trim())}
			>
				<Input
					name="url"
					type="url"
					required
					pattern="https?://.+"
					placeholder="https://…"
					aria-label={__("URL")}
				/>
				<Input
					name="label"
					placeholder={__("Label (optional)")}
					aria-label={__("Label")}
				/>
			</FormDialog>
			<FormDialog
				open={!!renaming}
				onOpenChange={(o) => !o && setRenaming(null)}
				title={__("Rename")}
				submitLabel={__("Rename")}
				onSubmit={(d) => api.renameFile(renaming.name, d.get("name")).then(refresh)}
			>
				<Input
					name="name"
					required
					defaultValue={renaming?.file_name}
					onFocus={(e) => {
						const v = e.target.value;
						const dot = v.lastIndexOf(".");
						e.target.setSelectionRange(0, dot > 0 ? dot : v.length);
					}}
					aria-label={__("File name")}
				/>
				{/\.[^./]+$/.test((renaming?.file_name || "").replace(/^\.+/, "")) && (
					<p className="-mt-2 text-xs text-muted-foreground">
						{__("Extension is kept")}
					</p>
				)}
			</FormDialog>
		</TooltipProvider>
	);
}
