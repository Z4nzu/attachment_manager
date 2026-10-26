import * as React from "react";

const TABBABLE =
	'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function deepActive() {
	let a = document.activeElement;
	while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
	return a;
}

// Radix FocusScope reads document.activeElement, which is the shadow host here, so it can't
// trap Tab or restore focus. Do both by hand against the shadow root's own activeElement.
export function useShadowFocusTrap() {
	const opener = React.useRef(null);
	return {
		onOpenAutoFocus: () => {
			opener.current = deepActive();
		},
		onCloseAutoFocus: (e) => {
			e.preventDefault();
			opener.current?.focus();
		},
		// A menu that opened us restores focus to its trigger after we mount: take that as the opener, pull focus back.
		onBlur: (e) => {
			if (!e.relatedTarget || e.currentTarget.contains(e.relatedTarget)) return;
			const back = e.target;
			setTimeout(() => {
				opener.current = deepActive();
				back.focus();
			});
		},
		onKeyDown: (e) => {
			if (e.key !== "Tab") return;
			const items = [...e.currentTarget.querySelectorAll(TABBABLE)].filter(
				(el) => el.offsetParent
			);
			const active = e.currentTarget.getRootNode().activeElement;
			const [first, last] = [items[0], items.at(-1)];
			if (e.shiftKey && (active === first || active === e.currentTarget)) {
				e.preventDefault();
				last?.focus();
			} else if (!e.shiftKey && active === last) {
				e.preventDefault();
				first?.focus();
			}
		},
	};
}
