/**
 * Motion tokens — the only place raw timing/distance/scale numbers should
 * live. Everything in `transitions.ts`/`variants.ts`/`patterns.ts` is built
 * from these; components should reference those, not these, directly.
 */

/** Seconds. */
const motionDuration = {
	/** Instant feedback: 100–150ms. */
	instant: 0.12,
	/** Hover/press feedback: 120–180ms. */
	fast: 0.16,
	/** Standard UI transitions: 300ms. */
	normal: 0.3,
	/** Panels and overlays: 500ms. */
	slow: 0.5,
	/** Page-level transitions: 600ms. */
	deliberate: 0.6,
	/** One cycle of a looping "working on it" pulse (Pending pattern). */
	pendingLoop: 1.2,
} as const;

/** Pixels. */
const motionDistance = {
	/** Hover movement: 2–4px. */
	hover: 3,
	/** Small element reveal: 4–8px. */
	subtle: 8,
	/** Component transition: 8–16px. */
	small: 12,
	/** Panel transition: 16–32px. */
	medium: 24,
	/** Page transition: 24–48px. */
	large: 40,
} as const;

/** Unitless scale factors. */
const motionScale = {
	/** Buttons/cards while pressed. */
	press: 0.98,
	/** Cards/surfaces on hover (Lift pattern). */
	hover: 1.01,
	/** Media (images/thumbnails) on hover, inside a Lift card: grows 3%. */
	mediaHover: 1.03,
	/** Menu/dropdown content entering (Menus and Dropdowns). */
	popIn: 0.98,
	/**
	 * Side-by-side choice cards: the hovered card grows while its sibling
	 * recedes by the same amount, so the gap between them stays put.
	 */
	spotlight: 1.025,
	recede: 0.975,
	/** Small inline icons (e.g. a selection check) appearing in place. */
	iconIn: 0.6,
	/** A small element (e.g. an icon) growing in as it replaces another in place (Swap pattern). */
	swapIn: 0.8,
	/** An item picked up by a drag (Lift while dragging), e.g. a photo tile being reordered. */
	drag: 1.03,
	/** Peak of a small trigger icon's Pending pulse (e.g. an AI mark while it generates). */
	pendingIcon: 1.3,
} as const;

/** Degrees. Keep rotation under 2 degrees and use it sparingly. */
const motionRotation = {
	/** An item picked up by a drag — a slight tilt so it reads as held. */
	drag: 1.5,
} as const;

/** Seconds, for `staggerChildren`/`delayChildren` (Flow pattern). */
const motionStagger = {
	/** Short list/group entrance (Flow pattern) — keep intervals short. */
	fast: 0.04,
	normal: 0.06,
} as const;

export { motionDuration, motionDistance, motionScale, motionRotation, motionStagger };
