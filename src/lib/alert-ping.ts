// A new alert's sound (Nov 4, 2026, user's call: "when a new alert is triggered, let's have audio, just a ping for
// now"): one short, bright note, synthesized with Web Audio, no file. Browsers allow sound only once the user has
// interacted with the page; before that the ping is skipped, never queued, so a burst of stale pings can't play later.

/** The ping: E6, a quick attack and a 0.6 s decay, quiet beside the toast it comes with. */
const PING = { frequency: 1318.51, length: 0.6, volume: 0.1 };

// One ping, whatever the alert's severity (Nov 4, 2026, user's call: "audio should play once"; it was 1 to 5 pings by
// severity, Low to Critical).

type AudioContextConstructor = typeof AudioContext;

// The pings still sounding, so muting can cut them short (`stopAlertPing`).
const sounding = new Set<OscillatorNode>();

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

/** Plays the alert ping once, if the page may play sound. */
function playAlertPing() {
	// Without a click or key on the page yet, the browser would hold the sound and play it late: skip it.
	const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
	if (activation && !activation.hasBeenActive) return;
	const context = pingContext();
	if (!context) return;
	const play = () => {
		const now = context.currentTime + 0.01;
		const oscillator = context.createOscillator();
		const gain = context.createGain();
		oscillator.frequency.value = PING.frequency;
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(PING.volume, now + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + PING.length);
		oscillator.connect(gain).connect(context.destination);
		oscillator.start(now);
		oscillator.stop(now + PING.length + 0.05);
		sounding.add(oscillator);
		oscillator.onended = () => sounding.delete(oscillator);
	};
	if (context.state === "running") play();
	else void context.resume().then(play).catch(() => {});
}

/** Cuts short any ping still sounding (Nov 4, 2026, user's call: Don't show stops alert sounds). */
function stopAlertPing() {
	for (const oscillator of sounding) {
		try {
			oscillator.stop();
		} catch {
			// Already stopped.
		}
	}
	sounding.clear();
}

export { playAlertPing, stopAlertPing };
