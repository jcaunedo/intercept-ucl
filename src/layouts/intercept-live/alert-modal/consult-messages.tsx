import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { MessageCircleIcon, type LucideIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import { Counter } from "@/components/data-display/counter";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { fadeVariants, revealVariants, useMotionPreference } from "@/lib/motion";
import { formatRelativeDate } from "@/lib/relative-date";
import { cn } from "@/lib/utils";

import { BedsidePhotoImage, type BedsidePhoto } from "./low-bandwidth";

// The video consult's messages with the bedside nurse (Nov 5, 2026, user's call; intercept.ds `alert-expanded` ›
// Messages `1375:8218`): the thread the nurse sees in their hospital's messaging (Epic Secure Chat, Cerner Secure
// Messaging, TigerConnect; Spec §6.11), in the alert panel's third column, where the pathway shows. Opened from the
// actions row's Messages, and on its own when a message from the bedside arrives.

/** One message in the thread: from the bedside (the nurse, or `by` someone else there), or from the clinician ("you"). */
type ConsultMessage = {
	id: string;
	from: "bedside" | "you";
	/** Who sent it from the bedside when it isn't the thread's nurse, e.g. "Rachel Lindgren, RRT". */
	by?: string;
	text?: string;
	/** A photo sent with it (store-and-forward: a device's screen, a blood gas), shown with its readings. */
	photo?: BedsidePhoto;
	/** When it was sent, ISO 8601. */
	sentAt: string;
};

/**
 * The prototype's simulated bedside replies: a list, one per message sent in order, or a function that answers each
 * message from what it says (Nov 5, 2026, user's call: "related with the message the user sent … conversational, in
 * context"). Nothing (undefined) means no reply.
 */
type ConsultReplies = readonly string[] | ((message: string) => string | undefined);

/** A photo from the bedside as a message from whoever took it, at the time it was taken. */
const photoMessage = (photo: BedsidePhoto): ConsultMessage => ({
	id: `photo-${photo.id}`,
	from: "bedside",
	by: photo.takenBy,
	photo,
	sentAt: photo.takenAt,
});

// A simulated reply (the prototype's `replies`): the nurse starts typing a moment after the clinician's message, and the
// reply lands a little later, as from a phone at the bedside.
const replyTypingAfterMs = 1200;
const replyTypedMs = 2400;

/**
 * The thread as it stands: the API's messages and the photos the bedside sent (Nov 5, 2026, user's call: the photos
 * moved here from under the call), with the clinician's own added as they're sent; oldest first. A message never
 * changes once it's shown. `replies` simulates the bedside answering (Nov 5, 2026, user's call: "Simulate messages
 * interaction"; simulator US7.2): each message the clinician sends gets the next one, the nurse typing first, until
 * they run out. The app leaves it out: its replies come in `incoming`.
 */
function useConsultMessages(
	incoming: readonly ConsultMessage[] = [],
	photos: readonly BedsidePhoto[] = [],
	onSend?: (text: string) => void,
	replies: ConsultReplies = [],
) {
	const [local, setLocal] = React.useState<ConsultMessage[]>([]);
	const [typing, setTyping] = React.useState(false);
	const count = React.useRef(0);
	const nextReply = React.useRef(0);
	const pending = React.useRef(0);
	const timers = React.useRef<number[]>([]);
	React.useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);
	const repliesRef = React.useRef(replies);
	repliesRef.current = replies;
	const add = React.useCallback((message: Omit<ConsultMessage, "id" | "sentAt">) => {
		setLocal((current) => [
			...current,
			{ ...message, id: `local-${count.current++}`, sentAt: new Date().toISOString() },
		]);
	}, []);
	const send = React.useCallback(
		(text: string) => {
			add({ from: "you", text });
			onSend?.(text);
			const current = repliesRef.current;
			const reply = typeof current === "function" ? current(text) : current[nextReply.current];
			if (reply === undefined) return;
			nextReply.current += 1;
			pending.current += 1;
			timers.current.push(
				window.setTimeout(() => setTyping(true), replyTypingAfterMs),
				window.setTimeout(() => {
					add({ from: "bedside", text: reply });
					pending.current -= 1;
					if (pending.current === 0) setTyping(false);
				}, replyTypingAfterMs + replyTypedMs),
			);
		},
		[add, onSend],
	);
	const messages = [...incoming, ...photos.map(photoMessage), ...local].sort(
		(a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt),
	);
	return [messages, send, typing] as const;
}

