# Motion System

How motion is designed and built in this library: principles, the named patterns, component guidance, accessibility and validation.

**This file holds the rules, not the values.** Adjust motion values (tokens, durations, easings, springs, distances, variants and patterns) in the code, in `src/lib/motion/`. Storybook shows the current values under Foundations → Motion. Rules for one specific component's motion live in [DESIGN.md](DESIGN.md).

Use Motion for React from `motion/react`. All motion values come from `src/lib/motion/`. Use those exports; don't write raw durations, easings or distances in components.

Motion explains a change in state, preserves spatial continuity and keeps the interface responsive. Don't animate for decoration. If an animation doesn't improve clarity, feedback, orientation or perceived speed, leave it out. When unsure, choose the more subtle option.

## Personality

Calm, refined, natural, responsive. Never bouncy, cartoonish, mechanical or distracting.

- **Prefer:** fade, soft scale, gentle elevation, short directional slide, crossfade, shared-element transition, smooth layout transition, subtle stagger.
- **Use sparingly:** rotation under 2°, parallax, scroll-linked movement, expressive springs.
- **Avoid unless asked:** bounce, shake, spin, elastic overshoot, full-screen wipes, dramatic zoom, long travel. (Asked for once: an incoming alert toast overshoots, the Arrive pattern; Nov 4, 2026.)

## Tokens (`src/lib/motion/tokens.ts`)

| Token                         | Value  | Use                                    |
| ----------------------------- | ------ | -------------------------------------- |
| `motionDuration.instant`      | 120 ms | Instant feedback                       |
| `motionDuration.fast`         | 160 ms | Hover/press feedback, exits            |
| `motionDuration.normal`       | 300 ms | Standard UI transitions                |
| `motionDuration.slow`         | 500 ms | Panels, overlays, entrances            |
| `motionDuration.deliberate`   | 600 ms | Page-level transitions, auto-scroll    |
| `motionDistance.hover`        | 3 px   | Lift                                   |
| `motionDistance.subtle`       | 8 px   | Reveal                                 |
| `motionDistance.small`        | 12 px  | Component transitions                  |
| `motionDistance.medium`       | 24 px  | Panels, Glide                          |
| `motionDistance.large`        | 40 px  | Page transitions                       |
| `motionScale.press`           | 0.98   | Press                                  |
| `motionScale.mediaHover`      | 1.03   | Media inside a Lift card               |

Don't go past `deliberate` (600 ms). A new value goes in `tokens.ts` with a comment saying what it's for, never inline in a component.

## Transitions (`transitions.ts`)

- `standardTransition`: common UI changes. Smooth acceleration, controlled deceleration, no overshoot.
- `enterTransition`: elements arriving. Quick start, gentle finish.
- `exitTransition`: elements leaving. Shorter than enter, decisive.
- `subtleSpring` / `responsiveSpring` / `layoutSpring`: press, direct manipulation, layout and shared-element movement. High damping, no visible bounce.
- `overshootSpring`: arrivals that must be noticed (the Arrive pattern). Under-damped on purpose (damping ratio about 0.5): it passes its place by about 15% of the travel and settles in about 500ms. The only spring that visibly overshoots; never for direct manipulation, layout or a change in place.
- `reorderSpring`: items changing place when their data changes (the Reorder pattern). Calmer than `layoutSpring` (about 600ms) and critically damped, so it lands without overshoot and redirects smoothly when a new change interrupts it.

## Vocabulary

Use these named patterns before inventing new motion. Gesture patterns live in `patterns.ts`, presence patterns in `variants.ts`.

