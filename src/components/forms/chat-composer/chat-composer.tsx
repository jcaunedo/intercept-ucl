import * as React from "react";
import { ArrowUpIcon, AudioLinesIcon, MicIcon, MicOffIcon, PlusIcon, SlashIcon, SquareIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import {
	useDictation,
	useMicLevel,
	useWakePhrase,
	applySpokenDeletes,
	endSpokenQuestion,
	writeSpokenPunctuation,
	type DictationError,
} from "@/lib/hooks/use-dictation";
import {
	enterTransition,
	exitTransition,
	expandVariants,
	listeningFillVariants,
	motionDistance,
	motionScale,
	standardTransition,
	useExpandClip,
	useMotionPreference,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * A slash command: typed as "/name". `description`, when given, shows beside it in the commands menu. `hint` guides
 * what to write next: it shows in the field, muted, right after "/name " until something follows it (e.g. "Add a
 * patient's name"). With `onSelect`, picking it runs it at once and clears the field (e.g. /clear), instead of writing
 * "/name " to be sent.
 */
type ChatCommand = { name: string; description?: string; hint?: string; onSelect?: () => void };

type ChatComposerProps = Omit<React.ComponentProps<"form">, "onSubmit" | "children"> & {
	/** The message, controlled. Without it, the composer keeps its own and clears it once sent. */
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	/** Sends the message (Enter, or the Send button). Called with the trimmed text, never empty. */
	onSubmit?: (message: string) => void;
	placeholder?: string;
	/** The field's accessible name. Defaults to `placeholder`, which disappears once the user types. */
	label?: string;
	/** Adds an attachment. Without it, there's no + button. */
	onAttach?: () => void;
	/**
	 * Built-in dictation: the microphone button listens and writes what's heard into the field as it's said, for the
	 * user to read, edit and send. It listens until the user presses it again or says "stop listening"; sending (the
	 * button, or saying "send") and typing don't stop it. Uses the browser's speech recognition; where there's none
	 * (Firefox), the button falls back to `onDictate`, or isn't shown.
	 */
	dictation?: boolean;
	/** Dictation's language, a BCP 47 tag. */
	dictationLang?: string;
	/**
	 * With `dictation`: a phrase ("Hey Intercept"), or several (any of them), that starts dictation hands-free, as the
	 * microphone button does. While the composer is mounted, enabled and not dictating, it listens for the phrase only;
	 * nothing else it hears is shown or kept. Mount the composer (or pass the phrase) only while its panel is open.
	 */
	wakePhrase?: string | readonly string[];
	/** The placeholder while listening for `wakePhrase`, to say it can be said (e.g. 'Ask, search, or say "Hey Intercept"'). */
	wakePlaceholder?: string;
	/** Dictates the message, the app's own way. Without it (and without `dictation`), there's no microphone button. */
	onDictate?: () => void;
	/**
	 * Starts a voice conversation. Shown while the message is empty; Send takes its place once there's text. Without it,
	 * nothing shows there while the message is empty, and Send slides in with the first character.
	 */
	onVoice?: () => void;
	/** An answer is being written: Stop replaces Send and voice, and Enter doesn't send. The field stays editable. */
	generating?: boolean;
	/** Stops the answer being written. */
	onStop?: () => void;
	/**
	 * Slash commands. With them, a slash button opens the commands menu, and so does typing "/" at the start. Picking
	 * one writes "/name " into the message, for the app to act on when it's sent.
	 */
	commands?: ChatCommand[];
	disabled?: boolean;
};

/**
 * A message box for a chat: a text field that grows with its text, + and slash commands on the left, and the microphone
 * and voice (or Send, once there's text) on the right. Enter sends; Shift+Enter starts a new line. While an answer is
 * being written, Stop takes Send's place. The commands menu filters as the command is typed; ↑ ↓ move, Enter or Tab
 * picks, Escape closes it.
 *
 * Figma: [intercept.ds › Chat](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1200-1403)
 */
function ChatComposer({
	value: valueProp,
	defaultValue = "",
	onValueChange,
	onSubmit,
	placeholder = "Message",
	label,
	onAttach,
	dictation = false,
	dictationLang = "en-US",
	wakePhrase,
	wakePlaceholder,
	onDictate,
	onVoice,
	generating = false,
	onStop,
	commands = [],
	disabled = false,
	className,
	...props
}: ChatComposerProps) {
	const { prefersReducedMotion, resolve } = useMotionPreference();
	const fieldRef = React.useRef<HTMLTextAreaElement>(null);
	const menuId = React.useId();
	const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
	const value = valueProp ?? uncontrolledValue;
	const message = value.trim();

	// The commands menu: open while the message is only a command being typed ("/ha"), or when the slash button asks
	// for it over other text, until it's dismissed.
	const [menuForced, setMenuForced] = React.useState(false);
	const [menuDismissed, setMenuDismissed] = React.useState(false);
	const [activeIndex, setActiveIndex] = React.useState(0);
	const typed = /^\/(\S*)$/.exec(value)?.[1];
	const query = typed ?? (menuForced ? "" : undefined);
	const matches = query === undefined ? [] : commands.filter((command) => command.name.startsWith(query.toLowerCase()));
	// A command written alone ("/sepsis "), nothing after it yet: its hint shows after it in the field.
	const written = /^\/(\S+) $/.exec(value)?.[1];
	const hint = written ? commands.find((command) => command.name === written.toLowerCase())?.hint : undefined;
	const hintId = React.useId();
	const menuOpen = matches.length > 0 && !menuDismissed && !disabled;
	const active = matches[Math.min(activeIndex, matches.length - 1)];

	const setValue = (next: string) => {
		setUncontrolledValue(next);
		onValueChange?.(next);
		setMenuDismissed(false);
		setActiveIndex(0);
	};

	// A picked command replaces the one being typed, or goes before the text already there. One that acts on its own
	// (`onSelect`) runs at once and leaves the field empty.
	const pick = (command: ChatCommand) => {
		setMenuForced(false);
		fieldRef.current?.focus();
		if (command.onSelect) {
			setValue("");
			command.onSelect();
			return;
		}
		const rest = value.replace(/^\/\S*\s?/, "");
		setValue(`/${command.name} ${rest}`);
	};

	const openMenu = () => {
		if (!value) setValue("/");
		else setMenuForced(true);
		setMenuDismissed(false);
		fieldRef.current?.focus();
	};

	// Dictation writes after the text that was in the field when it started; what's being said now is shown too, and
	// replaced as recognition settles on it.
	const dictationBase = React.useRef("");
	// Woken by the phrase: "Hey" can wake it before "Intercept" is said, so a leading "Intercept" is the phrase's, not the
	// message's (Nov 6, 2026).
	const wokeRef = React.useRef(false);
	const dictate = useDictation({
		lang: dictationLang,
		onHeard: (heard) => {
			const { final, interim } = wokeRef.current ? withoutWakeRest(heard) : heard;
			// Spoken commands, as the last words said, once recognition has settled on them (never on a guess).
			// "Stop listening": ends dictation, as the microphone does, without the words.
			const stopCommand = interim ? null : stopCommandPattern.exec(final);
			if (stopCommand) {
				const text = appendDictated(dictationBase.current, [stopCommand[1]]);
				dictate.stop();
				return setValue(text.trim() ? endSpokenQuestion(text.trimEnd()) : text);
			}
			// "Send" or "Submit": sends, as the Send button does, without the word, and goes on listening for the next
			// message. With nothing to send (or an answer still being written) the word is dropped and the text stays.
			const sendCommand = interim ? null : sendCommandPattern.exec(final);
			// A command still being guessed never shows: the field leaves out a trailing "send", "submit" or "stop listening"
			// until recognition settles (and acts) or more words follow it (Nov 6, 2026, user's call).
			if (!sendCommand) {
				const said = [final, interim].filter(Boolean).join(" ").replace(trailingCommandPattern, "");
				const text = appendDictated(dictationBase.current, [said]);
				// Settled, with nothing more being said: a question shows its "?" now (Nov 6, 2026, user's call). It goes again
				// if the sentence carries on, since the field is rebuilt from what's heard each time.
				return setValue(!interim && said.trim() ? endSpokenQuestion(text) : text);
			}
			const text = appendDictated(dictationBase.current, [sendCommand[1]]);
			dictate.reset();
			if (!text.trim() || disabled || generating) {
				dictationBase.current = text;
				return setValue(text);
			}
			dictate.clearError();
			onSubmit?.(endSpokenQuestion(text.trim()));
			dictationBase.current = "";
			setValue("");
		},
	});
	const builtInDictation = dictation && dictate.supported;
	const listening = builtInDictation && dictate.listening;
	// Dictation runs until the clinician ends it: the microphone, or saying "stop listening" (Nov 6, 2026, user's call).
	// Sending and typing don't end it. Ending it gives a spoken question its "?".
	const finishDictation = () => {
		dictate.stop();
		if (value.trim()) setValue(endSpokenQuestion(value.trimEnd()));
	};
	const toggleDictation = () => {
		if (listening) return finishDictation();
		wokeRef.current = false;
		dictationBase.current = value;
		dictate.start();
	};
	const dictationClip = useExpandClip<HTMLParagraphElement>();
	// Hands-free: the wake phrase starts dictation, as the button would, after whatever is in the field.
	const waitingForWake = useWakePhrase({
		phrase: wakePhrase,
		enabled: builtInDictation && !listening && !disabled && dictate.error !== "denied",
		lang: dictationLang,
		onWake: () => {
			dictationBase.current = value;
			wokeRef.current = true;
			dictate.start();
		},
	});
	// The voice meter: a halo behind the microphone that swells with the voice from the first syllable, so it's plain that
	// it's listening before any words come back. Written straight to the halo's style each frame; still under reduced
	// motion.
	const haloRef = React.useRef<HTMLSpanElement>(null);
	// Invisible in silence: the flat fill is translucent, so a resting halo would darken the button.
	useMicLevel(listening && !prefersReducedMotion, (level) => {
		if (!haloRef.current) return;
		haloRef.current.style.transform = `scale(${1 + level * 0.45})`;
		haloRef.current.style.opacity = String(Math.min(1, level * 2));
	});
	// The button at the right end: Stop while generating, Send with text, voice without; nothing while empty and there's no
	// voice, so Send arrives with the first character (opening its own width, which pushes the microphone left).
	const trailing = generating ? "stop" : message ? "send" : onVoice ? "voice" : null;

	React.useEffect(() => {
		if (disabled) dictate.stop();
	}, [disabled, dictate.stop]);

	const send = () => {
		if (!message || disabled || generating) return;
		dictate.clearError();
		// Sent while dictating: a spoken question gets its "?", and dictation goes on for the next message, from scratch.
		onSubmit?.(listening ? endSpokenQuestion(message) : message);
		dictationBase.current = "";
		dictate.reset();
		setValue("");
	};

	return (
		<form
			data-slot='chat-composer'
			data-dictating={listening || undefined}
			onSubmit={(event) => {
				event.preventDefault();
				send();
			}}
			className={cn(
				// The border sits outside the padding, so the content lands 17 × 14px in, as Figma draws it. `relative` places
				// the commands menu above it.
				"relative flex w-full flex-col gap-3 rounded-3xl border border-border bg-background px-4 py-[13px] shadow-sm transition-[border-color,box-shadow]",
				// The field has no frame of its own: the whole composer takes Input's focus ring.
				"has-[textarea:focus-visible]:border-ring has-[textarea:focus-visible]:ring-[3px] has-[textarea:focus-visible]:ring-ring-outside",
				disabled && "opacity-50",
				className,
			)}
			{...props}
		>
			{/* The commands menu, above the box: the library's menu surface and motion (fade, a small rise), with the box's own
			    radius, 10px sides and 16px top and bottom; items 12px. The padding is the surface's and only the list
			    scrolls, so it shows on every side, the bottom included, even when the list is longer than fits. */}
			<AnimatePresence>
				{menuOpen ? (
					<motion.div
						key='commands'
						initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: motionScale.popIn, y: motionDistance.subtle }}
						animate={{ opacity: 1, scale: 1, y: 0, transition: resolve(enterTransition) }}
						exit={{ opacity: 0, transition: { duration: 0 } }}
						className='absolute inset-x-0 bottom-full z-50 mb-2 flex origin-bottom flex-col rounded-3xl border border-border bg-popover px-2.5 py-4 text-popover-foreground shadow-xl'
					>
						<ul
							id={menuId}
							role='listbox'
							aria-label='Commands'
							className='flex max-h-64 flex-col gap-0.5 overflow-y-auto scrollbar-soft'
						>
							{matches.map((command) => (
								<li
									key={command.name}
									id={`${menuId}-${command.name}`}
									role='option'
									aria-selected={command === active}
									// Keeps focus in the field, so picking doesn't close the menu first.
									onMouseDown={(event) => event.preventDefault()}
									onClick={() => pick(command)}
									onMouseMove={() => setActiveIndex(matches.indexOf(command))}
									className='flex cursor-pointer items-baseline gap-2 rounded-xl px-2 py-1.5 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground'
								>
									<span className='font-medium'>/{command.name}</span>
									{command.description ? (
										<span className='truncate text-xs text-muted-foreground'>{command.description}</span>
									) : null}
								</li>
							))}
						</ul>
					</motion.div>
				) : null}
			</AnimatePresence>
			{/* The field and its command hint share one cell: the hint is the text laid out again, invisible, then the hint in
			    `foreground-subtle`, so it starts right where the text ends and a long hint wraps and grows the box. */}
			<div className='grid'>
				<AnimatePresence>
					{hint ? (
						<motion.div
							key={hint}
							aria-hidden='true'
							initial={{ opacity: 0 }}
							animate={{ opacity: 1, transition: resolve(standardTransition) }}
							// Gone at once when the user types after the command, so the hint never overlaps their text.
							exit={{ opacity: 0, transition: { duration: 0 } }}
							className='pointer-events-none col-start-1 row-start-1 text-sm break-words whitespace-pre-wrap'
						>
							<span className='invisible'>{value}</span>
							<span id={hintId} className='text-foreground-subtle'>
								{hint}
							</span>
						</motion.div>
					) : null}
				</AnimatePresence>
				<textarea
					ref={fieldRef}
					value={value}
					onChange={(event) => {
						// Typing while dictating doesn't stop it: what's said next goes after what's typed.
						if (listening) {
							dictationBase.current = event.target.value;
							dictate.reset();
						}
						dictate.clearError();
						setValue(event.target.value);
					}}
					onBlur={() => setMenuForced(false)}
					onKeyDown={(event) => {
						if (menuOpen) {
							if (event.key === "ArrowDown" || event.key === "ArrowUp") {
								event.preventDefault();
								const step = event.key === "ArrowDown" ? 1 : -1;
								setActiveIndex((matches.indexOf(active) + step + matches.length) % matches.length);
								return;
							}
							if ((event.key === "Enter" || event.key === "Tab") && !event.shiftKey && !event.nativeEvent.isComposing) {
								event.preventDefault();
								pick(active);
								return;
							}
							if (event.key === "Escape") {
								// Closes the menu only, not a panel or dialog around the composer.
								event.preventDefault();
								event.stopPropagation();
								setMenuDismissed(true);
								setMenuForced(false);
								return;
							}
						}
						// Enter sends, unless it's ending an IME composition or Shift asks for a new line.
						if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
							event.preventDefault();
							send();
						}
					}}
					rows={1}
					placeholder={listening ? "Listening…" : waitingForWake && wakePlaceholder ? wakePlaceholder : placeholder}
					aria-label={label ?? placeholder}
					role={commands.length ? "combobox" : undefined}
					aria-autocomplete={commands.length ? "list" : undefined}
					aria-expanded={commands.length ? menuOpen : undefined}
					aria-controls={menuOpen ? menuId : undefined}
					aria-activedescendant={menuOpen && active ? `${menuId}-${active.name}` : undefined}
					aria-describedby={hint ? hintId : undefined}
					disabled={disabled}
					className={cn(
						"col-start-1 row-start-1 field-sizing-content max-h-40 min-h-5 w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-subtle disabled:cursor-not-allowed",
						// "Listening…" is a state, not a hint: `foreground`, like the text it's waiting for (Nov 6, 2026, user's call).
						listening && "placeholder:text-foreground",
					)}
				/>
			</div>
			{/* Why dictation stopped on its own, under the field (Expand), until the user tries again, types or sends. */}
			<AnimatePresence initial={false}>
				{builtInDictation && dictate.error ? (
					<motion.p
						key='dictation-error'
						{...dictationClip}
						variants={prefersReducedMotion ? undefined : expandVariants}
						initial='initial'
						animate='animate'
						exit='exit'
						className='-mt-1 text-xs text-muted-foreground'
					>
						{dictationErrors[dictate.error]}
					</motion.p>
				) : null}
			</AnimatePresence>
			{/* Announces dictation starting and stopping; the button's pressed state says it too. */}
			<span role='status' className='sr-only'>
				{listening ? "Listening" : ""}
			</span>
			<div className='flex items-center justify-between gap-2'>
				<div className='flex items-center gap-2'>
					{onAttach ? (
						<Button
							type='button'
							variant='outline'
							size='icon-sm'
							aria-label='Add attachment'
							onClick={onAttach}
							disabled={disabled}
							className='rounded-button-md'
						>
							<PlusIcon aria-hidden='true' />
						</Button>
					) : null}
					{commands.length ? (
						<Button
							type='button'
							variant='outline'
							size='icon-sm'
							aria-label='Commands'
							aria-expanded={menuOpen}
							aria-controls={menuOpen ? menuId : undefined}
							// Keeps focus in the field, which the menu reads its keys from.
							onMouseDown={(event) => event.preventDefault()}
							onClick={() => (menuOpen ? setMenuDismissed(true) : openMenu())}
							disabled={disabled}
							className='rounded-button-md aria-expanded:bg-accent'
						>
							<SlashIcon aria-hidden='true' />
						</Button>
					) : null}
				</div>
				<div className='flex items-center'>
					{builtInDictation ? (
						<span className='relative flex'>
							<span
								ref={haloRef}
								aria-hidden='true'
								className='pointer-events-none absolute inset-0 rounded-button-md bg-destructive/25 opacity-0'
							/>
							<Button
								type='button'
								// While listening: Flat · Destructive, the red of a recording, with `mic-off` (archielabs.ds `6346:10225`,
								// lucide's glyph), what a press does now.
								variant={listening ? "destructive-secondary" : "outline"}
								size='icon-sm'
								aria-label={listening ? "Stop dictating" : "Dictate"}
								aria-pressed={listening}
								onClick={toggleDictation}
								disabled={disabled}
								// `isolate`: the breathing fill sits over the button's own fill, under the icon.
								className='relative isolate rounded-button-md'
							>
								{/* Listening, the darker `destructive-muted` fill breathes over the pale one on the Live beat (MOTION.md
								    "Listening"), so it reads as active. Still under reduced motion. */}
								<motion.span
									aria-hidden='true'
									variants={listeningFillVariants}
									initial={false}
									animate={listening && !prefersReducedMotion ? "listening" : "idle"}
									className='pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-destructive-muted'
								/>
								{listening ? <MicOffIcon aria-hidden='true' /> : <MicIcon aria-hidden='true' />}
							</Button>
						</span>
					) : onDictate ? (
						<Button
							type='button'
							variant='outline'
							size='icon-sm'
							aria-label='Dictate'
							onClick={onDictate}
							disabled={disabled}
							className='rounded-button-md'
						>
							<MicIcon aria-hidden='true' />
						</Button>
					) : null}
					<AnimatePresence initial={false}>
						{trailing ? (
							<motion.div
								key='trailing'
								// The slot opens its width and the 8px gap before it while the button grows from its center, all on one
								// curve: at every frame the button is exactly as wide as its slot (32px × scale), so it never covers the
								// microphone, which glides left as the slot opens. Closing runs the same way back. A fade under reduced
								// motion.
								initial={
									prefersReducedMotion
										? { width: 32, marginLeft: 8, opacity: 0 }
										: { width: 0, marginLeft: 0, scale: 0 }
								}
								animate={{ width: 32, marginLeft: 8, scale: 1, opacity: 1, transition: resolve(standardTransition) }}
								exit={
									prefersReducedMotion
										? { opacity: 0, transition: resolve(exitTransition) }
										: { width: 0, marginLeft: 0, scale: 0, transition: resolve(exitTransition) }
								}
								className='flex shrink-0 justify-center'
							>
								{trailing === "stop" ? (
									<Button
										type='button'
										variant='neutral'
										size='icon-sm'
										aria-label='Stop generating'
										onClick={onStop}
										disabled={disabled}
										className='rounded-button-md'
									>
										<SquareIcon aria-hidden='true' className='size-3 fill-current' />
									</Button>
								) : trailing === "send" ? (
									<Button
										type='submit'
										variant='neutral'
										size='icon-sm'
										aria-label='Send'
										disabled={disabled}
										className='rounded-button-md'
									>
										<ArrowUpIcon aria-hidden='true' />
									</Button>
								) : (
									<Button
										type='button'
										variant='neutral'
										size='icon-sm'
										aria-label='Start voice conversation'
										onClick={onVoice}
										disabled={disabled}
										className='rounded-button-md'
									>
										<AudioLinesIcon aria-hidden='true' />
									</Button>
								)}
							</motion.div>
						) : null}
					</AnimatePresence>
				</div>
			</div>
		</form>
	);
}