/**
 * True on the render where a new message from the bedside arrives (a message, a reply or a photo), not for the ones
 * already there when the thread mounted: the Messages column opens on its own for it (Nov 5, 2026, user's call: "Message
 * panel will only open with a new incoming message, automatically open").
 */
function useNewIncoming(messages: readonly ConsultMessage[]) {
	const count = messages.filter((message) => message.from === "bedside").length;
	const [seen, setSeen] = React.useState(count);
	if (count === seen) return false;
	setSeen(count);
	return count > seen;
}

/**
 * How many messages from the bedside (messages, replies, photos) arrived since the column was last open: all of them
 * until it first opens. Zero while it's open. The Messages buttons show it (Nov 5, 2026, user's call). A message arriving
 * while the alert is open opens the column (`useNewIncoming`), so this counts the ones that came while it wasn't.
 */
function useUnreadMessages(messages: readonly ConsultMessage[], open: boolean) {
	const count = messages.filter((message) => message.from === "bedside").length;
	const [read, setRead] = React.useState(0);
	if (open && read !== count) setRead(count);
	return open ? 0 : Math.max(0, count - read);
}

/**
 * A Messages button: shows the Messages column, or hides it ("Hide messages"), with the unread count after the label
 * ("Messages, 2 new" to screen readers). The actions row's passes `md`, `solid` and `message-circle-more`.
 */
function ConsultMessagesButton({
	open,
	onToggle,
	unread = 0,
	size = "xs",
	solid = false,
	icon: Icon = MessageCircleIcon,
	className,
}: {
	open: boolean;
	onToggle: () => void;
	unread?: number;
	size?: "xs" | "md";
	/** Solid (`neutral`) while closed, as the alert's actions row; open, the outline on `accent` either way. */
	solid?: boolean;
	icon?: LucideIcon;
	className?: string;
}) {
	return (
		<Button
			variant={solid && !open ? "neutral" : "outline"}
			size={size}
			aria-expanded={open}
			aria-label={unread ? `Messages, ${unread} new` : undefined}
			onClick={onToggle}
			className={cn("aria-expanded:bg-accent", className)}
		>
			<Icon aria-hidden='true' />
			{open ? "Hide messages" : "Messages"}
			{unread ? <Counter count={unread} max={99} /> : null}
		</Button>
	);
}

/**
 * The Messages column: the thread, oldest first, the nurse's on the left and the clinician's on the right (as the chat's
 * questions), each with who and when; then the message field, pinned to the column's bottom. A new message rises in and
 * the thread scrolls to it. `typing` shows the nurse typing under the last message.
 */
