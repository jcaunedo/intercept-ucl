import * as React from "react";
import { MicOffIcon, PauseIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { fadeVariants } from "@/lib/motion";
import { useSessionState } from "./consult-session";
import { cn } from "@/lib/utils";

// The AI Notetaker's live transcript (Nov 5, 2026, user's call: "simulate transcription from video audio … similar to
// what Whisper does", then "transcribe and add if I say something"). While the notetaker records, the consult's
// conversation streams in as speech recognition writes it: speaker turns with their time into the recording, words
// arriving at speaking pace, the newest words still settling (muted) and a misheard word corrected once its segment
// ends. In the prototype the bedside's side comes from `ConsultTranscript` (sample data); the clinician's own words come
// from their microphone, through the browser's speech recognition, and join the transcript as You. The app replaces
// both with its transcription service's segments.

/* -------------------------------------------------------------------------- */
/* Data shapes                                                                */
/* -------------------------------------------------------------------------- */

/** Someone on the consult: the bedside nurse, a family member, the clinician (`you`). */
type ConsultTranscriptSpeaker = {
	id: string;
	/** As the transcript labels them, "Kelly Ortiz, RN", "Mark Miller, husband". The clinician shows as You. */
	name: string;
	you?: boolean;
};

/** One segment, as speech recognition returns it: a sentence or two from one speaker. */
type ConsultTranscriptSegment = {
	speaker: string;
	/** The final text. */
	text: string;
	/**
	 * What recognition first writes while the segment is spoken, when it mishears a word (e.g. "cefa pine" for
	 * "cefepime"); it settles to `text` once the segment ends.
	 */
	heard?: string;
	/** Seconds of silence before it. By default 0.5, or 1 when the speaker changes. */
	pause?: number;
};

type ConsultTranscript = {
	speakers: ConsultTranscriptSpeaker[];
	segments: ConsultTranscriptSegment[];
};

/* -------------------------------------------------------------------------- */
/* Timing                                                                     */
/* -------------------------------------------------------------------------- */

// Conversational speech, about 160 words a minute.
const WORDS_PER_SECOND = 2.7;
// The recording's first words come after a beat, as the room settles.
const LEAD_IN_S = 1.2;
const TICK_MS = 100;
// The newest words of a segment still being spoken, shown muted: recognition may still change them.
const UNSTABLE_WORDS = 2;

type TimedSegment = ConsultTranscriptSegment & { start: number; end: number; words: string[] };

/** Each segment's start and end in the script's seconds, from its length in words. */
function timeline(segments: ConsultTranscriptSegment[]): TimedSegment[] {
	let t = LEAD_IN_S;
	return segments.map((segment, index) => {
		const changed = index > 0 && segments[index - 1].speaker !== segment.speaker;
		const start = t + (index === 0 ? 0 : (segment.pause ?? (changed ? 1 : 0.5)));
		const words = (segment.heard ?? segment.text).split(/\s+/).filter(Boolean);
		const end = start + Math.max(1.2, words.length / WORDS_PER_SECOND);
		t = end;
		return { ...segment, start, end, words };
	});
}

/** "00:42", as Whisper stamps a segment. */
function stamp(ms: number) {
	const seconds = Math.max(0, Math.floor(ms / 1000));
	return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

/* -------------------------------------------------------------------------- */
/* The clinician's microphone                                                 */
/* -------------------------------------------------------------------------- */

// The Web Speech API isn't in TypeScript's DOM types; only what this file uses.
type RecognitionResultList = ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
type RecognitionEvent = { resultIndex: number; results: RecognitionResultList };
type Recognition = {
	continuous: boolean;
	interimResults: boolean;
	lang: string;
	onresult: ((event: RecognitionEvent) => void) | null;
	onerror: ((event: { error: string }) => void) | null;
	onend: (() => void) | null;
	start: () => void;
	abort: () => void;
};
type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | undefined {
	if (typeof window === "undefined") return undefined;
	const speech = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
	return speech.SpeechRecognition ?? speech.webkitSpeechRecognition;
}

type MicStatus = "listening" | "muted" | "unsupported" | "denied" | "off";

/**
 * Transcribes the clinician's microphone while `active`: what they're saying now (`interim`, recognition's guess) and
 * each finished phrase (`onFinal`). Recognition stops itself after a silence; it restarts while still active. Muted or
 * not active, nothing is listened to.
 */
function useMicTranscript(active: boolean, muted: boolean, onFinal: (text: string) => void) {
	const [interim, setInterim] = React.useState("");
	const [failure, setFailure] = React.useState<"denied" | "unavailable" | null>(null);
	const supported = recognitionConstructor() !== undefined;
	const finalRef = React.useRef(onFinal);
	finalRef.current = onFinal;
	const listening = active && !muted && supported && !failure;

	React.useEffect(() => {
		const Constructor = recognitionConstructor();
		if (!listening || !Constructor) return;
		let stopped = false;
		let pending = "";
		const recognition = new Constructor();
		recognition.continuous = true;
		recognition.interimResults = true;
		recognition.lang = "en-US";
		recognition.onresult = (event) => {
			let guess = "";
			for (let index = event.resultIndex; index < event.results.length; index++) {
				const result = event.results[index];
				const text = result[0]?.transcript.trim() ?? "";
				if (!text) continue;
				if (result.isFinal) finalRef.current(text);
				else guess += `${guess ? " " : ""}${text}`;
			}
			pending = guess;
			setInterim(guess);
		};
		recognition.onerror = (event) => {
			// A silence or an abort is routine; recognition ends and starts again. Anything else stops it for this recording.
			if (event.error === "no-speech" || event.error === "aborted") return;
			stopped = true;
			setFailure(event.error === "not-allowed" || event.error === "service-not-allowed" ? "denied" : "unavailable");
		};
		let restart: number | undefined;
		recognition.onend = () => {
			if (stopped) return;
			restart = window.setTimeout(() => {
				try {
					recognition.start();
				} catch {
					// Already started.
				}
			}, 250);
		};
		try {
			recognition.start();
		} catch {
			// A second start in the same tick.
		}
		return () => {
			stopped = true;
			window.clearTimeout(restart);
			recognition.onresult = null;
			recognition.onend = null;
			recognition.onerror = null;
			recognition.abort();
			// What was being said when it stopped is kept as it was heard.
			if (pending) finalRef.current(pending);
			setInterim("");
		};
	}, [listening]);

	const status: MicStatus = !active
		? "off"
		: !supported || failure === "unavailable"
			? "unsupported"
			: failure === "denied"
				? "denied"
				: muted
					? "muted"
					: "listening";
	return { interim: listening ? interim : "", status };
}

const micNotes: Partial<Record<MicStatus, string>> = {
	muted: "You're muted. What you say isn't captured.",
	unsupported: "Your microphone can't be transcribed in this browser.",
	denied: "Allow the microphone to add what you say.",
};

/* -------------------------------------------------------------------------- */
/* The transcript                                                             */
/* -------------------------------------------------------------------------- */

/** Capturing, stopped by the clinician for now (the call goes on, uncaptured), or done (the notes are being prepared). */
type ConsultTranscriptStatus = "capturing" | "paused" | "stopped";

type Clock = {
	/** The consult's time since the notetaker first started, ms: what the transcript's stamps count. */
	rec: number;
	/** The script's time, ms: it waits while the clinician speaks between segments, and runs on while paused. */
	script: number;
	/** The consult's time at which each scripted segment started, in order; `null` when it started while paused. */
	started: (number | null)[];
	/** The script's time at which a segment in progress stopped being captured, by index. */
	cut: Record<number, number>;
	/** Each stretch the notetaker was stopped for, in the consult's time; `to` is missing while it still is. */
	pauses: { from: number; to?: number }[];
};

type Line = {
	key: string;
	speaker: string;
	at: number;
	/** Settled words. */
	text: string;
	/** Words still being heard, muted. */
	pending?: string;
};

/** A line, or the mark where the notetaker was stopped. */
type Item = Line | { key: string; pause: { from: number; to?: number }; at: number };

/** Cuts every segment in progress at the script's current time: what was heard of it is what's kept. */
function cutInProgress(clock: Clock, timed: TimedSegment[]): Record<number, number> {
	const t = clock.script / 1000;
	const cut = { ...clock.cut };
	clock.started.forEach((at, index) => {
		if (at !== null && cut[index] === undefined && t < timed[index].end) cut[index] = t;
	});
	return cut;
}

/**
 * The live transcript under the notetaker's state line: speaker turns, each with its time into the consult, the newest
 * at the bottom, scrolling itself to follow unless the clinician scrolled up. `status`: `capturing` streams the
 * conversation in; `paused` (the clinician's Stop) leaves the call going on uncaptured, and Resume picks it up again with
 * a mark for the gap; `stopped` keeps what was captured.
 */
function ConsultTranscriptView({
	transcript,
	status,
	muted = false,
	className,
}: {
	transcript?: ConsultTranscript;
	status: ConsultTranscriptStatus;
	/** The call's microphone is muted: the clinician's words aren't captured. */
	muted?: boolean;
	className?: string;
}) {
	const timed = React.useMemo(() => timeline(transcript?.segments ?? []), [transcript]);
	const speakers = transcript?.speakers ?? [];
	const you = speakers.find((speaker) => speaker.you)?.id ?? "you";
	const nameOf = (id: string) => (id === you ? "You" : (speakers.find((speaker) => speaker.id === id)?.name ?? "Speaker"));
	const capturing = status === "capturing";

	// In the patient's consult session, so the transcript goes on where the call does (the patient's page).
	const [clock, setClock] = useSessionState<Clock>("transcriptClock", { rec: 0, script: 0, started: [], cut: {}, pauses: [] });
	const clockRef = React.useRef(clock);
	clockRef.current = clock;

	// The clinician's words, at the consult's time they started.
	const [spoken, setSpoken] = useSessionState<{ at: number; text: string }[]>("transcriptSpoken", []);
	const interimAt = React.useRef<number | null>(null);
	const { interim, status: micStatus } = useMicTranscript(capturing, muted, (text) => {
		const at = interimAt.current ?? clockRef.current.rec;
		interimAt.current = null;
		setSpoken((current) => [...current, { at, text }]);
	});
	// The clinician's phrase is stamped when they started it; a guess dropped without a final result starts over.
	if (interim && interimAt.current === null) interimAt.current = clock.rec;
	else if (!interim) interimAt.current = null;
	const speaking = React.useRef(false);
	speaking.current = Boolean(interim);

	// Stopping cuts the sentences in progress and, for a pause, opens a gap; resuming closes it.
	const previous = React.useRef(status);
	React.useEffect(() => {
		const from = previous.current;
		previous.current = status;
		if (from === status) return;
		setClock((current) => {
			if (status === "capturing") {
				const pauses = current.pauses.map((pause) => (pause.to === undefined ? { ...pause, to: current.rec } : pause));
				return { ...current, pauses };
			}
			if (from !== "capturing") return current;
			const cut = cutInProgress(current, timed);
			return status === "paused" ? { ...current, cut, pauses: [...current.pauses, { from: current.rec }] } : { ...current, cut };
		});
	}, [status, timed]);

	// The consult's clock runs while the notetaker captures or is paused: the call goes on either way.
	React.useEffect(() => {
		if (status === "stopped") return;
		let last = performance.now();
		const timer = window.setInterval(() => {
			const now = performance.now();
			const dt = now - last;
			last = now;
			setClock((current) => {
				const rec = current.rec + dt;
				const t = current.script / 1000;
				// The bedside finishes a sentence it started, then waits while the clinician speaks.
				const midSegment = timed.some((segment) => segment.start <= t && t < segment.end);
				const script = capturing && speaking.current && !midSegment ? current.script : current.script + dt;
				const started = [...current.started];
				while (started.length < timed.length && timed[started.length].start * 1000 <= script)
					started.push(capturing ? rec - (script - timed[started.length].start * 1000) : null);
				return { ...current, rec, script, started };
			});
		}, TICK_MS);
		return () => window.clearInterval(timer);
	}, [status, capturing, timed]);

	// Every line in the consult's order: the scripted segments captured so far, the clinician's, what they're saying now,
	// and a mark for each stretch the notetaker was stopped.
	const items: Item[] = [
		...clock.started.flatMap((at, index): Line[] => {
			if (at === null) return [];
			const segment = timed[index];
			const cutAt = clock.cut[index];
			const t = Math.min(clock.script / 1000, cutAt ?? Infinity);
			if (t >= segment.end) return [{ key: `s${index}`, speaker: segment.speaker, at, text: segment.text }];
			const shown = Math.min(
				segment.words.length,
				Math.max(1, Math.ceil(((t - segment.start) / (segment.end - segment.start)) * segment.words.length)),
			);
			const words = segment.words.slice(0, shown);
			// Cut mid-segment: what was heard is what's kept.
			if (cutAt !== undefined) return [{ key: `s${index}`, speaker: segment.speaker, at, text: `${words.join(" ")}…` }];
			const settled = Math.max(0, words.length - UNSTABLE_WORDS);
			return [
				{
					key: `s${index}`,
					speaker: segment.speaker,
					at,
					text: words.slice(0, settled).join(" "),
					pending: words.slice(settled).join(" "),
				},
			];
		}),
		...spoken.map((line, index): Line => ({ key: `y${index}`, speaker: you, at: line.at, text: line.text })),
		...(interim ? [{ key: "y-now", speaker: you, at: interimAt.current ?? clock.rec, text: "", pending: interim }] : []),
		...clock.pauses.map((pause, index): Item => ({ key: `p${index}`, pause, at: pause.from })),
	].sort((a, b) => a.at - b.at);
	const lines = items.filter((item): item is Line => !("pause" in item));

	// One turn per speaker until someone else speaks or the notetaker was stopped.
	type Turn = { key: string; speaker: string; at: number; lines: Line[] };
	const turns: (Turn | Extract<Item, { pause: unknown }>)[] = [];
	for (const item of items) {
		if ("pause" in item) {
			turns.push(item);
			continue;
		}
		const turn = turns.at(-1);
		if (turn && "lines" in turn && turn.speaker === item.speaker) turn.lines.push(item);
		else turns.push({ key: item.key, speaker: item.speaker, at: item.at, lines: [item] });
	}

	// Follows the newest words, unless the clinician scrolled up to read.
	const scroller = React.useRef<HTMLDivElement>(null);
	const following = React.useRef(true);
	const content = `${lines.map((line) => `${line.text}${line.pending ?? ""}`).join("|")}#${clock.pauses.length}`;
	React.useLayoutEffect(() => {
		const element = scroller.current;
		if (element && following.current) element.scrollTop = element.scrollHeight;
	}, [content]);

	const micNote = micNotes[micStatus];
	return (
		<div className={cn("flex min-h-40 flex-1 flex-col gap-2", className)}>
			<div
				ref={scroller}
				role='log'
				aria-label='Live transcript'
				// Read on demand, not word by word as it streams.
				aria-live='off'
				tabIndex={0}
				onScroll={(event) => {
					const element = event.currentTarget;
					following.current = element.scrollHeight - element.scrollTop - element.clientHeight < 24;
				}}
				className='min-h-0 flex-1 overflow-y-auto rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
			>
				{turns.length === 0 ? (
					<p className='text-sm text-muted-foreground'>{status === "stopped" ? "Nothing was captured." : "Listening…"}</p>
				) : (
					<ol className='flex flex-col gap-4'>
						<AnimatePresence initial={false}>
							{turns.map((turn) =>
								"pause" in turn ? (
									<motion.li
										key={turn.key}
										variants={fadeVariants}
										initial='initial'
										animate='animate'
										className='flex items-center gap-2 text-xs text-muted-foreground'
									>
										<span aria-hidden='true' className='h-px flex-1 bg-border' />
										<PauseIcon aria-hidden='true' className='size-3.5' />
										<span className='font-mono tabular-nums'>
											{turn.pause.to === undefined
												? `Stopped at ${stamp(turn.pause.from)}`
												: `Not captured · ${stamp(turn.pause.from)}–${stamp(turn.pause.to)}`}
										</span>
										<span aria-hidden='true' className='h-px flex-1 bg-border' />
									</motion.li>
								) : (
									<motion.li
										key={turn.key}
										variants={fadeVariants}
										initial='initial'
										animate='animate'
										className='flex flex-col gap-1'
									>
										<p className='flex items-baseline gap-2 text-xs'>
											<span className='font-semibold text-foreground'>{nameOf(turn.speaker)}</span>
											<span className='font-mono text-muted-foreground tabular-nums'>{stamp(turn.at)}</span>
										</p>
										<p className='text-sm text-foreground'>
											{turn.lines.map((line, index) => (
												<React.Fragment key={line.key}>
													{index > 0 ? " " : null}
													{line.text}
													{line.pending ? (
														<span className='text-muted-foreground'>
															{line.text ? " " : null}
															{line.pending}
														</span>
													) : null}
												</React.Fragment>
											))}
										</p>
									</motion.li>
								),
							)}
						</AnimatePresence>
					</ol>
				)}
			</div>
			{capturing && micNote ? (
				<p className='flex items-center gap-1.5 text-xs text-muted-foreground'>
					<MicOffIcon aria-hidden='true' className='size-3.5' />
					{micNote}
				</p>
			) : null}
		</div>
	);
}

export {
	ConsultTranscriptView,
	type ConsultTranscript,
	type ConsultTranscriptSegment,
	type ConsultTranscriptSpeaker,
	type ConsultTranscriptStatus,
};
