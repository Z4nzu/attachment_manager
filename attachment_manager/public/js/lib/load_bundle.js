// Lazily loads a Vite bundle once and resolves to the API it registers on
// frappe.attachment_manager[name].
const BASE = "/assets/attachment_manager/dist/react/";
const pending = {};

export const bundleUrl = (name) =>
	`${BASE}${name}.bundle.js?v=${
		frappe.boot.developer_mode ? Date.now() : window._version_number
	}`;

export function loadBundle(name) {
	const api = () => window.frappe?.attachment_manager?.[name];
	if (api()) return Promise.resolve(api());
	return (pending[name] ||= new Promise((resolve, reject) => {
		const s = document.createElement("script");
		s.src = bundleUrl(name);
		const fail = (msg) => {
			delete pending[name];
			reject(new Error(msg));
		};
		s.onload = () => (api() ? resolve(api()) : fail(`${name} bundle has no API`));
		s.onerror = () => fail(`Failed to load ${name} bundle`);
		document.body.appendChild(s);
	}));
}