function ConsultMessages({
	messages,
	onSend,
	nurse,
	typing = false,
	autoFocus = false,
}: {
	messages: readonly ConsultMessage[];
	onSend: (text: string) => void;
	/** Who the thread is with, "Kelly Ortiz, RN". */
	nurse: string;
	/** The nurse is typing a reply. */
	typing?: boolean;
	/** Focus the field as the column opens (from its button). */
	autoFocus?: boolean;
}) {
	const { prefersReducedMotion } = useMotionPreference();
	const now = useCurrentMinute();
	const [draft, setDraft] = React.useState("");
	const field = React.useRef<HTMLInputElement>(null);
	const thread = React.useRef<HTMLDivElement>(null);

	// The latest message in view: at once as the column opens, then smoothly as each one arrives (after layout, so the
	// new message's height counts).
	const opened = React.useRef(false);
	React.useLayoutEffect(() => {
		const list = thread.current;
		if (!list) return;
		list.scrollTo({
			top: list.scrollHeight,
			behavior: opened.current && !prefersReducedMotion ? "smooth" : "auto",
		});
		opened.current = true;
	}, [messages.length, typing, prefersReducedMotion]);
	React.useEffect(() => {
		if (autoFocus) field.current?.focus({ preventScroll: true });
	}, [autoFocus]);

	const submit = (event: React.FormEvent) => {
		event.preventDefault();
		const text = draft.trim();
		if (!text) return;
		onSend(text);
		setDraft("");
	};

	return (
		// The thread scrolls on its own above the field, 16px apart, so the field never covers a message (Nov 5, 2026,
		// user's call); the field sits 16px from the column's bottom, as Figma's 16px bottom padding (the column's 24px,
		// less 8px). The column itself doesn't scroll: this fills it under the label.
		<div className='-mb-2 flex min-h-0 flex-1 flex-col gap-4'>
			{/* Full width, so its scrollbar is at the column's edge; the messages keep the column's 24px sides. */}
			{/* A log: new messages are read out politely as they arrive. */}
			<div
				ref={thread}
				role='log'
				aria-label={`Messages with ${nurse}`}
				className='-mx-6 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6'
			>
				{messages.length ? (
					<ol className='flex flex-col gap-4'>
						<AnimatePresence initial={false}>
							{messages.map((message) => {
								const you = message.from === "you";
								const sent = now !== null ? formatRelativeDate(message.sentAt, now) : undefined;
								return (
									<motion.li
										key={message.id}
										variants={prefersReducedMotion ? fadeVariants : revealVariants}
										initial='initial'
										animate='animate'
										className={cn("flex flex-col gap-1", you ? "items-end" : "items-start")}
									>
										<p className='text-xs text-muted-foreground'>
											{you ? "You" : (message.by ?? nurse)}
											{sent ? (
												<>
													{" · "}
													<time dateTime={message.sentAt} title={sent.title}>
														{sent.label}
													</time>
												</>
											) : null}
										</p>
										{message.photo ? (
											// A photo: the picture, then what it is and its readings, as one message.
											<figure className='flex w-[85%] flex-col gap-2 rounded-2xl rounded-bl-md border border-border bg-background p-2'>
												<BedsidePhotoImage photo={message.photo} />
												<figcaption className='flex flex-col gap-0.5 px-1.5 pb-1 text-sm'>
													<span className='font-semibold text-foreground'>{message.photo.title}</span>
													<span className='text-foreground'>
														{message.photo.values.map((row) => `${row.label} ${row.value}`).join(" · ")}
													</span>
												</figcaption>
											</figure>
										) : null}
										{message.text ? (
											<p
												className={cn(
													"max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap text-foreground",
													you ? "rounded-br-md bg-neutral-muted" : "rounded-bl-md border border-border bg-background",
												)}
											>
												{message.text}
											</p>
										) : null}
									</motion.li>
								);
							})}
						</AnimatePresence>
					</ol>
				) : (
					// No message yet: a quiet line centered in the thread's space (Intercept-Live `222:18375`, Nov 5, 2026): the
					// icon in `icon-subtle` over "No messages", 8px apart. Not the EmptyState component, whose title is a heading.
					<div className='flex flex-1 flex-col items-center justify-center gap-2 text-center'>
						<MessageCircleIcon aria-hidden='true' className='size-5 text-icon-subtle' />
						<p className='text-sm text-muted-foreground'>No messages</p>
					</div>
				)}
				<AnimatePresence>
					{typing ? (
						<motion.p
							key='typing'
							variants={fadeVariants}
							initial='initial'
							animate='animate'
							exit='exit'
							className='text-xs text-muted-foreground'
						>
							{nurse} is typing…
						</motion.p>
					) : null}
				</AnimatePresence>
			</div>

			<form onSubmit={submit} className='shrink-0'>
				<div className='flex h-12 items-center gap-2 rounded-full border border-input bg-background py-2 pr-2 pl-5 shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring-outside'>
					<input
						ref={field}
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						placeholder='Send a message…'
						aria-label={`Message ${nurse}`}
						className='min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground'
					/>
					<Button type='submit' variant='neutral' size='sm' disabled={!draft.trim()}>
						Send
					</Button>
				</div>
			</form>
		</div>
	);
}

export {
	ConsultMessages,
	ConsultMessagesButton,
	useConsultMessages,
	useNewIncoming,
	useUnreadMessages,
	type ConsultMessage,
	type ConsultReplies,
};
