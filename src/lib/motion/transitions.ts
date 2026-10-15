import type { Transition } from "motion/react";

import { motionDuration } from "./tokens";

/**
 * Named `Transition` presets. Pick by interaction
 * intent, not by how the curve looks in isolation.
 */

/** Common UI transitions: smooth accel, controlled decel, no overshoot. */
const standardTransition: Transition = {
	duration: motionDuration.normal,
	ease: [0.4, 0, 0.2, 1],
};

/** Elements entering the interface: quick start, gentle finish. */
const enterTransition: Transition = {
	duration: motionDuration.slow,
	ease: [0.16, 1, 0.3, 1],
};

/** Elements leaving the interface: shorter than enter, decisive. */
const exitTransition: Transition = {
	duration: motionDuration.fast,
	ease: [0.4, 0, 1, 1],
};

/**
 * An element growing in as it replaces another in place (`iconSwapVariants`): `motionDuration.normal`
 * (300ms) on the enter curve, so the scale-up arrives quickly and settles gently. The element it
 * replaces leaves on `exitTransition`.
 */
const swapEnterTransition: Transition = {
	...enterTransition,
	duration: motionDuration.normal,
};

/**
 * Page auto-scroll (bringing content into view): page-level timing on the standard curve, so the
 * page eases in and settles gently instead of the browser's quick native smooth scroll.
 */
const scrollTransition: Transition = {
	...standardTransition,
	duration: motionDuration.deliberate,
};

/**
 * Spring presets for direct manipulation, drag, press,
 * shared-element movement, responsive layout changes. Deliberately
 * non-bouncy (high damping) per the brand's "Calm/Refined" personality.
 */

/** Small, contained motion (press feedback, tab indicators). */
const subtleSpring: Transition = {
	type: "spring",
	stiffness: 400,
	damping: 32,
};

/** Direct-manipulation feedback that should feel snappy (hover/press). */
const responsiveSpring: Transition = {
	type: "spring",
	stiffness: 500,
	damping: 30,
};

/** Layout/shared-element transitions (Motion `layout`/`layoutId`). */
const layoutSpring: Transition = {
	type: "spring",
	stiffness: 350,
	damping: 35,
};

export {
	standardTransition,
	enterTransition,
	exitTransition,
	swapEnterTransition,
	scrollTransition,
	subtleSpring,
	responsiveSpring,
	layoutSpring,
};
