import { animate } from "motion/react";

import { scrollTransition } from "./transitions";

/**
 * The element that scrolls `element`: its nearest ancestor with `overflow-y: auto | scroll` (e.g.
 * a full-screen overlay), or the page (`document.documentElement`).
 */
function scrollContainerOf(element: HTMLElement): HTMLElement {
	const page = document.documentElement;
	for (let node = element.parentElement; node && node !== page && node !== document.body; node = node.parentElement) {
		const { overflowY } = getComputedStyle(node);
		if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") return node;
	}
	return page;
}

/** A scroll container's visible area (the viewport for the page), its scroll position and extent. */
function scrollMetrics(container: HTMLElement) {
	const page = container === document.documentElement;
	const box = page ? { top: 0, bottom: window.innerHeight } : container.getBoundingClientRect();
	const scrollTop = page ? window.scrollY : container.scrollTop;
	const clientHeight = page ? window.innerHeight : container.clientHeight;
	return { top: box.top, bottom: box.top + clientHeight, scrollTop, maxScroll: container.scrollHeight - clientHeight };
}

/** Scrolls a container (or the page) to `top` at once. */
function scrollContainerTo(container: HTMLElement, top: number) {
	if (container === document.documentElement) window.scrollTo({ top, behavior: "instant" });
	else container.scrollTo({ top, behavior: "instant" });
}

/**
 * Where `container` has to scroll so `element` is fully in view ("nearest": the least movement),
 * honoring the container's `scroll-padding` and the element's `scroll-margin` the way native
 * `scrollIntoView` does. Element taller than the space: its top is aligned.
 */
function scrollTargetFor(element: HTMLElement, container: HTMLElement) {
	const containerStyle = getComputedStyle(container);
	const style = getComputedStyle(element);
	const px = (value: string) => parseFloat(value) || 0;
	const view = scrollMetrics(container);

	const rect = element.getBoundingClientRect();
	const top = rect.top - px(style.scrollMarginTop);
	const bottom = rect.bottom + px(style.scrollMarginBottom);
	const viewTop = view.top + px(containerStyle.scrollPaddingTop);
	const viewBottom = view.bottom - px(containerStyle.scrollPaddingBottom);

	let delta = 0;
	if (bottom > viewBottom) delta = Math.min(bottom - viewBottom, top - viewTop);
	else if (top < viewTop) delta = top - viewTop;

	return Math.min(Math.max(view.scrollTop + delta, 0), view.maxScroll);
}

/**
 * Scrolls `element` fully into view — in whatever scrolls it (the page, or a scrolling container
 * like a full-screen overlay) — on `scrollTransition`. The target is re-measured every
 * frame, so it can start while the element is still growing or moving (an accordion row expanding,
 * a row revealing, a sibling collapsing) and still land exactly where it settles — one continuous
 * movement instead of waiting for the layout first. Interruptible: any wheel, touch, pointer or key
 * input from the user stops it, and so does `element` leaving the page.
 * Reduced motion: jumps straight to the target.
 * Returns a function that stops the scroll.
 */
function scrollIntoViewSmoothly(element: HTMLElement, { reducedMotion = false } = {}) {
	const container = scrollContainerOf(element);
	if (reducedMotion) {
		scrollContainerTo(container, scrollTargetFor(element, container));
		return () => {};
	}

	const start = scrollMetrics(container).scrollTop;
	const controls = animate(0, 1, {
		...scrollTransition,
		onUpdate: (progress) => {
			if (!element.isConnected) return stop();
			scrollContainerTo(container, start + (scrollTargetFor(element, container) - start) * progress);
		},
	});

	const interruptions = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
	function stop() {
		controls.stop();
		for (const event of interruptions) window.removeEventListener(event, stop);
	}
	for (const event of interruptions) window.addEventListener(event, stop, { passive: true });
	controls.then(stop);
	return stop;
}

export { scrollContainerOf, scrollIntoViewSmoothly, scrollMetrics };
