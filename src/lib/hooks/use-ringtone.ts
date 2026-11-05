import * as React from "react";

// An incoming call's ringtone, synthesized with Web Audio, so there's no sound file to ship or license: two soft notes (a
// rising major third, E5 then G♯5), while `active`. It's quiet on purpose: it sits beside a visual ring and an `alert`
// announcement, which carry the call on their own. The cadence says how urgent the call is (Nov 4, 2026, user's call): the
// more urgent, the faster it rings, at the same notes and volume.

/** How urgent a call is, which sets how often it rings. */
type RingUrgency = "high" | "medium" | "low";

/**
 * How often the two notes repeat, in ms, by urgency: high fast, medium in between, low slow. High is twice as fast as it
 * was (Nov 4, 2026, user's call: 1.1 s → 0.55 s).
 */
const ringCadence: Record<RingUrgency, number> = { high: 550, medium: 1700, low: 2500 };
/** How fast each ring's two notes play, by urgency: High's at double tempo, so a ring (0.8 s) fits its 0.55 s cadence. */
const ringTempo: Record<RingUrgency, number> = { high: 2, medium: 1, low: 1 };
/** The notes: pitch in Hz, start and length in seconds from each ring. */
const NOTES = [
	{ frequency: 659.25, start: 0, length: 0.45 },
	{ frequency: 830.61, start: 0.22, length: 0.6 },
];
/** Peak gain of each note, out of 1. */
const VOLUME = 0.12;

type AudioContextConstructor = typeof AudioContext;

/** Plays one ring (both notes) on `context`, now, `tempo` times as fast. */
function ringOnce(context: AudioContext, tempo = 1) {
	const now = context.currentTime + 0.02;
	for (const { frequency, start: noteStart, length: noteLength } of NOTES) {
		const note = { frequency, start: noteStart / tempo, length: noteLength / tempo };
		const oscillator = context.createOscillator();
		const gain = context.createGain();
		oscillator.type = "sine";
		oscillator.frequency.value = note.frequency;
		// A quick attack and a bell-like decay, so the note never clicks.
		gain.gain.setValueAtTime(0, now + note.start);
		gain.gain.linearRampToValueAtTime(VOLUME, now + note.start + 0.02);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.length);
		oscillator.connect(gain).connect(context.destination);
		oscillator.start(now + note.start);
		oscillator.stop(now + note.start + note.length + 0.05);
	}
}

/**
 * Rings while `active`: two soft notes, every 0.55 s at double tempo for a `high` urgency call, 1.7 s for `medium` and
 * 2.5 s for `low` (the default), stopping the moment it turns false or the component leaves.
 * Browsers only allow sound after the user has interacted with the page; until then the ring waits silently and starts
 * at their next click or key. Nothing happens where Web Audio isn't available (the server, old browsers).
 */
function useRingtone(active: boolean, urgency: RingUrgency = "low") {
	const every = ringCadence[urgency];
	const tempo = ringTempo[urgency];
	React.useEffect(() => {
		if (!active || typeof window === "undefined") return;
		const Context: AudioContextConstructor | undefined =
			window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
		if (!Context) return;
		let context: AudioContext;
		try {
			context = new Context();
		} catch {
			return;
		}
		const resume = () => {
			if (context.state === "suspended") void context.resume().catch(() => {});
		};
		const ring = () => {
			resume();
			// A ring scheduled while the browser still blocks sound would play late, all at once: skip it instead.
			if (context.state === "running") ringOnce(context, tempo);
		};
		// The first ring as soon as sound is allowed: now, or at the user's next click or key.
		const unlock = () => {
			if (context.state !== "suspended") return;
			void context
				.resume()
				.then(() => ringOnce(context, tempo))
				.catch(() => {});
		};
		window.addEventListener("pointerdown", unlock, { once: true });
		window.addEventListener("keydown", unlock, { once: true });
		ring();
		const timer = window.setInterval(ring, every);
		return () => {
			window.clearInterval(timer);
			window.removeEventListener("pointerdown", unlock);
			window.removeEventListener("keydown", unlock);
			void context.close().catch(() => {});
		};
	}, [active, every, tempo]);
}

export { ringCadence, useRingtone, type RingUrgency };
