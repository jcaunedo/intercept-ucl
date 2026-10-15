import type { HTMLMotionProps } from "motion/react";

import { motionDistance, motionScale } from "./tokens";
import { responsiveSpring, subtleSpring } from "./transitions";

/**
 * Named interaction patterns — prop
 * bundles meant to be spread onto a `motion.*` element, e.g.
 * `<motion.div {...liftPattern}>`. These cover gesture-driven feedback
 * (hover/tap); presence-driven patterns (Reveal, Dismiss, Expand) live in
 * `variants.ts` instead since they're keyed by mount state, not gesture.
 */

/** Hoverable cards and interactive surfaces: small upward translate. */
const liftPattern: Pick<HTMLMotionProps<"div">, "whileHover" | "transition"> = {
  whileHover: { y: -motionDistance.hover },
  transition: subtleSpring,
};

/** Buttons/cards/direct interactions: scale down while pressed. */
const pressPattern: Pick<HTMLMotionProps<"div">, "whileTap" | "transition"> = {
  whileTap: { scale: motionScale.press },
  transition: responsiveSpring,
};

/** Media on its own hover: subtle scale-up. Inside a Lift card, use `liftWithMediaPattern`. */
const mediaHoverPattern: Pick<HTMLMotionProps<"div">, "whileHover" | "transition"> = {
  whileHover: { scale: motionScale.mediaHover },
  transition: subtleSpring,
};

/**
 * Lift with media: the card lifts and the media inside it grows (`motionScale.mediaHover`), both
 * on the card's hover — the media follows through variant propagation, so it scales wherever the
 * pointer is on the card. Spread `card` on the card and `media` on the image; clip the image's
 * frame (`overflow-hidden`) so it grows within its bounds.
 */
const liftWithMediaPattern = {
  card: {
    whileHover: "hover",
    variants: { hover: { y: -motionDistance.hover } },
    transition: subtleSpring,
  },
  media: {
    variants: { hover: { scale: motionScale.mediaHover } },
    transition: subtleSpring,
  },
} satisfies Record<"card" | "media", HTMLMotionProps<"div">>;

/**
 * Directional navigation transitions (Glide) — match the
 * direction of navigation; pass `direction: 1 | -1` to pick left/right.
 */
function glidePattern(direction: 1 | -1 = 1) {
  return {
    initial: { opacity: 0, x: direction * motionDistance.medium },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -direction * motionDistance.medium },
  } as const;
}

/** Lightweight success feedback: brief, subtle scale bump (Confirm). */
const confirmPattern: Pick<HTMLMotionProps<"div">, "animate" | "transition"> = {
  animate: { scale: [1, 1.04, 1] },
  transition: { duration: 0.24, ease: "easeInOut" },
};

export { liftPattern, pressPattern, mediaHoverPattern, liftWithMediaPattern, glidePattern, confirmPattern };