// A spoken "send" or "submit" ending what's been said (Nov 6, 2026, user's call), with the text before it; recognition
// may add a period or a comma. The same for "stop listening".
const sendCommandPattern = /^(.*?)[\s,.]*\b(?:send|submit)[.!?]*\s*$/i;
const stopCommandPattern = /^(.*?)[\s,.]*\bstop\s+listening[.!?]*\s*$/i;
/** What a woken dictation heard, without the wake phrase's rest at its start ("Intercept, can you…" → "can you…"). */
function withoutWakeRest({ final, interim }: { final: string; interim: string }) {
	const rest = /^\s*intercept\b[\s,.!]*/i;
	return final ? { final: final.replace(rest, ""), interim } : { final, interim: interim.replace(rest, "") };
}

// Any of them ending what's being said, to keep out of the field while it's still a guess.
const trailingCommandPattern = /[\s,.]*\b(?:send|submit|stop(?:\s+listening)?)[.!?]*\s*$/i;

const dictationErrors: Record<DictationError, string> = {
	denied: "Allow the microphone to dictate.",
	unavailable: "Dictation isn't working right now. Try again.",
};

/**
 * The field's text with dictation after it, its spoken deletes applied and its spoken punctuation written ("comma" → ", ", "period" → ". ", "question
 * mark" → "? "): a space
 * between them unless the text already ends in one or the dictation starts with a mark, and the first word capitalized
 * when the field was empty or ends a sentence.
 */
function appendDictated(base: string, parts: string[]) {
	// "delete" removes the word before it; past what was dictated, the field's own words, one by one.
	const { text: spoken, extra } = applySpokenDeletes(parts.filter(Boolean).join(" "));
	for (let left = extra; left > 0 && base.trim(); left--) base = base.replace(/\s*\S+\s*$/, "");
	const heard = writeSpokenPunctuation(spoken).trimStart();
	if (!heard) return base;
	const capitalized = heard.charAt(0).toUpperCase() + heard.slice(1);
	if (!base.trim()) return capitalized;
	if (/^[,.?]/.test(heard)) return `${base.trimEnd()}${heard}`;
	return `${base}${/\s$/.test(base) ? "" : " "}${/[.!?]\s*$/.test(base) ? capitalized : heard}`;
}

export { ChatComposer, type ChatCommand, type ChatComposerProps };
