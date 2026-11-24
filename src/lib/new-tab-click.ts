type LinkClickEvent = Pick<MouseEvent, "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey" | "preventDefault">;

/**
 * Whether a click on a link is one that opens it elsewhere: Cmd or Ctrl (a new tab), Shift (a new window), Alt (a
 * download), or a button other than the main one. A middle-click never fires `click`, so the browser always gets it.
 */
function isNewTabClick(event: Pick<MouseEvent, "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey">) {
	return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

/**
 * Opens `href` in a new tab and brings it to the front. Run just after the click: a tab opened while Cmd or Ctrl is
 * held goes behind, as the browser's own Cmd+click does. The new tab can't reach back to this one (`opener`).
 */
function openInNewTab(href: string) {
	window.setTimeout(() => {
		const tab = window.open(href, "_blank");
		if (!tab) return;
		tab.opener = null;
		tab.focus();
	}, 0);
}

/**
 * A click on a link the app also follows in place (a Sidebar page, a patient card or row). A plain click calls
 * `navigate` and the link isn't followed. Cmd/Ctrl+click opens `href` in a new tab and moves to it. Shift, Alt and the
 * other buttons are left to the browser (a new window, a download). Without `href`, every click navigates in place.
 */
function handleLinkClick(event: LinkClickEvent, href: string | undefined, navigate: () => void) {
	if (!href) {
		navigate();
		return;
	}
	if (event.button === 0 && (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey) {
		event.preventDefault();
		openInNewTab(href);
		return;
	}
	if (isNewTabClick(event)) return;
	event.preventDefault();
	navigate();
}

export { handleLinkClick, isNewTabClick, openInNewTab, type LinkClickEvent };
