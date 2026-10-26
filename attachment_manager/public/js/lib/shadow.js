// Tailwind 4 registers custom properties with @property, which has no effect inside a
// shadow root. Copy those rules to the document once so shadows/rings/transforms work.
const hoisted = new Set();
function hoistAtProperty(cssText) {
	const fresh = (cssText.match(/@property[^{]+\{[^}]*\}/g) || []).filter((r) => !hoisted.has(r));
	if (!fresh.length) return;
	fresh.forEach((r) => hoisted.add(r));
	const style = document.createElement("style");
	style.dataset.am = "properties";
	style.textContent = fresh.join("\n");
	document.head.appendChild(style);
}

// Shadow DOM retargets event.target to the host, so desk shortcut handlers can't see that
// the user is typing in our inputs. Keep those keystrokes inside, except the shortcuts desk
// itself allows in inputs (ignore_inputs in ui/keyboard.js); others like ctrl+z would act on the form.
const DESK_INPUT_KEYS = ["s", "k", "g"];
function isolateTyping(host) {
	host.addEventListener("keydown", (e) => {
		if ((e.ctrlKey || e.metaKey) && DESK_INPUT_KEYS.includes(e.key.toLowerCase())) return;
		if (e.composedPath()[0]?.matches?.("input, textarea, [contenteditable]"))
			e.stopPropagation();
	});
}

export function createShadowMount(host, cssText) {
	const shadow = host.shadowRoot || host.attachShadow({ mode: "open" });
	shadow.replaceChildren();
	const style = document.createElement("style");
	style.textContent = cssText;
	const app = document.createElement("div");
	const portal = document.createElement("div");
	portal.dataset.amPortal = "";
	shadow.append(style, app, portal);
	hoistAtProperty(cssText);
	isolateTyping(host);
	return { app, portal };
}
