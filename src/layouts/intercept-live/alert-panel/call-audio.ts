import * as React from "react";

// The video consult's sound (Nov 4, 2026, user's call: "create some audio to the call to make it more realistic"). The
// bedside clip has no sound, so it's all synthesized with Web Audio, no files: a ringback while it calls the bedside, a
// chime when the nurse joins, the room while it's on (the monitor beeping at the patient's heart rate, its pitch falling
// with SpO₂ as bedside monitors do, and the BiPAP's hiss breathing at their respiratory rate), a crackle and a falling
// tone when the connection drops, the room band-limited like a phone line while audio only, and a falling tone at the end.
// Mute silences it. Browsers allow sound only after a click or key; the call always starts from one.

/* -------------------------------------------------------------------------- */
/* Sound design                                                               */
/* -------------------------------------------------------------------------- */

/** The ringback heard while calling the bedside: the North American dual tone, 2 s on, 2 s off. */
const RINGBACK = { frequencies: [440, 480], on: 2, every: 4000, volume: 0.04 };
/** The nurse joined: two rising notes (C5, G5). The call ended: two falling ones (E5, A4). */
const JOIN_NOTES = [
	{ frequency: 523.25, start: 0, length: 0.18 },
	{ frequency: 783.99, start: 0.12, length: 0.32 },
];
const END_NOTES = [
	{ frequency: 659.25, start: 0, length: 0.18 },
	{ frequency: 440, start: 0.14, length: 0.38 },
];
const CHIME_VOLUME = 0.08;
/** The monitor's beep, once per heartbeat: its pitch by SpO₂ (lower as it falls), clamped to a monitor's range. */
const BEEP = { length: 0.07, volume: 0.035, atSpo2: (spo2: number) => Math.min(1000, Math.max(560, 700 + (spo2 - 85) * 15)) };
/** The BiPAP's hiss: band-passed noise that swells with each breath. */
const HISS = { frequency: 900, q: 0.7, base: 0.016, swell: 0.012 };
/** Audio only: the room as a phone line hears it (300 to 3000 Hz). */
const PHONE_BAND = { low: 300, high: 3000 };
const FULL_BAND = { low: 20, high: 16000 };

/* -------------------------------------------------------------------------- */
/* Web Audio                                                                  */
/* -------------------------------------------------------------------------- */

type AudioContextConstructor = typeof AudioContext;

// One context for every call, so the end tone still plays after the call's tile is gone.
let shared: AudioContext | null = null;

function audioContext(): AudioContext | null {
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
	if (shared.state === "suspended") void shared.resume().catch(() => {});
	return shared;
}

type Note = { frequency: number; start: number; length: number };

/** Plays notes into `destination` (the speakers by default), with a quick attack and a bell-like decay. */
function playNotes(context: AudioContext, notes: Note[], volume: number, destination: AudioNode = context.destination) {
	const now = context.currentTime + 0.01;
	for (const note of notes) {
		const oscillator = context.createOscillator();
		const gain = context.createGain();
		oscillator.frequency.value = note.frequency;
		gain.gain.setValueAtTime(0, now + note.start);
		gain.gain.linearRampToValueAtTime(volume, now + note.start + 0.015);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.length);
		oscillator.connect(gain).connect(destination);
		oscillator.start(now + note.start);
		oscillator.stop(now + note.start + note.length + 0.05);
	}
}

/** Two seconds of white noise, looped for the hiss and cut into bursts for the crackle. */
function noiseBuffer(context: AudioContext) {
	const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
	const samples = buffer.getChannelData(0);
	for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
	return buffer;
}

/** The connection dropping: three short crackles and a tone falling an octave and more. */
function playDrop(context: AudioContext) {
	const now = context.currentTime + 0.01;
	const buffer = noiseBuffer(context);
	for (const at of [0, 0.13, 0.31]) {
		const burst = context.createBufferSource();
		const filter = context.createBiquadFilter();
		const gain = context.createGain();
		burst.buffer = buffer;
		filter.type = "highpass";
		filter.frequency.value = 1500;
		gain.gain.setValueAtTime(0.05, now + at);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.05);
		burst.connect(filter).connect(gain).connect(context.destination);
		burst.start(now + at, Math.random());
		burst.stop(now + at + 0.06);
	}
	const oscillator = context.createOscillator();
	const gain = context.createGain();
	oscillator.frequency.setValueAtTime(620, now);
	oscillator.frequency.exponentialRampToValueAtTime(260, now + 0.5);
	gain.gain.setValueAtTime(0.05, now);
	gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
	oscillator.connect(gain).connect(context.destination);
	oscillator.start(now);
	oscillator.stop(now + 0.6);
}

/* -------------------------------------------------------------------------- */
/* useCallAudio                                                               */
/* -------------------------------------------------------------------------- */

type CallAudio = {
	/** The call: not started, calling the bedside, or on. */
	state: "idle" | "connecting" | "live";
	/** The picture is frozen while the connection drops: the room cuts out, with the drop's crackle. */
	freezing: boolean;
	/** Audio only (low bandwidth): the room band-limited, like a phone line. */
	audioOnly: boolean;
	/** The patient's live values, for the monitor's beep and the BiPAP's breathing. */
	heartRate?: number;
	spo2?: number;
	respiratoryRate?: number;
	/** Silences the call's sound. */
	muted: boolean;
};

