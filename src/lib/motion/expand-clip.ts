import * as React from "react";
import type { HTMLMotionProps } from "motion/react";

type AnimationDefinition = Parameters<
  NonNullable<HTMLMotionProps<"div">["onAnimationStart"]>
>[0];

/**
 * Clipping for an element whose height animates (`expandVariants`): its
 * content is hidden past the edge while the height grows or shrinks, and the clip comes off once
 * it settles, so focus rings and shadows aren't cut while it's open. Spread the result onto the
 * `motion.*` element:
 *
 * ```tsx
 * const clip = useExpandClip();
 * <motion.div {...clip} variants={expandVariants} initial="initial" animate="animate" exit="exit" />
 * ```
 *
 * `exitOnly` clips only the `"exit"` variant: for an element that opens some other way (e.g. a
 * fade while a parent's layout animation makes room) but collapses its own height when it leaves.
 */
function useExpandClip<T extends HTMLElement = HTMLDivElement>({
  exitOnly = false,
}: { exitOnly?: boolean } = {}) {
  const ref = React.useRef<T>(null);
  const setClip = (on: boolean) => {
    if (ref.current) ref.current.style.overflow = on ? "hidden" : "";
  };

  return {
    ref,
    onAnimationStart: (definition: AnimationDefinition) => {
      if (!exitOnly || definition === "exit") setClip(true);
    },
    onAnimationComplete: () => setClip(false),
  };
}

export { useExpandClip };
