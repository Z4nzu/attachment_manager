import { test } from "node:test";
import assert from "node:assert/strict";
import { stepZoom, MIN_ZOOM, MAX_ZOOM } from "../attachment_manager/public/js/lib/zoom.js";

test("steps to the next preset", () => {
	assert.equal(stepZoom(1, 1), 1.1);
	assert.equal(stepZoom(1, -1), 0.9);
	assert.equal(stepZoom(1.05, 1), 1.1);
	assert.equal(stepZoom(1.05, -1), 1);
});

test("clamps at the ends", () => {
	assert.equal(stepZoom(MAX_ZOOM, 1), MAX_ZOOM);
	assert.equal(stepZoom(MIN_ZOOM, -1), MIN_ZOOM);
});
