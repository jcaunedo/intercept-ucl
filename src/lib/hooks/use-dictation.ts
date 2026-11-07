import * as React from "react";

// The Web Speech API isn't in TypeScript's DOM types; only what UCL uses.
type SpeechRecognitionResultList = ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
type SpeechRecognitionEvent = { resultIndex: number; results: SpeechRecognitionResultList };
type SpeechRecognitionLike = {
	continuous: boolean;
	interimResults: boolean;
	lang: string;
	onresult: ((event: SpeechRecognitionEvent) => void) | null;
	onerror: ((event: { error: string }) => void) | null;
	onend: (() => void) | null;
	start: () => void;
	abort: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

/** The browser's speech recognition (Chrome, Edge and Safari name it `webkitSpeechRecognition`), if it has one. */
function speechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
	if (typeof window === "undefined") return undefined;
	const speech = window as unknown as {
		SpeechRecognition?: SpeechRecognitionConstructor;
		webkitSpeechRecognition?: SpeechRecognitionConstructor;
	};
	return speech.SpeechRecognition ?? speech.webkitSpeechRecognition;
}

const noSubscription = () => () => {};

/** Why dictation stopped on its own: the microphone isn't allowed, or recognition failed (no network, no device…). */
type DictationError = "denied" | "unavailable";

/** What's been heard since dictation started: the finished phrases, and recognition's guess at what's being said now. */
type DictationHeard = { final: string; interim: string };

/**
 * Speech to text from the microphone, with the browser's speech recognition. `start()` listens until `stop()`, an error,
 * or unmount; recognition ends itself after a silence and is restarted while listening. `onHeard` gets everything heard
 * since `start()`, each time it changes. `supported` is false on the server and in browsers without recognition
 * (Firefox).
 */
function useDictation({ onHeard, lang = "en-US" }: { onHeard: (heard: DictationHeard) => void; lang?: string }) {
	const supported = React.useSyncExternalStore(
		noSubscription,
		() => speechRecognitionConstructor() !== undefined,
		() => false,
	);
	const [listening, setListening] = React.useState(false);
	const [error, setError] = React.useState<DictationError | null>(null);
	const heardRef = React.useRef(onHeard);
	heardRef.current = onHeard;
	// Off the moment `stop()` is called, so a result already queued before recognition is torn down isn't delivered
	// (it would rewrite the field after dictation ended).
	const activeRef = React.useRef(false);
	// Set by the running recognition: forgets what's been heard so far, without stopping.
	const resetRef = React.useRef<(() => void) | null>(null);

	React.useEffect(() => {
		const Constructor = speechRecognitionConstructor();
		if (!listening || !Constructor) return;
		let stopped = false;
		let restart: number | undefined;
		// Finished phrases from earlier runs (recognition restarts after a silence), then this run's. `skip`: this run's
		// results heard before a reset, left out (`seen`: how many it had).
		let committed = "";
		let runFinal = "";
		let skip = 0;
		let seen = 0;
		resetRef.current = () => {
			committed = "";
			runFinal = "";
			skip = seen;
		};
		const join = (...parts: string[]) => parts.filter(Boolean).join(" ");
		const recognition = new Constructor();
		recognition.continuous = true;
		recognition.interimResults = true;
		recognition.lang = lang;
		recognition.onresult = (event) => {
			if (!activeRef.current) return;
			let final = "";
			let interim = "";
			seen = event.results.length;
			for (let index = skip; index < event.results.length; index++) {
				const result = event.results[index];
				const text = result[0]?.transcript.trim() ?? "";
				if (result.isFinal) final = join(final, text);
				else interim = join(interim, text);
			}
			runFinal = final;
			heardRef.current({ final: join(committed, runFinal), interim });
		};
		recognition.onerror = (event) => {
			// A silence or an abort is routine: recognition ends and starts again. Anything else stops dictation.
			if (event.error === "no-speech" || event.error === "aborted") return;
			stopped = true;
			activeRef.current = false;
			setError(event.error === "not-allowed" || event.error === "service-not-allowed" ? "denied" : "unavailable");
			setListening(false);
		};
		recognition.onend = () => {
			if (stopped) return;
			committed = join(committed, runFinal);
			runFinal = "";
			skip = 0;
			seen = 0;
			// At once (the next task): words said while it's down are lost, so a pause before speaking mustn't cost the
			// first ones. Not in this handler itself, where Chrome may still count it as started.
			restart = window.setTimeout(() => {
				try {
					recognition.start();
				} catch {
					// Already started.
				}
			}, 0);
		};
		try {
			recognition.start();
		} catch {
			// A second start in the same tick.
		}
		return () => {
			stopped = true;
			resetRef.current = null;
			window.clearTimeout(restart);
			recognition.onresult = null;
			recognition.onend = null;
			recognition.onerror = null;
			recognition.abort();
		};
	}, [listening, lang]);

	const start = React.useCallback(() => {
		activeRef.current = true;
		setError(null);
		setListening(true);
	}, []);
	const stop = React.useCallback(() => {
		activeRef.current = false;
		setListening(false);
	}, []);
	/** Forgets the last error, e.g. once the user has moved on (typed, or sent). */
	const clearError = React.useCallback(() => setError(null), []);
	/**
	 * Forgets what's been heard so far and goes on listening: `onHeard` then starts from what's said next (e.g. once a
	 * message is sent, or the user typed over it).
	 */
	const reset = React.useCallback(() => resetRef.current?.(), []);

	return { supported, listening: listening && supported, error, start, stop, clearError, reset };
}

