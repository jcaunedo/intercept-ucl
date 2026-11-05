// A new alert's sound (Nov 4, 2026, user's call: "when a new alert is triggered, let's have audio, just a ping for
// now"): one short, bright note, synthesized with Web Audio, no file. Browsers allow sound only once the user has
// interacted with the page; before that the ping is skipped, never queued, so a burst of stale pings can't play later.

/** The ping: E6, a quick attack and a 0.6 s decay, quiet beside the toast it comes with. */
const PING = { frequency: 1318.51, length: 0.6, volume: 0.1 };

/** How urgent the alert is, which sets how many pings (PING_COUNTS). */
type PingSeverity = "critical" | "high" | "medium" | "low";

/**
 * How many pings, by severity (Nov 4, 2026, user's call): the more severe, the more, so severity is heard before it's
 * read. Several pings come fast, 0.14 s apart, each cut short (0.2 s) so they stay distinct; the last rings out.
 */
const PING_COUNTS: Record<PingSeverity, number> = { low: 1, medium: 2, high: 3, critical: 5 };
const PING_SPACING = 0.14;
const SHORT_PING = 0.2;

type AudioContextConstructor = typeof AudioContext;

let shared: AudioContext | null = null;

function pingContext(): AudioContext | null {
	if (typeof window === "undefined") return null;
	if (!shared) {
		const Context: AudioContextConstructor | undefined =
			window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
		if (!Context) return null;
		try {
			shared = new Context();
		} catch {
			return null;
		}
	}
	return shared;
}

/** Plays the alert ping for `severity` (one for Low … five for Critical), if the page may play sound. */
function playAlertPing(severity: PingSeverity = "low") {
	// Without a click or key on the page yet, the browser would hold the sound and play it late: skip it.
	const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
	if (activation && !activation.hasBeenActive) return;
	const context = pingContext();
	if (!context) return;
	const play = () => {
		const count = PING_COUNTS[severity];
		for (let index = 0; index < count; index++) {
			const now = context.currentTime + 0.01 + index * PING_SPACING;
			const length = index === count - 1 ? PING.length : SHORT_PING;
			const oscillator = context.createOscillator();
			const gain = context.createGain();
			oscillator.frequency.value = PING.frequency;
			gain.gain.setValueAtTime(0, now);
			gain.gain.linearRampToValueAtTime(PING.volume, now + 0.01);
			gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
			oscillator.connect(gain).connect(context.destination);
			oscillator.start(now);
			oscillator.stop(now + length + 0.05);
		}
	};
	if (context.state === "running") play();
	else void context.resume().then(play).catch(() => {});
}

export { playAlertPing, type PingSeverity };
