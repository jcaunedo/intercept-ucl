import * as React from "react";
import { CheckIcon, CopyIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import { ChatComposer, type ChatCommand } from "@/components/forms/chat-composer";
import {
	expandVariants,
	fadeVariants,
	motionDuration,
	pendingSurfaceVariants,
	reducedMotionTransition,
	revealVariants,
	staggerContainerVariants,
	useExpandClip,
	useMotionPreference,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

import aiIcon from "./patient-details/images/ai-brief.svg";
import { SourceLabel } from "./shared/source-label";
import { SidePanel } from "./side-panel";

// The Ask Intercept Live chat (intercept.ds `Chat`, `1200:1431`; Intercept-Live "Chat open", `129:14814`): a global
// panel of the Provider Desktop, opened from the Sidebar's Ask Intercept Live on any page or the app header's sparkle on
// a patient's page. Figma draws the empty chat and its message box; the conversation follows PRD Patient details PD-100
// (marked as AI, sources named, no diagnosis or therapy) until it's designed. Answers come from the app (`respond`).

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's Conversational Clinical Data Agent fills these)     */
/* -------------------------------------------------------------------------- */

/**
 * Where the user is when they ask, so an answer can be about the patient on screen. `patientTags` are that patient's
 * tags ("Ventilated"…), for the questions to start with.
 */
type AskInterceptContext = { page: string; patientName?: string; patientTags?: string[] };

/**
 * An answer. `text` is plain text with two marks: a line starting "- " is a list item, and `**words**` are bold.
 * `sources` name where its facts come from ("Monitor", "Lab"…).
 */
type AskInterceptAnswer = {
	text: string;
	sources?: string[];
	/**
	 * The question was about alerts: the chat posts alert updates (`notice`) from now on, until a question that isn't
	 * (Oct 31, 2026, user's call).
	 */
	followAlerts?: boolean;
	/** What to do next, as buttons under the answer while it's the latest (Nov 3, 2026, user's call). */
	actions?: AskInterceptAction[];
};

/**
 * A follow-up under an answer: open the patient's details or an alert (shown only when the panel has the matching
 * handler), or ask the next question as if typed.
 */
type AskInterceptAction = { label: string } & (
	| { type: "open-patient"; patientId: string }
	| { type: "open-alert"; patientId: string; alertId: string }
	| { type: "ask"; question: string }
);

/** Answers a question. The prototype's answers are canned (`sample-ask-intercept.ts`). */
type AskInterceptResponder = (question: string, context: AskInterceptContext) => AskInterceptAnswer;

/**
 * Something Intercept tells the user without being asked: that patients' alerts changed (Oct 31, 2026, user's call).
 * Posted only while the conversation is about alerts (the last answer's `followAlerts`); a new `id` posts it once, at
 * the end of the conversation, whole (no thinking or streaming), so it never interrupts an answer being written.
 */
type AskInterceptNotice = AskInterceptAnswer & { id: string };

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

// "Johnson, Daniel" → "Daniel Johnson", and its first name, for copy that talks about the patient.
const spokenName = (patientName: string) => patientName.split(",").map((part) => part.trim()).reverse().join(" ");
const firstName = (patientName: string) => patientName.split(",")[1]?.trim() || patientName;

/** The chat's first message: about the patient on screen when it's about one (Nov 2, 2026, user's call), else general. */
function greetingFor({ patientName }: AskInterceptContext) {
	return patientName
		? `Have a question about ${spokenName(patientName)}? Just ask. Intercept Live can sum up their day, what changed, their labs and meds.`
		: "Have a question about your patients? Just ask. Intercept Live helps you find the answers you need.";
}

// Said when the app gives the chat nothing to answer with.
const noAnswer: AskInterceptAnswer = { text: "I can't answer questions here yet." };

// Slash commands. Each runs on the patient on screen, or the one named after it ("/handoff Miller"); the app answers
// them like questions (`respond` gets the text, "/handoff Miller").
const commands: ChatCommand[] = [
	// Names only in the menu (Oct 31, 2026, user's call). /clear empties the conversation; the panel handles it.
	{ name: "summarize" },
	{ name: "changes" },
	{ name: "labs" },
	{ name: "meds" },
	{ name: "sepsis" },
	{ name: "handoff" },
];

/**
 * What to write after a command, shown in the field once it's picked (Nov 1, 2026, user request): the patient the chat is
 * about goes by default, by last name; /changes without one covers every patient.
 */
function commandHint(name: string, patientName?: string) {
	if (patientName) return `Enter for ${patientName.split(",")[0]}, or add another patient`;
	if (name === "changes") return "Enter for all your patients, or add a patient's name";
	return "Add a patient's name";
}

/**
 * Questions to start with, about the page or the patient on screen. Shown until the first question. A ventilated
 * patient gets one about the ventilator too (Nov 3, 2026, user's call).
 */
function suggestionsFor({ patientName, patientTags = [] }: AskInterceptContext) {
	return patientName
		? [
				`Summarize ${firstName(patientName)}'s last 24 hours`,
				`What changed for ${firstName(patientName)} since I last looked?`,
				...(patientTags.includes("Ventilated") ? [`Show ${firstName(patientName)}'s ventilator settings`] : []),
				`Show ${firstName(patientName)}'s latest labs`,
				`What meds is ${firstName(patientName)} on?`,
				`Show ${firstName(patientName)}'s sepsis criteria`,
			]
		: [
				// Shift start first: what a clinician coming on asks before anything else.
				"Brief me for the start of my shift",
				"What happened overnight?",
				"Who needs attention first?",
				"What changed in the last hour?",
				"Which patients are sepsis candidates?",
			];
}

/* -------------------------------------------------------------------------- */
/* Messages                                                                   */
/* -------------------------------------------------------------------------- */

type ChatMessage =
	| {
			id: string;
			role: "user";
			text: string;
			/** The patient the chat was about when it was asked, so Ask from another patient's toast starts afresh. */
			patientName?: string;
	  }
	| {
			id: string;
			role: "assistant";
			/** The whole answer; `shown` is how much of it has streamed so far. */
			text: string;
			shown: number;
			sources?: string[];
			actions?: AskInterceptAction[];
			status: "thinking" | "streaming" | "done" | "stopped";
			/** Posted unasked (an alert update): shown in a grey box, without the copy button. */
			notice?: boolean;
	  };

/** Whether a message is a notice (an alert update), for spacing a run of them. */
const isNotice = (message?: ChatMessage) => message?.role === "assistant" && Boolean(message.notice);

/** `**bold**` within a line. An unclosed `**` while streaming is bold up to the end, so the marks never flash. */
function renderInline(line: string) {
	return line.split("**").map((part, index) => (index % 2 ? <strong key={index}>{part}</strong> : part));
}

/** The answer's text: paragraphs, and consecutive "- " lines as one list. */
function AnswerText({ text, caret }: { text: string; caret?: React.ReactNode }) {
	const blocks: ({ type: "p"; line: string } | { type: "ul"; items: string[] })[] = [];
	for (const line of text.split("\n")) {
		if (line.startsWith("- ")) {
			const last = blocks.at(-1);
			if (last?.type === "ul") last.items.push(line.slice(2));
			else blocks.push({ type: "ul", items: [line.slice(2)] });
		} else if (line.trim()) {
			blocks.push({ type: "p", line });
		}
	}

	return (
		// Block flow, not flex: the message's sparkle floats beside the first line, and the rest wraps under it.
		<div className='space-y-3 text-sm text-foreground'>
			{blocks.map((block, index) => {
				const last = index === blocks.length - 1;
				return block.type === "p" ? (
					<p key={index}>
						{renderInline(block.line)}
						{last ? caret : null}
					</p>
				) : (
					<ul key={index} className='list-disc space-y-1.5 pl-4 marker:text-muted-foreground'>
						{block.items.map((item, itemIndex) => (
							<li key={itemIndex}>
								{renderInline(item)}
								{last && itemIndex === block.items.length - 1 ? caret : null}
							</li>
						))}
					</ul>
				);
			})}
			{!blocks.length ? <p>{caret}</p> : null}
		</div>
	);
}

/** Copies the answer, then confirms for a moment. */
function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = React.useState(false);
	React.useEffect(() => {
		if (!copied) return;
		const timer = window.setTimeout(() => setCopied(false), 1500);
		return () => window.clearTimeout(timer);
	}, [copied]);

	return (
		<Button
			variant='ghost'
			size='icon-xs'
			aria-label={copied ? "Copied" : "Copy answer"}
			onClick={() => {
				void navigator.clipboard?.writeText(text.replaceAll("**", "")).then(() => setCopied(true));
			}}
			className='text-muted-foreground'
		>
			{copied ? <CheckIcon aria-hidden='true' /> : <CopyIcon aria-hidden='true' />}
		</Button>
	);
}

function AssistantMessage({ message }: { message: Extract<ChatMessage, { role: "assistant" }> }) {
	const { prefersReducedMotion } = useMotionPreference();
	const streaming = message.status === "streaming";
	// A soft blinking block at the end of the text while it streams (Pending); still under reduced motion.
	const caret = streaming ? (
		<motion.span
			aria-hidden='true'
			variants={pendingSurfaceVariants}
			animate={prefersReducedMotion ? "idle" : "pending"}
			className='ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 rounded-[2px] bg-foreground'
		/>
	) : null;

	return (
		// The sparkle floats at the start of the first line, so the answer uses the full width below it. A notice sits in a
		// neutral grey box (Oct 31, 2026, user's call), so what Intercept says unasked reads apart from its answers.
		<div className={cn("flow-root", message.notice && "rounded-xl bg-neutral-muted px-3 py-2.5")}>
			<img src={aiIcon} alt='' className='float-left mt-0.5 mr-2 size-4' />
			<span className='sr-only'>Intercept Live:</span>
			{message.status === "thinking" ? (
				<motion.p
					variants={pendingSurfaceVariants}
					animate={prefersReducedMotion ? "idle" : "pending"}
					className='text-sm text-muted-foreground'
				>
					Thinking…
				</motion.p>
			) : (
				<AnswerText text={message.text.slice(0, message.shown)} caret={caret} />
			)}
			{message.status === "stopped" ? <p className='mt-2 text-xs text-muted-foreground'>Stopped</p> : null}
			{message.status === "done" && (message.sources?.length || message.id !== "greeting") ? (
				<div className={cn("mt-2 flex items-center gap-1.5", !message.notice && "-ml-1")}>
					{message.id !== "greeting" && !message.notice ? <CopyButton text={message.text} /> : null}
					{message.sources?.length ? (
						<SourceLabel className='text-xs text-muted-foreground'>Sources: {message.sources.join(" · ")}</SourceLabel>
					) : null}
				</div>
			) : null}
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/* Streaming                                                                  */
/* -------------------------------------------------------------------------- */

/** Where the next streamed chunk ends: one to three words further, so the text arrives in uneven bursts. */
function nextChunkEnd(text: string, from: number) {
	let end = from;
	const words = 1 + Math.floor(Math.random() * 3);
	for (let word = 0; word < words && end < text.length; word++) {
		while (end < text.length && /\s/.test(text[end])) end++;
		while (end < text.length && !/\s/.test(text[end])) end++;
	}
	return end;
}

/** How long to wait after a chunk: around `streamStep`, longer after a sentence or a list item ends. */
function chunkDelay(text: string, end: number) {
	const base = motionDuration.streamStep * (0.6 + Math.random());
	const pause = /[.!?:]$/.test(text.slice(0, end)) || text[end] === "\n" ? motionDuration.streamPause : 0;
	return (base + pause) * 1000;
}

/* -------------------------------------------------------------------------- */
/* AskInterceptPanel                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The chat, a SidePanel between the Sidebar and the canvas: it slides open from the left and resizes from its right
 * edge. `carded` gives it the canvas's card edge (16px left radius and soft shadow), for when the Sidebar is collapsed.
 *
 * The first time it opens, Intercept greets the user, streaming, then offers questions to start with. A question shows
 * at once; Intercept thinks for a moment, then streams its answer, which can be stopped. The conversation follows the
 * newest text unless the user has scrolled up, and it's kept while the panel is closed.
 */
function AskInterceptPanel({
	open,
	onOpenChange,
	carded,
	width,
	onWidthChange,
	context,
	respond,
	notice,
	onRemovePatientContext,
	opener,
	onOpenPatient,
	onOpenAlert,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	carded: boolean;
	width: number;
	onWidthChange: (width: number) => void;
	context: AskInterceptContext;
	respond?: AskInterceptResponder;
	/** The latest notice (e.g. alert changes); each new `id` is posted once. */
	notice?: AskInterceptNotice;
	/**
	 * Takes the patient on screen out of the chat, from the "About {patient}" chip over the message box, so it answers
	 * about the census again. Without it, there's no chip.
	 */
	onRemovePatientContext?: () => void;
	/**
	 * A question the app asks for the user, e.g. a quick overview when Ask in an alert toast opens the chat about a patient.
	 * Each new `id` is asked once, as if typed, as soon as the panel is open and no answer is being written.
	 */
	opener?: { id: string; question: string };
	/** Opens a patient's details, for an answer's "open-patient" follow-up. Without it, those aren't offered. */
	onOpenPatient?: (patientId: string) => void;
	/** Opens an alert, for an answer's "open-alert" follow-up. Without it, those aren't offered. */
	onOpenAlert?: (patientId: string, alertId: string) => void;
}) {
	const { prefersReducedMotion, resolve } = useMotionPreference();
	const patientContextClip = useExpandClip();
	const [messages, setMessages] = React.useState<ChatMessage[]>([]);
	const nextId = React.useRef(0);
	const active = messages.find(
		(message): message is Extract<ChatMessage, { role: "assistant" }> =>
			message.role === "assistant" && (message.status === "thinking" || message.status === "streaming"),
	);
	const asked = messages.some((message) => message.role === "user");
	const greetingMessage = messages.find((message) => message.id === "greeting");
	const greeted = greetingMessage?.role === "assistant" && greetingMessage.status === "done";

	const updateAssistant = (id: string, update: (message: Extract<ChatMessage, { role: "assistant" }>) => ChatMessage) =>
		setMessages((current) => current.map((message) => (message.id === id && message.role === "assistant" ? update(message) : message)));

	// The greeting streams the first time the panel opens, once the panel has slid open, so it's seen from its start.
	// Notices posted before then stay below it. A conversation the app starts (`opener`) has none: its question comes first.
	const hasGreeting = Boolean(greetingMessage);
	const [skipGreeting, setSkipGreeting] = React.useState(false);
	const greeting = greetingFor(context);
	React.useEffect(() => {
		if (!open || hasGreeting || skipGreeting) return;
		const timer = window.setTimeout(
			() =>
				setMessages((current) => [
					{ id: "greeting", role: "assistant", text: greeting, shown: 0, status: "streaming" },
					...current,
				]),
			prefersReducedMotion ? 0 : motionDuration.slow * 1000,
		);
		return () => window.clearTimeout(timer);
	}, [open, hasGreeting, skipGreeting, prefersReducedMotion, greeting]);
	// Before the first question, a change of who the chat is about (the patient's sparkle, or removing the chip) greets
	// again for them, so the greeting and the suggestions always match the context.
	React.useEffect(() => {
		if (asked) return;
		setMessages((current) =>
			current.some((message) => message.id === "greeting" && message.role === "assistant" && message.text !== greeting)
				? current.filter((message) => message.id !== "greeting")
				: current,
		);
	}, [greeting, asked]);

	// Alert updates post while the conversation is about alerts: from a question about them until one that isn't. A
	// notice that comes meanwhile is posted once per id, whole, after whatever is there (an answer being written keeps
	// streaming above it); one that comes outside an alerts conversation is dropped, not saved for later.
	const [followingAlerts, setFollowingAlerts] = React.useState(false);
	const seenNotices = React.useRef(new Set<string>());
	React.useEffect(() => {
		if (!notice || seenNotices.current.has(notice.id)) return;
		seenNotices.current.add(notice.id);
		if (!followingAlerts) return;
		setMessages((current) => [
			...current,
			{
				id: `notice-${notice.id}`,
				role: "assistant",
				text: notice.text,
				sources: notice.sources,
				shown: notice.text.length,
				status: "done",
				notice: true,
			},
		]);
	}, [notice, followingAlerts]);

	// Thinking, then streaming: one step at a time for the active answer. Under reduced motion it appears whole.
	React.useEffect(() => {
		if (!active) return;
		if (active.status === "thinking") {
			const timer = window.setTimeout(
				() => updateAssistant(active.id, (message) => ({ ...message, status: "streaming" })),
				prefersReducedMotion ? 0 : motionDuration.thinking * (0.7 + Math.random() * 0.6) * 1000,
			);
			return () => window.clearTimeout(timer);
		}
		if (prefersReducedMotion || active.shown >= active.text.length) {
			updateAssistant(active.id, (message) => ({ ...message, shown: message.text.length, status: "done" }));
			return;
		}
		const end = nextChunkEnd(active.text, active.shown);
		const timer = window.setTimeout(
			() => updateAssistant(active.id, (message) => ({ ...message, shown: end })),
			chunkDelay(active.text, active.shown),
		);
		return () => window.clearTimeout(timer);
	}, [active, prefersReducedMotion]);

	// "/clear" (Oct 31, 2026, user's call): an empty conversation, greeted afresh, with alert updates off until the next
	// question about alerts. Any answer being written stops with it. Picked from the commands menu it runs at once; typed
	// in full and sent, it does the same.
	const clearConversation = () => {
		setMessages([]);
		setFollowingAlerts(false);
		setSkipGreeting(false);
		stickToBottom.current = true;
	};
	const chatCommands: ChatCommand[] = [
		...commands.map((command) => ({ ...command, hint: commandHint(command.name, context.patientName) })),
		{ name: "clear", onSelect: clearConversation },
	];

	// `fresh` starts the conversation over with this question (any answer being written stops with the rest).
	const ask = (question: string, { fresh = false } = {}) => {
		if (/^\/clear\b/i.test(question.trim())) {
			clearConversation();
			return;
		}
		if (active && !fresh) return;
		const answer = respond ? respond(question, context) : noAnswer;
		setFollowingAlerts(Boolean(answer.followAlerts));
		const id = String(nextId.current++);
		const asked: ChatMessage[] = [
			{ id: `${id}-question`, role: "user", text: question, patientName: context.patientName },
			{
				id: `${id}-answer`,
				role: "assistant",
				text: answer.text,
				sources: answer.sources,
				actions: answer.actions,
				shown: 0,
				status: "thinking",
			},
		];
		setMessages((current) => (fresh ? asked : [...current, ...asked]));
		stickToBottom.current = true;
		return `${id}-question`;
	};

	// The latest answer's follow-ups, once it's written, without those the panel can't do.
	const lastMessage = messages.at(-1);
	const followUps =
		lastMessage?.role === "assistant" && lastMessage.status === "done" && !lastMessage.notice
			? (lastMessage.actions ?? []).filter(
					(action) =>
						action.type === "ask" || (action.type === "open-patient" ? Boolean(onOpenPatient) : Boolean(onOpenAlert)),
				)
			: [];
	const runAction = (action: AskInterceptAction) => {
		if (action.type === "ask") ask(action.question);
		else if (action.type === "open-patient") onOpenPatient?.(action.patientId);
		else onOpenAlert?.(action.patientId, action.alertId);
	};

	// The app's opening question, asked once per id with the context it came with (Nov 2, 2026, user's call). A
	// conversation about this patient goes on: the question follows it, after any answer being written, and scrolls to the
	// top of the view. Anything else (another patient, the census, alert updates, the greeting) is cleared first, so the
	// question is the first message, at the top.
	const askedOpeners = React.useRef(new Set<string>());
	const [scrollToMessage, setScrollToMessage] = React.useState<string | null>(null);
	React.useEffect(() => {
		if (!open || !opener || askedOpeners.current.has(opener.id)) return;
		const questions = messages.filter((message) => message.role === "user");
		const samePatient =
			questions.length > 0 && questions.every((message) => message.role === "user" && message.patientName === context.patientName);
		if (samePatient && active) return;
		askedOpeners.current.add(opener.id);
		if (samePatient) {
			const id = ask(opener.question);
			if (id) setScrollToMessage(id);
			return;
		}
		setSkipGreeting(true);
		setFollowingAlerts(false);
		ask(opener.question, { fresh: true });
	}, [open, opener, active, messages, context.patientName]);

	// Brings a question to the top of the view; the answer then streams under it and the view follows it down.
	React.useEffect(() => {
		if (!scrollToMessage) return;
		const scroller = scrollRef.current;
		const element = listRef.current?.querySelector<HTMLElement>(`[data-message-id="${scrollToMessage}"]`);
		setScrollToMessage(null);
		if (!scroller || !element) return;
		stickToBottom.current = false;
		scroller.scrollTo({ top: element.offsetTop, behavior: prefersReducedMotion ? "auto" : "smooth" });
	}, [scrollToMessage, messages, prefersReducedMotion]);

	// Stopping keeps what has streamed so far.
	const stop = () => {
		if (!active) return;
		updateAssistant(active.id, (message) => ({ ...message, text: message.text.slice(0, message.shown), status: "stopped" }));
	};

	// Follow the newest text while the user is at the bottom; scrolling up stops following until they come back down.
	const scrollRef = React.useRef<HTMLDivElement>(null);
	const listRef = React.useRef<HTMLDivElement>(null);
	const stickToBottom = React.useRef(true);
	React.useEffect(() => {
		const scroller = scrollRef.current;
		const list = listRef.current;
		if (!scroller || !list) return;
		const observer = new ResizeObserver(() => {
			if (stickToBottom.current) scroller.scrollTop = scroller.scrollHeight;
		});
		observer.observe(list);
		return () => observer.disconnect();
	}, [open]);

	return (
		<SidePanel
			id='ask-intercept'
			side='left'
			title='Ask Intercept Live'
			open={open}
			onOpenChange={onOpenChange}
			width={width}
			onWidthChange={onWidthChange}
			className={cn(
				// White for the top half, then a fade to `background-subtle` (Figma's raw #fbfbfb is a touch lighter).
				"bg-linear-to-b from-background from-50% to-background-subtle",
				"transition-[border-radius,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
				carded && "rounded-l-2xl shadow-[0_0_26px_0_oklch(0_0_0/8%)]",
			)}
		>
			<div
				ref={scrollRef}
				onScroll={(event) => {
					const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
					stickToBottom.current = scrollHeight - scrollTop - clientHeight < 48;
				}}
				className='scrollbar-soft relative min-h-0 flex-1 overflow-y-auto px-5 pb-4'
			>
				{/* A log: new messages are announced; a streaming answer is busy, so it's read once it's done. */}
				<div ref={listRef} role='log' aria-label='Conversation' aria-busy={Boolean(active)} className='flex flex-col gap-5'>
					<AnimatePresence initial={false}>
						{messages.map((message, index) => (
							<motion.div
								key={message.id}
								data-message-id={message.id}
								variants={revealVariants}
								initial='initial'
								animate='animate'
								transition={prefersReducedMotion ? reducedMotionTransition : undefined}
								// Alert updates in a row stack 8px apart, as one group (Oct 31, 2026, user's call); 20px elsewhere.
								className={cn(isNotice(message) && isNotice(messages[index - 1]) && "-mt-3")}
							>
								{message.role === "user" ? (
									<div className='flex justify-end'>
										<p className='max-w-[85%] rounded-2xl rounded-br-md bg-neutral-muted px-3.5 py-2 text-sm whitespace-pre-wrap text-foreground'>
											<span className='sr-only'>You: </span>
											{message.text}
										</p>
									</div>
								) : (
									<AssistantMessage message={message} />
								)}
							</motion.div>
						))}
					</AnimatePresence>

					{/* The latest answer's follow-ups, once it's written (Nov 3, 2026, user's call): open the patient first, then what
					    fits the patient, their alert's status and severity. They go with the next question. */}
					<AnimatePresence>
						{followUps.length ? (
							<motion.ul
								key={`follow-ups-${lastMessage?.id}`}
								aria-label='Follow-up actions'
								variants={staggerContainerVariants}
								initial='initial'
								animate='animate'
								exit={{ opacity: 0, transition: resolve(reducedMotionTransition) }}
								className='-mt-2 flex flex-col items-start gap-2'
							>
								{followUps.map((action) => (
									<motion.li key={action.label} variants={prefersReducedMotion ? undefined : revealVariants}>
										<Button variant='outline' size='sm' className='rounded-full font-normal' onClick={() => runAction(action)}>
											{action.label}
										</Button>
									</motion.li>
								))}
							</motion.ul>
						) : null}
					</AnimatePresence>

					{/* Questions to start with, once the greeting has finished and until the first question (Flow). */}
					<AnimatePresence>
						{greeted && !asked ? (
							<motion.ul
								key='suggestions'
								aria-label='Suggested questions'
								variants={staggerContainerVariants}
								initial='initial'
								animate='animate'
								exit={{ opacity: 0, transition: resolve(reducedMotionTransition) }}
								className='flex flex-col items-start gap-2'
							>
								{suggestionsFor(context).map((suggestion) => (
									<motion.li key={suggestion} variants={prefersReducedMotion ? undefined : revealVariants}>
										<Button variant='outline' size='sm' className='rounded-full font-normal' onClick={() => ask(suggestion)}>
											{suggestion}
										</Button>
									</motion.li>
								))}
							</motion.ul>
						) : null}
					</AnimatePresence>
				</div>
			</div>
			<div className='px-5 pb-4'>
				{/* Who the chat is about, on a patient's page. Removing it makes the chat general again (and the app header's
				    Ask Intercept button plain). It opens and closes its own height (Expand), so the conversation glides. */}
				<AnimatePresence initial={false}>
					{context.patientName && onRemovePatientContext ? (
						<motion.div
							key='patient-context'
							{...patientContextClip}
							variants={prefersReducedMotion ? fadeVariants : expandVariants}
							initial='initial'
							animate='animate'
							exit='exit'
						>
							<div className='flex pb-2'>
								{/* `foreground` fill, `on-foreground` text (Oct 31, 2026, user's call); "About" softer than the name. */}
								<span className='inline-flex min-w-0 items-center gap-1 rounded-full bg-foreground py-0.5 pr-0.5 pl-3 text-sm text-on-foreground'>
									<span className='truncate'>
										<span className='text-on-foreground/70'>About </span>
										<span className='font-medium'>{context.patientName}</span>
									</span>
									<button
										type='button'
										aria-label={`Remove ${context.patientName} from the chat`}
										onClick={onRemovePatientContext}
										className='grid size-6 shrink-0 place-items-center rounded-full text-on-foreground/70 outline-none transition-colors hover:bg-on-foreground/15 hover:text-on-foreground focus-visible:ring-2 focus-visible:ring-ring'
									>
										<XIcon aria-hidden='true' className='size-3.5' />
									</button>
								</span>
							</div>
						</motion.div>
					) : null}
				</AnimatePresence>
				<ChatComposer
					// Ask and search in one place: the Sidebar has no Search since Oct 31, 2026.
					placeholder='Ask a question or search'
					label='Ask Intercept Live'
					onSubmit={ask}
					onAttach={() => {}}
					onDictate={() => {}}
					onVoice={() => {}}
					generating={Boolean(active)}
					onStop={stop}
					commands={chatCommands}
				/>
			</div>
		</SidePanel>
	);
}

export {
	AskInterceptPanel,
	type AskInterceptAction,
	type AskInterceptAnswer,
	type AskInterceptContext,
	type AskInterceptNotice,
	type AskInterceptResponder,
};