/**
 * The microphone's loudness while `active`, 0 to 1, for a meter that answers the voice at once (recognition's words come
 * about a second later). Calls `onLevel` every animation frame, outside React's render, so a component can write it
 * straight to a style; 0 when it stops. Opens its own microphone stream, beside recognition's, and closes it after. Does
 * nothing where there's no microphone access.
 */
function useMicLevel(active: boolean, onLevel: (level: number) => void) {
	const levelRef = React.useRef(onLevel);
	levelRef.current = onLevel;

	React.useEffect(() => {
		if (!active || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
		let stopped = false;
		let frame = 0;
		let stream: MediaStream | undefined;
		let context: AudioContext | undefined;
		navigator.mediaDevices
			.getUserMedia({ audio: true })
			.then((opened) => {
				if (stopped) {
					opened.getTracks().forEach((track) => track.stop());
					return;
				}
				stream = opened;
				context = new AudioContext();
				const analyser = context.createAnalyser();
				analyser.fftSize = 512;
				context.createMediaStreamSource(opened).connect(analyser);
				const samples = new Uint8Array(analyser.fftSize);
				let level = 0;
				const tick = () => {
					analyser.getByteTimeDomainData(samples);
					let sum = 0;
					for (const sample of samples) sum += ((sample - 128) / 128) ** 2;
					// Speech sits around 0.02–0.2 RMS; scaled so a normal voice fills most of the range. Rises at once, falls
					// back gently, so the meter doesn't flicker between syllables.
					const heard = Math.min(1, Math.sqrt(sum / samples.length) * 6);
					level = heard > level ? heard : level * 0.85;
					levelRef.current(level);
					frame = requestAnimationFrame(tick);
				};
				tick();
			})
			.catch(() => {
				// No microphone access: recognition reports it; the meter stays still.
			});
		return () => {
			stopped = true;
			cancelAnimationFrame(frame);
			stream?.getTracks().forEach((track) => track.stop());
			void context?.close();
			levelRef.current(0);
		};
	}, [active]);
}

/**
 * One phrase or several as a pattern that tolerates how recognition writes them: any case, commas or dashes between the
 * words. Matches any of them.
 */
function wakePhrasePattern(phrase: string | readonly string[]) {
	const phrases = (typeof phrase === "string" ? [phrase] : phrase).filter((each) => each.trim());
	const alternatives = phrases.map((each) =>
		each
			.trim()
			.split(/\s+/)
			.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
			.join("[\\s,.!-]+"),
	);
	return new RegExp(`\\b(?:${alternatives.join("|")})\\b`, "i");
}

/**
 * Listens for a wake phrase ("Hey Intercept") while `enabled`, and calls `onWake` the moment it's heard (on recognition's
 * first guess, not its final word). Nothing else it hears is passed on or kept. Restarts after a silence; stops for good
 * if the microphone isn't allowed (dictation's own button then reports it). Returns whether it's listening for it.
 */
function useWakePhrase({
	phrase,
	enabled,
	onWake,
	lang = "en-US",
}: {
	phrase?: string | readonly string[];
	enabled: boolean;
	onWake: () => void;
	lang?: string;
}) {
	const wakeRef = React.useRef(onWake);
	wakeRef.current = onWake;
	const [blocked, setBlocked] = React.useState(false);
	const supported = React.useSyncExternalStore(
		noSubscription,
		() => speechRecognitionConstructor() !== undefined,
		() => false,
	);
	// One key for the phrases, so a new array with the same phrases doesn't restart recognition.
	const phraseKey = typeof phrase === "string" ? phrase : phrase?.join("\n");
	const waiting = Boolean(enabled && phraseKey && supported && !blocked);

	React.useEffect(() => {
		const Constructor = speechRecognitionConstructor();
		if (!waiting || !phraseKey || !Constructor) return;
		const pattern = wakePhrasePattern(phraseKey.split("\n"));
		let stopped = false;
		let restart: number | undefined;
		const recognition = new Constructor();
		recognition.continuous = true;
		recognition.interimResults = true;
		recognition.lang = lang;
		recognition.onresult = (event) => {
			let heard = "";
			for (let index = 0; index < event.results.length; index++) heard += ` ${event.results[index][0]?.transcript ?? ""}`;
			if (stopped || !pattern.test(heard)) return;
			stopped = true;
			wakeRef.current();
		};
		recognition.onerror = (event) => {
			if (event.error === "no-speech" || event.error === "aborted") return;
			stopped = true;
			if (event.error === "not-allowed" || event.error === "service-not-allowed") setBlocked(true);
		};
		recognition.onend = () => {
			if (stopped) return;
			restart = window.setTimeout(() => {
				try {
					recognition.start();
				} catch {
					// Already started.
				}
			}, 0);
		};
		try {
			recognition.start();
		} catch {
			// Another recognition is still winding down; `onend` restarts this one.
		}
		return () => {
			stopped = true;
			window.clearTimeout(restart);
			recognition.onresult = null;
			recognition.onend = null;
			recognition.onerror = null;
			recognition.abort();
		};
	}, [waiting, phraseKey, lang]);

	return waiting;
}

// Punctuation said as words, and the mark each writes (Nov 6, 2026, user's calls: "comma", "period", "question mark").
const spokenMarks: Record<string, string> = { comma: ",", period: ".", "question mark": "?" };
const spokenMarkPattern = new RegExp(
	`\\s*\\b(${Object.keys(spokenMarks)
		.map((words) => words.replace(/ /g, "\\s+"))
		.join("|")})\\b`,
	"gi",
);

// How a spoken question starts (Nov 6, 2026, user's call: "be smart about the question mark"): a question word, or a
// verb that opens a yes/no question. "Show me what changed" is a request, not a question.
const questionStarts = new Set(
	(
		"what why how when where who whom whose which " +
		"is are am was were do does did can could should would will shall may might has have had " +
		"isn't aren't wasn't weren't don't doesn't didn't can't couldn't shouldn't wouldn't won't hasn't haven't"
	).split(" "),
);

// Words said before the question itself, skipped to find where it starts: fillers, and addressing the assistant
// ("Intercept, can you…", "Okay so what changed").
const questionLeadIns = new Set("so okay ok well and also now then hey hi intercept please um uh hmm".split(" "));

// A statement turned into a question at its end: "…she's stable, right", "…that's the latest, isn't it".
const tagQuestion =
	/,?\s+(?:right|correct|yes or no|isn't (?:it|she|he|that|there)|aren't (?:they|there|we)|doesn't (?:she|he|it)|don't (?:they|we|you)|wasn't (?:it|she|he)|didn't (?:she|he|it|they))[\s.]*$/i;

/**
 * Whether a sentence reads as a question, by its structure (Nov 6, 2026, user's calls): after any lead-in words ("Okay
 * so", "Intercept,"), it starts with a question word or a verb that opens a yes/no question ("Can you tell me how Emily
 * is doing"), or it ends with a tag ("…, right", "…, isn't it").
 */
function isSpokenQuestion(sentence: string) {
	const words = sentence
		.toLowerCase()
		.replace(/’/g, "'")
		.split(/[\s,"(]+/)
		.filter(Boolean);
	const first = words.find((word) => !questionLeadIns.has(word.replace(/[.!?]+$/, "")));
	return Boolean((first && questionStarts.has(first)) || tagQuestion.test(sentence.trim()));
}

/**
 * Ends the last sentence with "?" when it's a question and nothing ends it yet: for when dictation ends (the microphone,
 * Escape, Send, or "send"), since there's no pause or tone to read. "What changed in the last hour" → "What changed in the
 * last hour?".
 */
function endSpokenQuestion(text: string) {
	const last = /([^.?!]*)$/.exec(text)?.[1] ?? "";
	if (!/[a-z]/i.test(last) || !isSpokenQuestion(last)) return text;
	return `${text.trimEnd().replace(/,$/, "")}?`;
}

/**
 * Dictated words with each spoken "delete" applied (Nov 6, 2026, user's call): it removes itself and the word said
 * before it (a spoken mark such as "comma" counts as a word), one per "delete". `extra` counts the deletes left over
 * once nothing dictated remains, for the text that was already there.
 */
function applySpokenDeletes(heard: string) {
	const words: string[] = [];
	let extra = 0;
	for (const word of heard.split(/\s+/).filter(Boolean)) {
		if (/^delete[.,!?]*$/i.test(word)) {
			if (words.length) words.pop();
			else extra++;
		} else words.push(word);
	}
	return { text: words.join(" "), extra };
}

/**
 * Dictated text with its spoken punctuation written: "comma" → ",", "period" → ".", "question mark" → "?", each against
 * the word before it and a space after it (also at the end, so what's said next, or typed, starts clear), and the word
 * after a period or question mark capitalized. Any word "period" is taken as the mark, as dictation software does. A
 * period that ends a question becomes a question mark ("what changed period" → "what changed? ").
 */
function writeSpokenPunctuation(text: string) {
	return text
		.replace(spokenMarkPattern, (_, words: string) => spokenMarks[words.toLowerCase().replace(/\s+/g, " ")])
		.replace(/[^.?!]+\./g, (sentence) => (isSpokenQuestion(sentence) ? `${sentence.slice(0, -1)}?` : sentence))
		.replace(/([,.?])(?=[^\s,.?])/g, "$1 ")
		.replace(/([,.?])$/, "$1 ")
		.replace(/([.?]\s+)([a-z])/g, (_, mark: string, letter: string) => mark + letter.toUpperCase());
}

export {
	speechRecognitionConstructor,
	writeSpokenPunctuation,
	applySpokenDeletes,
	endSpokenQuestion,
	isSpokenQuestion,
	useDictation,
	useMicLevel,
	useWakePhrase,
	wakePhrasePattern,
	type DictationError,
	type DictationHeard,
	type SpeechRecognitionConstructor,
	type SpeechRecognitionLike,
};