/** The call's sound, from its state (see the top of this file). Everything stops when the call ends or the tile goes. */
function useCallAudio({ state, freezing, audioOnly, heartRate, spo2, respiratoryRate, muted }: CallAudio) {
	// The latest values, read by the heartbeat as it goes, so a new reading doesn't restart it.
	const vitals = React.useRef({ heartRate, spo2, respiratoryRate });
	vitals.current = { heartRate, spo2, respiratoryRate };
	// The room's chain: every room sound goes through the band (full, or a phone line) and the mute.
	const chain = React.useRef<{ input: BiquadFilterNode; low: BiquadFilterNode; output: GainNode } | null>(null);
	const getChain = React.useCallback(() => {
		if (chain.current) return chain.current;
		const context = audioContext();
		if (!context) return null;
		const input = context.createBiquadFilter();
		const low = context.createBiquadFilter();
		const output = context.createGain();
		input.type = "highpass";
		input.frequency.value = FULL_BAND.low;
		low.type = "lowpass";
		low.frequency.value = FULL_BAND.high;
		input.connect(low).connect(output).connect(context.destination);
		chain.current = { input, low, output };
		return chain.current;
	}, []);
	React.useEffect(
		() => () => {
			chain.current?.output.disconnect();
			chain.current = null;
		},
		[],
	);

	// Ringback while it calls the bedside.
	React.useEffect(() => {
		if (state !== "connecting") return;
		const context = audioContext();
		if (!context) return;
		const playing: OscillatorNode[] = [];
		const ring = () => {
			const now = context.currentTime + 0.01;
			for (const frequency of RINGBACK.frequencies) {
				const oscillator = context.createOscillator();
				const gain = context.createGain();
				oscillator.frequency.value = frequency;
				gain.gain.setValueAtTime(0, now);
				gain.gain.linearRampToValueAtTime(RINGBACK.volume, now + 0.03);
				gain.gain.setValueAtTime(RINGBACK.volume, now + RINGBACK.on - 0.03);
				gain.gain.linearRampToValueAtTime(0, now + RINGBACK.on);
				oscillator.connect(gain).connect(context.destination);
				oscillator.start(now);
				oscillator.stop(now + RINGBACK.on + 0.05);
				playing.push(oscillator);
			}
		};
		ring();
		const timer = window.setInterval(ring, RINGBACK.every);
		return () => {
			window.clearInterval(timer);
			for (const oscillator of playing) {
				try {
					oscillator.stop();
				} catch {
					// Already stopped.
				}
			}
		};
	}, [state]);

	// The chime when the nurse joins, and the falling tone when the call ends, here or by the tile leaving mid-call.
	const previous = React.useRef<CallAudio["state"]>("idle");
	React.useEffect(() => {
		const context = audioContext();
		if (context && state === "live" && previous.current !== "live") playNotes(context, JOIN_NOTES, CHIME_VOLUME);
		if (context && state === "idle" && previous.current !== "idle") playNotes(context, END_NOTES, CHIME_VOLUME);
		previous.current = state;
	}, [state]);
	React.useEffect(
		() => () => {
			const context = shared;
			if (context && previous.current !== "idle") playNotes(context, END_NOTES, CHIME_VOLUME);
		},
		[],
	);

	// The room while it's on: the monitor's beep at each heartbeat and the BiPAP's hiss. Cut while the picture freezes.
	const roomOn = state === "live" && !freezing;
	React.useEffect(() => {
		if (!roomOn) return;
		const context = audioContext();
		const room = getChain();
		if (!context || !room) return;
		let timer = 0;
		const beat = () => {
			const { heartRate: rate, spo2: saturation } = vitals.current;
			if (rate && rate > 0) {
				playNotes(
					context,
					[{ frequency: BEEP.atSpo2(saturation ?? 97), start: 0, length: BEEP.length }],
					BEEP.volume,
					room.input,
				);
			}
			timer = window.setTimeout(beat, 60_000 / (rate && rate > 0 ? rate : 60));
		};
		beat();
		// The hiss, swelling once per breath.
		const hiss = context.createBufferSource();
		const band = context.createBiquadFilter();
		const level = context.createGain();
		const breath = context.createOscillator();
		const swell = context.createGain();
		hiss.buffer = noiseBuffer(context);
		hiss.loop = true;
		band.type = "bandpass";
		band.frequency.value = HISS.frequency;
		band.Q.value = HISS.q;
		level.gain.value = HISS.base;
		breath.frequency.value = (vitals.current.respiratoryRate ?? 16) / 60;
		swell.gain.value = HISS.swell;
		breath.connect(swell).connect(level.gain);
		hiss.connect(band).connect(level).connect(room.input);
		hiss.start();
		breath.start();
		return () => {
			window.clearTimeout(timer);
			hiss.stop();
			breath.stop();
			level.disconnect();
		};
	}, [roomOn, getChain]);

	// The drop's crackle and falling tone, as the picture freezes.
	React.useEffect(() => {
		if (!freezing || state !== "live") return;
		const context = audioContext();
		if (context) playDrop(context);
	}, [freezing, state]);

	// Audio only: the room through a phone line's band.
	React.useEffect(() => {
		const room = getChain();
		const context = shared;
		if (!room || !context) return;
		const band = audioOnly ? PHONE_BAND : FULL_BAND;
		room.input.frequency.setTargetAtTime(band.low, context.currentTime, 0.1);
		room.low.frequency.setTargetAtTime(band.high, context.currentTime, 0.1);
	}, [audioOnly, getChain]);

	// Mute: the room fades out and back.
	React.useEffect(() => {
		const room = getChain();
		const context = shared;
		if (!room || !context) return;
		room.output.gain.setTargetAtTime(muted ? 0 : 1, context.currentTime, 0.05);
	}, [muted, getChain]);
}

export { useCallAudio };