| Pattern  | Use for                                | Implementation                                  |
| -------- | -------------------------------------- | ----------------------------------------------- |
| Lift     | Hoverable cards and surfaces           | `liftPattern`, `liftWithMediaPattern`           |
| Press    | Buttons, cards, direct interactions    | `pressPattern`                                  |
| Reveal   | Content appearing in context           | `revealVariants`. Opening a patient's details from a card, a row or an alert (Oct 31, 2026, user's call): the details fade in and rise 8px over 1 s, twice Reveal's `enterTransition` (`motionDuration.slow` × 2, `detailsRevealVariants`), so the page change reads; a fade only under reduced motion |
| Expand   | A region opening/closing in place      | `expandVariants` + `useExpandClip()`            |
| Connect  | Shared-element transitions             | `layoutId` + `layoutSpring`. Group by hospital (Census, Monitoring): each card has the same `layoutId` in the grid and the Kanban board (`panelCardLayoutId`), so switching glides it to its new place on `reorderSpring` (risen, as in Reorder) instead of remounting; the board's column headers and fills fade in (`fadeVariants`) only when switched to, not when the page opens on it. Instant under reduced motion |
| Reorder  | Items changing place because their data changed (a live feed, a sort or filter) | `layout` with `reorderSpring`; in a grid the moving item rises while it travels (above its neighbors, `shadow-lg`) so crossing items stay readable; instant under reduced motion. Used by the patient grid (Census, Monitoring) and the triage queue. The patient grid holds its order while the pointer is over it (or keyboard focus is in it) and moves on leaving, except with Monitoring's Active alerts on, which moves under the pointer too (Nov 3, 2026). **Snap (Nov 1, 2026, user's call):** turning Monitoring's Active alerts chip on or off re-sorts on the click itself, with no motion: the cards land in their new places and leaving cards vanish (`useSnapOrder`, open for `motionDuration.normal`); later changes glide again |
| Flow     | Small groups entering together         | `staggerContainerVariants` + children `revealVariants` |
| Glide    | Directional navigation                 | `slideVariants` (`custom={1 \| -1}`), `glidePattern`. Back from a patient's details (Oct 31, 2026, user request; the shell, `intercept-live.tsx`): everything slides right. The details leave 24px to the right as they fade (`exitTransition`), taken out of the flow over the page (`AnimatePresence mode="popLayout"`), while the page comes in from the left, moving right (`motionDistance.medium`, fading in on `enterTransition`). Opening the details uses Reveal instead (below; it was a Glide from the right until later that day). Once per navigation (not when stepping between patients, nor when the app opens on a patient); opacity only under reduced motion |
| Dismiss  | Content removed or closed              | `dismissVariants`; table/list rows: `rowRemoveVariants` |
| Confirm  | Lightweight success feedback           | `confirmPattern`                                |
| Pending  | Work in progress on an element's behalf | `pendingIconVariants`, `pendingSurfaceVariants` |
| Arrive   | Something arriving that has to be noticed: an incoming alert toast (Nov 4, 2026, user's call: "an incoming alert, let's make it an overshoot Motion effect") | `arriveVariants`: rises `motionDistance.medium` (24px) from `motionScale.popIn`, overshoots on `overshootSpring` (about 3.7px past) and settles in about 500ms; opacity fades in on `fast`. Once per arrival: a toast updated in place (same id) doesn't arrive again. On top of the Toaster's own slide-in (`toastAlert()` wraps each toast in `ToastArrival`). `fadeVariants` under reduced motion |
| Urgency  | Draws the eye to something that needs attention until it's addressed (e.g. an active alert's card border) | `urgencyRingVariants` driven by `useUrgencyPhase` (one shared clock: every instance pulses together); opacity only; pulses until addressed, then rests; still under reduced motion. The Sidebar's alert dot flashes on the same clock while shown. Not on the Census (PatientCard `alertRing={false}`: a page for managing patients, not watching them), whose cards have no ring at all. A just-resolved alert's green ring blinks once (one pulse), and its pill moves with the card, then fades out on `resolvedFadeTransition` (1 s) `motionDuration.resolvedHold` (2 s) after it has landed |
| Live     | An ongoing status (e.g. connected), as a looping pulse on a small dot that eases in and out like a breath, its halo easing out like a ripple | `liveDotVariants` + `liveHaloVariants` + `liveGlowVariants`, one beat every `motionDuration.liveLoop` (1s): 300ms growing, a 400ms hold at full size, 300ms shrinking (`liveBeatTimes`; Oct 31, 2026, user's call, two passes: a 200ms hold in a 0.8s beat, then the hold doubled; 500ms growing and 500ms shrinking with no hold before). The dot has no outline (Oct 31, 2026, user's call); instead a copy of it in its other color fades in as it reaches full size, when the halo glows, and out as it shrinks: in dark mode it rests in `success` and lights up in the glow's bright green; in light mode the other way round (rests bright, turns `success`). The halo is `success-halo`: a lighter, more saturated green in light mode, the glow's green in dark. Still under reduced motion, in its resting color |
| Unread   | A count of unread messages that should be noticed without alarming (Nov 5, 2026, user's call: "flash every 2 seconds") | `unreadFlashVariants`: `flash` loops every `motionDuration.unreadLoop` (2 s): the count dims to half and swells to `motionScale.unreadFlash` (1.15) over 200ms, comes back over 200ms, then rests 1.6 s. Opacity and scale only; under WCAG 2.3.1's three flashes a second. `rest` under reduced motion (still). Calmer than Urgency, which is for alerts. Used by AppHeader's patient Messages count (Counter `neutral`), only while there's something unread and the messages are closed |
| Device alarm | A vital in a bedside monitor's alarm, shown as the device shows it (GE CARESCAPE, IEC 60601-1-8) | `useDeviceAlarmFlash` (`deviceAlarmFlashHz`): the value's box in its priority's color, on and off at 50%: high (red) about 1.5 Hz, medium (yellow) about 0.5 Hz, low (cyan) steady; one clock per rate, so alarms of a priority flash together. A hard on/off, not a fade, as on the device; under WCAG 2.3.1's three flashes a second. Steady under reduced motion. Used by `DeviceAlarmValue` (PatientMonitoringCard, Monitoring's List) |

Plus `fadeVariants`, `overlayVariants` (scrims), `panelVariants` (drawers) and `iconSwapVariants` (one small element replacing another in place).

## Component guidance

- **Buttons:** press scale 0.98, fast release, never delay the action for the animation, never animate dimensions.
- **Cards:** Lift on hover, media scale up to 1.03, no motion on non-interactive cards.
- **Inputs:** motion clarifies focus, validation and conditional fields. Keep layout stable. No shake.
- **Interaction reveals (Oct 31, 2026, user's rule: "by default always apply Motion on this kind of interactions"):** anything that shows or hides on an interaction (hover, focus, a toggle) animates, and so does the room it takes: never a jump. Reveal the element (fade plus `motionDistance.subtle` from where it comes from) and animate its slot's width or height, so neighbors glide aside instead of snapping; `standardTransition` in, `exitTransition` out, as SearchInput opens and closes; near-instant under reduced motion (`resolve()`). First use: PatientMonitoringCard's "…" button, which shows on hover and pushes the family message icon aside. Also: its score and tag rows, which close and open in place (height, opacity and their share of the card's gap) when Monitoring's Minimal view hides them.
- **Search (SearchInput):** a collapsible search opens by animating its width (`standardTransition`, 300 ms) and closes faster (`exitTransition`, 160 ms); its clear button enters and leaves with `iconSwapVariants`. Near-instant under reduced motion. The one input that changes size, because opening is its purpose; neighbors (the filter chips) reflow beside it, and the page's actions stay put.
- **Menus/dropdowns:** short fade plus a small movement from the trigger.
- **Dialogs/overlays:** `AnimatePresence`, overlay fade, small surface movement, exit shorter than entrance. Usable immediately.
- **Tabs:** active indicator via shared `layoutId`.
- **Lists:** `AnimatePresence` with stable unique keys (never the index). Don't replay entrances on routine data updates.
- **Loading:** subtle opacity pulse. No aggressive or high-contrast loaders.
- **Live waveforms (Nov 4, 2026):** a monitor's waveform lanes stream only while on screen. Coming into view, each lane shows a skeleton block in its color with Pending's surface pulse (`pendingSurfaceVariants`) for `motionDuration.streamConnect`, then the trace fades in (`standardTransition`). The skeleton is still under reduced motion. Never a flat line as the placeholder: on a monitor it means no signal.
- **AI answers:** "Thinking" is Pending (opacity only) for about `motionDuration.thinking`; then the text streams in uneven bursts of a few words around `motionDuration.streamStep`, with `streamPause` after a sentence, and a soft blinking caret (Pending) at its end. New messages Reveal. Under reduced motion the answer appears whole and the caret is still.

## Layout and presence

- Use `layout` for size/position changes and `layoutId` for shared elements. Don't hand-compute positions Motion can manage.
- Use `AnimatePresence` only for mount/unmount. Its direct children need stable unique keys.
- Animate `opacity` and `transform` by preference. Avoid continuously animating `top`/`left`/`margin`/`padding`/`box-shadow`.
- Never animate the same property with CSS and Motion at once.

## Accessibility

Always respect reduced motion: use `useMotionPreference()` and its `resolve()` helper. Under reduced motion:
- Remove nonessential transforms, parallax and large movement.
- Prefer opacity.
- Keep state-change feedback: it becomes near-instant (`reducedMotionTransition`), it doesn't disappear.

Motion is never the only signal of a state change. Keyboard behavior, focus order and visible focus must survive every animation.

## Validation

After motion work, check that:
- The build passes.
- There's no flash or layout shift.
- Exits complete.
- Rapid repeated interaction doesn't break state.
- Reduced motion works.
- Nothing blocks clicks, scrolling or navigation.
