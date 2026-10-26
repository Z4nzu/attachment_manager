import * as React from "react";
import Loader from "./Loader.jsx";
import ErrorPanel from "./ErrorPanel.jsx";
import { stepZoom } from "../../lib/zoom.js";

const CLICK_ZOOM = 2;

// Image preview: zoom (1 = fit) is driven by the parent; click toggles fit/2× at the clicked point, drag pans.
export default function ImageView({ fileUrl, fileName, zoom, onZoom, onDownload }) {
	const wrapRef = React.useRef(null);
	const imgRef = React.useRef(null);
	const [status, setStatus] = React.useState("loading");
	const [fit, setFit] = React.useState(null); // rendered size at zoom 1
	const zoomRef = React.useRef(zoom);
	zoomRef.current = zoom;
	const anchor = React.useRef(null); // image point to keep still across the next zoom (cursor, or viewport centre)
	const drag = React.useRef({ active: false, moved: false, x: 0, y: 0, left: 0, top: 0 });

	React.useEffect(() => {
		setStatus("loading");
	}, [fileUrl]);

	// Fit = shrink to the viewport, never upscale. offset* ignores scrollbars, so zooming in doesn't shrink "fit".
	const measure = React.useCallback(() => {
		const el = wrapRef.current,
			img = imgRef.current;
		if (!el || !img?.naturalWidth) return;
		const s = Math.min(
			1,
			el.offsetWidth / img.naturalWidth,
			el.offsetHeight / img.naturalHeight
		);
		setFit({ w: img.naturalWidth * s, h: img.naturalHeight * s });
	}, []);
	React.useEffect(() => {
		const ro = new ResizeObserver(measure);
		ro.observe(wrapRef.current);
		return () => ro.disconnect();
	}, [measure]);

	React.useLayoutEffect(() => {
		const a = anchor.current,
			el = wrapRef.current;
		if (!a || !fit) return;
		anchor.current = null;
		el.scrollLeft = a.fx * fit.w * zoom - a.vx;
		el.scrollTop = a.fy * fit.h * zoom - a.vy;
	}, [zoom, fit]);

	const onMouseDown = (e) => {
		if (e.button !== 0) return;
		const el = wrapRef.current;
		drag.current = {
			active: true,
			moved: false,
			x: e.pageX,
			y: e.pageY,
			left: el.scrollLeft,
			top: el.scrollTop,
		};
	};
	const onMouseMove = (e) => {
		const d = drag.current;
		if (!d.active) return;
		const dx = e.pageX - d.x,
			dy = e.pageY - d.y;
		if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
		if (!d.moved || zoom <= 1) return;
		e.preventDefault();
		wrapRef.current.scrollLeft = d.left - dx;
		wrapRef.current.scrollTop = d.top - dy;
	};
	const endDrag = () => {
		drag.current.active = false;
	};
	const setAnchor = React.useCallback((e) => {
		const r = imgRef.current.getBoundingClientRect(),
			w = wrapRef.current.getBoundingClientRect();
		anchor.current = {
			fx: (e.clientX - r.left) / r.width,
			fy: (e.clientY - r.top) / r.height,
			vx: e.clientX - w.left,
			vy: e.clientY - w.top,
		};
	}, []);
	// Pill/keyboard zoom is a bare prop change: anchor the viewport centre. Read during render, while the DOM still has the old zoom.
	const shownZoom = React.useRef(zoom);
	if (zoom !== shownZoom.current) {
		shownZoom.current = zoom;
		const el = wrapRef.current;
		if (!anchor.current && fit && status === "ready") {
			const w = el.getBoundingClientRect();
			setAnchor({
				clientX: w.left + el.clientWidth / 2,
				clientY: w.top + el.clientHeight / 2,
			});
		}
	}
	// Trackpad pinch arrives as ctrl+wheel; zoom around the cursor and stop browser zoom.
	React.useEffect(() => {
		const el = wrapRef.current;
		const onWheel = (e) => {
			if (!(e.ctrlKey || e.metaKey)) return;
			e.preventDefault();
			const next = stepZoom(zoomRef.current, -Math.sign(e.deltaY));
			if (next === zoomRef.current) return; // no re-render would consume the anchor
			setAnchor(e);
			onZoom(next);
		};
		el.addEventListener("wheel", onWheel, { passive: false });
		return () => el.removeEventListener("wheel", onWheel);
	}, [onZoom, setAnchor]);
	const onClick = (e) => {
		if (drag.current.moved) return;
		setAnchor(e);
		onZoom(zoom > 1 ? 1 : CLICK_ZOOM);
	};

	return (
		<div
			ref={wrapRef}
			className="flex size-full overflow-auto"
			onMouseDown={onMouseDown}
			onMouseMove={onMouseMove}
			onMouseUp={endDrag}
			onMouseLeave={endDrag}
		>
			{status === "loading" && <Loader label={__("Loading image…")} />}
			{status === "error" && (
				<ErrorPanel message={__("Could not load this image.")} onDownload={onDownload} />
			)}
			{/* m-auto centres a small image without clipping a zoomed one (place-items-center would). */}
			<img
				ref={imgRef}
				src={fileUrl}
				alt={fileName}
				className={`m-auto max-w-none shrink-0 ${
					zoom > 1 ? "cursor-zoom-out" : "cursor-zoom-in"
				}`}
				style={{
					width: fit && fit.w * zoom,
					height: fit && fit.h * zoom,
					display: status === "ready" ? "block" : "none",
				}}
				draggable={false}
				onLoad={() => {
					setStatus("ready");
					measure();
				}}
				onError={() => setStatus("error")}
				onClick={onClick}
			/>
		</div>
	);
}
