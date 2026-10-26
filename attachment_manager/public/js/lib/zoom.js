// Drive-style zoom presets; 1 means "fit".
const STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];
export const MIN_ZOOM = STEPS[0];
export const MAX_ZOOM = STEPS.at(-1);

export function stepZoom(zoom, dir) {
	if (dir > 0) return STEPS.find((s) => s > zoom + 1e-9) ?? MAX_ZOOM;
	return STEPS.findLast((s) => s < zoom - 1e-9) ?? MIN_ZOOM;
}
