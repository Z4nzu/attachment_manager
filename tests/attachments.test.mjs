import { test } from "node:test";
import assert from "node:assert/strict";
import {
	checklist,
	filterAndSort,
	linkHost,
	onlyOfficeUrl,
	UNTYPED,
} from "../attachment_manager/public/js/lib/attachments.js";

const files = [
	{
		name: "a",
		file_name: "Drawing.PDF",
		file_size: 800,
		creation: "2026-10-01 10:00:00",
	},
	{
		name: "b",
		file_name: "photo.jpg",
		file_size: 2000,
		creation: "2026-10-03 10:00:00",
	},
	{
		name: "c",
		file_name: "boq.xlsx",
		file_size: 90,
		creation: "2026-10-02 10:00:00",
	},
];
const names = (l) => l.map((f) => f.name);

test("default sort is newest first", () => {
	assert.deepEqual(names(filterAndSort(files, {})), ["b", "c", "a"]);
});
test("sorts by name and size", () => {
	assert.deepEqual(names(filterAndSort(files, { sort: "name_asc" })), ["c", "a", "b"]);
	assert.deepEqual(names(filterAndSort(files, { sort: "size_desc" })), ["b", "a", "c"]);
});
test("query matches name, extension and type, case-insensitive", () => {
	assert.deepEqual(names(filterAndSort(files, { query: "draw" })), ["a"]);
	assert.deepEqual(names(filterAndSort(files, { query: "XLSX" })), ["c"]);
	assert.deepEqual(names(filterAndSort(files, { query: "image" })), ["b"]);
});
test("does not mutate input", () => {
	const copy = files.slice();
	filterAndSort(files, { sort: "size_asc" });
	assert.deepEqual(files, copy);
});
test("onlyOfficeUrl needs the app and a supported extension", () => {
	assert.equal(onlyOfficeUrl(files[0], {}), null);
	assert.equal(
		onlyOfficeUrl(files[0], { onlyoffice_integration: "1" }),
		"/frontend/onlyoffice-editor/a"
	);
	assert.equal(onlyOfficeUrl(files[1], { onlyoffice_integration: "1" }), null);
});

test("favoritesOnly keeps starred files", () => {
	const list = [
		{ name: "a", file_name: "a.pdf", is_favorite: 1 },
		{ name: "b", file_name: "b.pdf" },
	];
	assert.deepEqual(
		filterAndSort(list, { favoritesOnly: true }).map((f) => f.name),
		["a"]
	);
	assert.equal(filterAndSort(list, {}).length, 2);
});

test("linkHost returns the hostname only for http(s) URLs on another origin", () => {
	const here = "http://site.local:8032";
	assert.equal(linkHost("https://example.com/a/b.pdf", here), "example.com");
	assert.equal(linkHost("http://example.com", here), "example.com");
	assert.equal(linkHost("http://site.local:8032/files/a.pdf", here), null);
	assert.equal(linkHost("/files/a.pdf", here), null);
	assert.equal(linkHost("/private/files/a.pdf", here), null);
	assert.equal(linkHost("javascript:alert(1)", here), null);
	assert.equal(linkHost(undefined, here), null);
});

test("checklist marks types with a file as done and counts required rows", () => {
	const rows = [
		{ attachment_type: "Drawing", required: true, required_on: "Submit" },
		{ attachment_type: "Invoice", required: true, required_on: "Save" },
		{ attachment_type: "Photo", required: false, required_on: "Save" },
	];
	const typed = [
		{ name: "a", attachment_type: "Drawing" },
		{ name: "b", attachment_type: "Photo" },
		{ name: "c" },
	];
	const { items, required, done } = checklist(rows, typed);
	assert.deepEqual(
		items.map((i) => [i.attachment_type, i.done, names(i.files)]),
		[
			["Drawing", true, ["a"]],
			["Invoice", false, []],
			["Photo", true, ["b"]],
		]
	);
	assert.deepEqual([done, required], [1, 2]);
});

test("filters by attachment type and untyped", () => {
	const typed = [
		{ name: "a", attachment_type: "Drawing", creation: "1" },
		{ name: "b", creation: "2" },
	];
	assert.deepEqual(names(filterAndSort(typed, { type: "Drawing" })), ["a"]);
	assert.deepEqual(names(filterAndSort(typed, { type: UNTYPED })), ["b"]);
	assert.deepEqual(names(filterAndSort(typed, {})), ["b", "a"]);
});
