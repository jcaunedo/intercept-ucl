import * as React from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import { ChatComposer, type ChatCommand } from "@/components/forms/chat-composer";
import {
	motionDuration,
	pendingSurfaceVariants,
	reducedMotionTransition,
	revealVariants,
	staggerContainerVariants,
	useMotionPreference,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

import aiIcon from "./patient-details/images/ai-brief.svg";
import { SidePanel } from "./side-panel";

// The Ask Intercept Live chat (intercept.ds `Chat`, `1200:1431`; Intercept-Live "Chat open", `129:14814`): a global
// panel of the Provider Desktop, opened from the Sidebar's Ask Intercept Live on any page or the app header's sparkle on
// a patient's page. Figma draws the empty chat and its message box; the conversation follows PRD Patient details PD-100
// (marked as AI, sources named, no diagnosis or therapy) until it's designed. Answers come from the app (`respond`).

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's Conversational Clinical Data Agent fills these)     */
/* -------------------------------------------------------------------------- */

/** Where the user is when they ask, so an answer can be about the patient on screen. */
type AskInterceptContext = { page: string; patientName?: string };

/**
 * An answer. `text` is plain text with two marks: a line starting "- " is a list item, and `**words**` are bold.
 * `sources` name where its facts come from ("Monitor", "Lab"…).
 */
type AskInterceptAnswer = { text: string; sources?: string[] };

/** Answers a question. The prototype's answers are canned (`sample-ask-intercept.ts`). */
type AskInterceptResponder = (question: string, context: AskInterceptContext) => AskInterceptAnswer;

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

const greeting = "Have a question about your patients? Just ask. Intercept Live helps you find the answers you need.";

// Said when the app gives the chat nothing to answer with.
const noAnswer: AskInterceptAnswer = { text: "I can't answer questions here yet." };

// Slash commands. Each runs on the patient on screen, or the one named after it ("/handoff Miller"); the app answers
// them like questions (`respond` gets the text, "/handoff Miller").
const commands: ChatCommand[] = [
	{ name: "summarize", description: "A patient's last 24 hours" },
	{ name: "changes", description: "What changed in the last hour" },
	{ name: "labs", description: "Latest labs" },
	{ name: "meds", description: "Medications and what's due" },
	{ name: "sepsis", description: "Sepsis criteria and bundle" },
	{ name: "handoff", description: "Draft a handoff (I-PASS)" },
];

/** Questions to start with, about the page or the patient on screen. Shown until the first question. */
function suggestionsFor({ patientName }: AskInterceptContext) {
	return patientName
		? ["Summarize the last 24 hours", "What changed since I last looked?", "Show the sepsis criteria"]
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
	| { id: string; role: "user"; text: string }
	| {
			id: string;
			role: "assistant";
			/** The whole answer; `shown` is how much of it has streamed so far. */
			text: string;
			shown: number;
			sources?: string[];
			status: "thinking" | "streaming" | "done" | "stopped";
	  };

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
		// The sparkle floats at the start of the first line, so the answer uses the full width below it.
		<div className='flow-root'>
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
				<div className='mt-2 -ml-1 flex items-center gap-1.5'>
					{message.id !== "greeting" ? <CopyButton text={message.text} /> : null}
					{message.sources?.length ? (
						<p className='text-xs text-muted-foreground'>Sources: {message.sources.join(" · ")}</p>
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
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	carded: boolean;
	width: number;
	onWidthChange: (width: number) => void;
	context: AskInterceptContext;
	respond?: AskInterceptResponder;
}) {
	const { prefersReducedMotion, resolve } = useMotionPreference();
	const [messages, setMessages] = React.useState<ChatMessage[]>([]);
	const nextId = React.useRef(0);
	const active = messages.find(
		(message): message is Extract<ChatMessage, { role: "assistant" }> =>
			message.role === "assistant" && (message.status === "thinking" || message.status === "streaming"),
	);
	const asked = messages.some((message) => message.role === "user");
	const greeted = messages[0]?.role === "assistant" && messages[0].status === "done";

	const updateAssistant = (id: string, update: (message: Extract<ChatMessage, { role: "assistant" }>) => ChatMessage) =>
		setMessages((current) => current.map((message) => (message.id === id && message.role === "assistant" ? update(message) : message)));

	// The greeting streams the first time the panel opens, once the panel has slid open, so it's seen from its start.
	React.useEffect(() => {
		if (!open || messages.length) return;
		const timer = window.setTimeout(
			() => setMessages([{ id: "greeting", role: "assistant", text: greeting, shown: 0, status: "streaming" }]),
			prefersReducedMotion ? 0 : motionDuration.slow * 1000,
		);
		return () => window.clearTimeout(timer);
	}, [open, messages.length, prefersReducedMotion]);

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

	const ask = (question: string) => {
		if (active) return;
		const answer = respond ? respond(question, context) : noAnswer;
		const id = String(nextId.current++);
		setMessages((current) => [
			...current,
			{ id: `${id}-question`, role: "user", text: question },
			{ id: `${id}-answer`, role: "assistant", text: answer.text, sources: answer.sources, shown: 0, status: "thinking" },
		]);
		stickToBottom.current = true;
	};

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
				className='scrollbar-soft min-h-0 flex-1 overflow-y-auto px-5 pb-4'
			>
				{/* A log: new messages are announced; a streaming answer is busy, so it's read once it's done. */}
				<div ref={listRef} role='log' aria-label='Conversation' aria-busy={Boolean(active)} className='flex flex-col gap-5'>
					<AnimatePresence initial={false}>
						{messages.map((message) => (
							<motion.div
								key={message.id}
								variants={revealVariants}
								initial='initial'
								animate='animate'
								transition={prefersReducedMotion ? reducedMotionTransition : undefined}
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
				<ChatComposer
					placeholder='How can I help?'
					label='Ask Intercept Live'
					onSubmit={ask}
					onAttach={() => {}}
					onDictate={() => {}}
					onVoice={() => {}}
					generating={Boolean(active)}
					onStop={stop}
					commands={commands}
				/>
			</div>
		</SidePanel>
	);
}

export { AskInterceptPanel, type AskInterceptAnswer, type AskInterceptContext, type AskInterceptResponder };
