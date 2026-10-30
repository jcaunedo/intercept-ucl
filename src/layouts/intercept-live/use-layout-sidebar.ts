import * as React from "react";

import { mediaAbove } from "@/lib/breakpoints";
import { useMediaQuery } from "@/lib/hooks/use-media-query";

/**
 * The shell's Sidebar state (DESIGN.md "Sidebar auto-collapses at lg and below"). Pass the result to `Sidebar`'s
 * `collapsed` / `onCollapsedChange`.
 *
 * Starts at `defaultCollapsed`. At `lg` (1024px) and below the Sidebar collapses on its own, on first load at a narrow
 * width too, not only when the window narrows. Back above `lg` it returns to the state it had before, but only if the
 * collapse was the automatic one: a collapse the user made at `lg` and below sticks. `wasAutoCollapsedRef` tells the
 * two apart, so the restore only undoes this hook's own collapse. Any toggle by the user clears it and makes the
 * current state theirs.
 */
function useLayoutSidebar(defaultCollapsed = false) {
	const [sidebarCollapsed, setSidebarCollapsed] = React.useState(defaultCollapsed);
	const isLgUp = useMediaQuery(mediaAbove("lg"));
	const wasAutoCollapsedRef = React.useRef(false);
	const preCollapseStateRef = React.useRef(false);

	React.useEffect(() => {
		if (!isLgUp) {
			setSidebarCollapsed((current) => {
				if (!current) {
					preCollapseStateRef.current = current;
					wasAutoCollapsedRef.current = true;
				}
				return true;
			});
		} else if (wasAutoCollapsedRef.current) {
			setSidebarCollapsed(preCollapseStateRef.current);
			wasAutoCollapsedRef.current = false;
		}
	}, [isLgUp]);

	const handleSidebarCollapsedChange = React.useCallback((collapsed: boolean) => {
		wasAutoCollapsedRef.current = false;
		setSidebarCollapsed(collapsed);
	}, []);

	return { sidebarCollapsed, handleSidebarCollapsedChange };
}

export { useLayoutSidebar };
