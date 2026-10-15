import type { Transition } from "motion/react";
import { useReducedMotion } from "motion/react";

/**
 * A near-instant transition to substitute for any animated transition when
 * the user prefers reduced motion. Duration isn't literally 0 — Motion/most
 * browsers treat a true 0 as "no transition event fires" in some cases,
 * and state-change feedback must survive reduced motion,
 * not disappear — so this stays perceptible but effectively instant.
 */
const reducedMotionTransition: Transition = { duration: 0.01 };

/**
 * Resolves a transition against the user's reduced-motion preference.
 * Use inside a component: `transition={resolveTransition(prefersReduced, standardTransition)}`.
 */
function resolveTransition(
  prefersReducedMotion: boolean | null,
  transition: Transition,
): Transition {
  return prefersReducedMotion ? reducedMotionTransition : transition;
}

/**
 * Hook wrapping Motion's `useReducedMotion`, exposing both the raw
 * preference and a `resolve` helper bound to it — so call sites don't have
 * to thread the boolean through `resolveTransition` themselves.
 *
 * When reduced motion is enabled, remove
 * nonessential transforms/parallax/large shared-element movement and
 * prefer opacity-only feedback, but never drop the state-change feedback
 * itself — components should still call `resolve` and receive a
 * (near-instant) transition, not skip animating altogether.
 */
function useMotionPreference() {
  const prefersReducedMotion = useReducedMotion();
  return {
    prefersReducedMotion,
    resolve: (transition: Transition) =>
      resolveTransition(prefersReducedMotion, transition),
  };
}

export { reducedMotionTransition, resolveTransition, useMotionPreference };
