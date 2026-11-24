import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { FileTextIcon, MessageCircleIcon, type LucideIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import { ChatDayDivider, ChatMessage, type ChatMessageAuthor } from "@/components/data-display/chat-message";
import { Counter } from "@/components/data-display/counter";
import { ChatComposer } from "@/components/forms/chat-composer";
import { AiSparkleIcon } from "@/components/icons/ai-sparkle-icon";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import {
	fadeVariants,
	iconSwapReducedVariants,
	iconSwapVariants,
	revealVariants,
	unreadFlashVariants,
	useMotionPreference,
} from "@/lib/motion";
import { formatDayLabel } from "@/lib/relative-date";
import { cn } from "@/lib/utils";

import { useCurrentUser } from "../current-user";
import {
	AddQuickRequestDialog,
	fillQuickRequest,
	quickRequestCommands,
	useQuickRequests,
	type QuickRequest,
} from "../shared/quick-requests";
import { useSessionState } from "./consult-session";
import { BedsidePhotoImage, type BedsidePhoto } from "./low-bandwidth";

// The video consult's messages with the bedside nurse (Nov 5, 2026, user's call; intercept.ds `alert-modal` ›
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
	/** A file sent with it (a PDF, a document), shown as a card with its name and size. */
	file?: ConsultFile;
	/**
	 * The patient it's about, in a conversation with a person that spans patients (the Messages page, PRD Messages
	 * MSG-001); none for a message about no patient. A patient's own thread (the alert panel, the patient page) leaves it out.
	 */
	patientId?: string;
	/** When it was sent, ISO 8601. */
	sentAt: string;
};

/** A file attached to a message: what it's called, how big, and where to get it. */
type ConsultFile = {
	name: string;
	/** Bytes. */
	size: number;
	/** Its media type, e.g. "application/pdf". */
	type: string;
	url: string;
};

/** What the composer's + sends: an image as a photo, anything else as a file. */
type ConsultAttachment = { photo: BedsidePhoto; file?: undefined } | { file: ConsultFile; photo?: undefined };

/**
 * A picked file as an attachment, sent by the clinician now. The prototype keeps it as an object URL; the app uploads it
 * and sends its link through the hospital's messaging.
 */
const attachmentFromFile = (file: File): ConsultAttachment => {
	const url = URL.createObjectURL(file);
	if (file.type.startsWith("image/")) {
		return {
			photo: {
				id: url,
				title: file.name,
				kind: "device-screen",
				values: [],
				takenAt: new Date().toISOString(),
				takenBy: "You",
				src: url,
			},
		};
	}
	return { file: { name: file.name, size: file.size, type: file.type, url } };
};

/** "240 KB", "1.2 MB". */
const formatFileSize = (bytes: number) =>
	bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

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
	onSend?: (text: string, patientId?: string) => void,
	replies: ConsultReplies = [],
) {
	// The clinician's messages and the replies, in the patient's consult session: the thread goes on where the patient is
	// shown next (the patient's page).
	const [local, setLocal] = useSessionState<ConsultMessage[]>("messages", []);
	const [typing, setTyping] = React.useState(false);
	const nextReply = React.useRef(0);
	const pending = React.useRef(0);
	const timers = React.useRef<number[]>([]);
	React.useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);
	const repliesRef = React.useRef(replies);
	repliesRef.current = replies;
	const add = React.useCallback((message: Omit<ConsultMessage, "id" | "sentAt">) => {
		setLocal((current) => [
			...current,
			{ ...message, id: `local-${current.length}`, sentAt: new Date().toISOString() },
		]);
	}, []);
	const send = React.useCallback(
		// `patientId`: the patient the message is about (the Messages page); the reply is about the same one.
		(text: string, patientId?: string, attachment?: ConsultAttachment) => {
			add({ from: "you", text: text || undefined, photo: attachment?.photo, file: attachment?.file, patientId });
			// The app's handler takes text; an attachment alone gets no simulated reply.
			if (!text) return;
			onSend?.(text, patientId);
			const current = repliesRef.current;
			const reply = typeof current === "function" ? current(text) : current[nextReply.current];
			if (reply === undefined) return;
			nextReply.current += 1;
			pending.current += 1;
			timers.current.push(
				window.setTimeout(() => setTyping(true), replyTypingAfterMs),
				window.setTimeout(() => {
					add({ from: "bedside", text: reply, patientId });
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
	// What was read goes with the consult session, so the patient's page doesn't count it again.
	const [sharedRead, setSharedRead] = useSessionState("messagesRead", 0);
	const [read, setRead] = React.useState(sharedRead);
	if (open && read !== count) setRead(count);
	React.useEffect(() => setSharedRead(read), [read, setSharedRead]);
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
	const { prefersReducedMotion } = useMotionPreference();
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
			{/* Brand, flashing every 2 s while there's something unread, as the app header's (Unread pattern; Nov 6, 2026,
			    user's call: everywhere); still under reduced motion. */}
			{unread ? (
				<motion.span
					aria-hidden='true'
					variants={unreadFlashVariants}
					initial='rest'
					animate={prefersReducedMotion ? "rest" : "flash"}
					className='inline-flex'
				>
					<Counter count={unread} max={99} />
				</motion.span>
			) : null}
		</Button>
	);
}

/**
 * A one-line field with its button inside, as a pill (Intercept-Live `221:17539`, `230:6395`): the Messages column's
 * Send a message and the Video consult panel's Add a note. Enter or the button submits the trimmed text, never empty.
 * The button shows only once there's text, growing in, and leaves when the field is cleared (Nov 6, 2026, user's call:
 * no disabled button always in view); instant under reduced motion. The field keeps its 48px height either way.
 */
function ConsultField({
	ref,
	value,
	onValueChange,
	onSubmit,
	placeholder,
	label,
	submitLabel,
	className,
}: {
	ref?: React.Ref<HTMLInputElement>;
	value: string;
	onValueChange: (value: string) => void;
	onSubmit: (text: string) => void;
	placeholder: string;
	/** The field's accessible name. */
	label: string;
	submitLabel: string;
	className?: string;
}) {
	const { prefersReducedMotion } = useMotionPreference();
	const hasText = Boolean(value.trim());
	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				const text = value.trim();
				if (text) onSubmit(text);
			}}
			className={cn("shrink-0", className)}
		>
			<div className='flex h-12 items-center gap-2 rounded-full border border-input bg-background py-2 pr-2 pl-5 shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring-outside'>
				<input
					ref={ref}
					value={value}
					onChange={(event) => onValueChange(event.target.value)}
					placeholder={placeholder}
					aria-label={label}
					className='min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground'
				/>
				<AnimatePresence initial={false}>
					{hasText ? (
						<motion.div
							key='submit'
							variants={prefersReducedMotion ? iconSwapReducedVariants : iconSwapVariants}
							initial='hidden'
							animate='shown'
							exit='hidden'
							className='shrink-0'
						>
							<Button type='submit' variant='neutral' size='sm'>
								{submitLabel}
							</Button>
						</motion.div>
					) : null}
				</AnimatePresence>
			</div>
		</form>
	);
}

/**
 * The Messages column: the thread, oldest first, the nurse's on the left and the clinician's on the right (as the chat's
 * questions), each with who and when; then the message field, pinned to the column's bottom. A new message rises in and
 * the thread scrolls to it. `typing` shows the nurse typing under the last message.
 */
/** How close two messages from the same author are to read as one run: the second drops its name and time. */
const groupWindowMs = 30_000;

/** "Rachel Lindgren, RRT" → "RL": a sender's initials from their name, credential left out. */
const initialsOf = (name: string) =>
	name
		.split(",")[0]
		.trim()
		.split(/\s+/)
		.map((word) => word[0]?.toUpperCase() ?? "")
		.slice(0, 2)
		.join("");

function ConsultMessages({
	messages,
	onSend,
	nurse,
	typing = false,
	autoFocus = false,
	filter,
	placeholder = "Send a message…",
	contact,
	onAttach,
	patientName,
	patientId,
}: {
	messages: readonly ConsultMessage[];
	onSend: (text: string) => void;
	/** Who the thread is with, "Kelly Ortiz, RN". */
	nurse: string;
	/** The nurse is typing a reply. */
	typing?: boolean;
	/** Focus the field as the column opens (from its button). */
	autoFocus?: boolean;
	/**
	 * Which messages show, e.g. the patient page's Messages filter (by sender, photos only). With none matching, the
	 * thread says so; the field stays.
	 */
	filter?: (message: ConsultMessage) => boolean;
	/** The field's placeholder, e.g. "Message about Sarah Miller…". */
	placeholder?: string;
	/** Who the thread is with, for the avatar on their messages: initials, photo, color, presence. */
	contact?: Omit<ChatMessageAuthor, "name">;
	/** Sends a picked file (the composer's +): an image as a photo, anything else as a file. Without it, no +. */
	onAttach?: (attachment: ConsultAttachment) => void;
	/** The patient the thread is about, "Sarah Miller": a quick request's `{patient}` and `{first name}`. */
	patientName?: string;
	/** Their id, so Intercept can read their chart when it drafts a command. */
	patientId?: string;
}) {
	const { prefersReducedMotion } = useMotionPreference();
	const now = useCurrentMinute();
	// An unsent message goes with the consult session too.
	const [draft, setDraft] = useSessionState("messagesDraft", "");
	const field = React.useRef<HTMLDivElement>(null);
	const me = useCurrentUser();
	const filePicker = React.useRef<HTMLInputElement>(null);
	// The commands menu's quick requests (Nov 23, 2026, user's calls): picking one writes the request into the field, to
	// finish and send; Add command, last, opens the form for the clinician's own, which every thread then offers.
	const { requests, add: addRequest, draft: drafter } = useQuickRequests();
	const [adding, setAdding] = React.useState<string | null>(null);
	// A command with instructions is drafted by Intercept from the thread and the patient's chart (Nov 23, 2026, user's
	// call): Stop takes Send's place meanwhile, and the draft lands in the field to review, marked as Intercept's until
	// it's sent or cleared. Typing meanwhile, or Stop, keeps what the clinician wrote.
	const [drafting, setDrafting] = React.useState<string | null>(null);
	const [drafted, setDrafted] = React.useState(false);
	const draftRun = React.useRef(0);
	const draftNow = React.useRef(draft);
	draftNow.current = draft;
	React.useEffect(() => {
		if (!draft) setDrafted(false);
	}, [draft]);
	const pickRequest = (request: QuickRequest) => {
		const filled = fillQuickRequest(request.message, { patient: patientName, nurse });
		if (!request.instructions || !drafter) {
			setDraft(filled);
			return;
		}
		const run = ++draftRun.current;
		setDrafting(request.name);
		setDrafted(false);
		drafter(request, {
			patient: patientName,
			patientId,
			nurse,
			messages: messages.flatMap((message) =>
				message.text ? [{ from: message.from, text: message.text, sentAt: message.sentAt }] : [],
			),
		})
			.catch(() => filled)
			.then((text) => {
				if (run !== draftRun.current) return;
				setDrafting(null);
				if (draftNow.current.trim()) return;
				setDraft(text);
				setDrafted(true);
			});
	};
	const stopDrafting = () => {
		draftRun.current++;
		setDrafting(null);
	};
	const quickRequests = quickRequestCommands(requests, pickRequest);
	const thread = React.useRef<HTMLDivElement>(null);
	const shown = filter ? messages.filter(filter) : messages;

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
	}, [shown.length, typing, prefersReducedMotion]);
	React.useEffect(() => {
		if (autoFocus) field.current?.querySelector("textarea")?.focus({ preventScroll: true });
	}, [autoFocus]);

	const submit = (text: string) => {
		onSend(text);
		setDraft("");
		setDrafted(false);
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
				{shown.length ? (
					// No gap of its own: each item sets its space above, 16px, or 8px under the same author's message.
					<ol className='flex flex-col'>
						<AnimatePresence initial={false}>
							{shown.flatMap((message, index) => {
								const you = message.from === "you";
								const previous = index > 0 ? shown[index - 1] : undefined;
								// A day divider before the first message of each day, oldest first ("Yesterday", then "Today"): the
								// day between two zigzag rules (Nov 23, 2026, Intercept-Live `289:10402`), in every thread.
								const day = now !== null ? formatDayLabel(message.sentAt, now) : undefined;
								const newDay = day && (!previous || formatDayLabel(previous.sentAt, now ?? undefined) !== day);
								// Within 30 s of the same author's message, it joins it: no name or time, 8px under it (Nov 23,
								// 2026, intercept.ds "several messages example" `1635:9837`).
								const grouped =
									!newDay &&
									previous !== undefined &&
									previous.from === message.from &&
									previous.by === message.by &&
									Math.abs(Date.parse(message.sentAt) - Date.parse(previous.sentAt)) <= groupWindowMs;
								const author: ChatMessageAuthor = you
									? { name: "You", initials: me?.initials, photo: me?.src, tone: me?.tone }
									: message.by
										? { name: message.by, initials: initialsOf(message.by) }
										: { name: nurse, ...contact };
								return [
									...(newDay
										? [
												<motion.li
													key={`day-${day}`}
													// A heading, not a message: the list's items stay the messages for screen readers.
													role='presentation'
													variants={prefersReducedMotion ? fadeVariants : revealVariants}
													initial='initial'
													animate='animate'
													className={cn(index > 0 && "mt-4")}
												>
													<ChatDayDivider>{day}</ChatDayDivider>
												</motion.li>,
											]
										: []),
									<motion.li
										key={message.id}
										variants={prefersReducedMotion ? fadeVariants : revealVariants}
										initial='initial'
										animate='animate'
										className={cn(index > 0 || newDay ? (grouped ? "mt-2" : "mt-4") : undefined)}
									>
										<ChatMessage
											variant={you ? "sent" : "received"}
											author={author}
											sentAt={message.sentAt}
											showMeta={!grouped}
											attachment={
												message.photo ? (
													// A photo: the picture, then what it is and its readings, as one message.
													<figure
														className={cn(
															"flex w-[85%] max-w-[38.25rem] flex-col gap-2 rounded-2xl border border-border bg-background p-2",
															you ? "rounded-br-md" : "rounded-bl-md",
														)}
													>
														<BedsidePhotoImage photo={message.photo} />
														<figcaption className='flex flex-col gap-0.5 px-1.5 pb-1 text-sm'>
															<span className='font-semibold text-foreground'>{message.photo.title}</span>
															{message.photo.values.length ? (
																<span className='text-foreground'>
																	{message.photo.values.map((row) => `${row.label} ${row.value}`).join(" · ")}
																</span>
															) : null}
														</figcaption>
													</figure>
												) : message.file ? (
													// A file: its icon, name and size, opening it in a new tab.
													<a
														href={message.file.url}
														target='_blank'
														rel='noreferrer'
														download={message.file.name}
														className={cn(
															"flex max-w-[min(85%,38.25rem)] items-center gap-3 rounded-2xl border border-border bg-background px-3.5 py-2.5 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
															you ? "rounded-br-md" : "rounded-bl-md",
														)}
													>
														<FileTextIcon aria-hidden className='size-5 shrink-0 text-icon-muted' />
														<span className='flex min-w-0 flex-col'>
															<span className='truncate text-sm font-medium text-foreground'>{message.file.name}</span>
															<span className='text-xs text-muted-foreground'>{formatFileSize(message.file.size)}</span>
														</span>
													</a>
												) : undefined
											}
										>
											{message.text}
										</ChatMessage>
									</motion.li>,
								];
							})}
						</AnimatePresence>
					</ol>
				) : (
					// No message yet: a quiet line centered in the thread's space (Intercept-Live `222:18375`, Nov 5, 2026): the
					// icon in `icon-subtle` over "No messages", 8px apart. Not the EmptyState component, whose title is a heading.
					<div className='flex flex-1 flex-col items-center justify-center gap-2 text-center'>
						<MessageCircleIcon aria-hidden='true' className='size-5 text-icon-subtle' />
						<p className='text-sm text-muted-foreground'>
							{messages.length ? "No messages match the filter" : "No messages"}
						</p>
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

			{/* UCL's ChatComposer, as Figma's thread (Intercept-Live `289:10408`; it was the pill ConsultField until Nov 23,
			    2026): Enter or Send sends, the microphone dictates into the field. */}
			<div ref={field} className='shrink-0'>
				{drafting || (drafted && draft) ? (
					<p role='status' className='mb-2 flex items-center gap-1.5 px-1 text-xs text-muted-foreground'>
						<AiSparkleIcon className={cn("size-3.5 shrink-0", drafting && "animate-pulse motion-reduce:animate-none")} />
						{drafting
							? `Drafting /${drafting} from the conversation and the chart…`
							: "Drafted by Intercept from the conversation and the chart. Review before sending."}
					</p>
				) : null}
				<ChatComposer
					value={draft}
					onValueChange={setDraft}
					onSubmit={submit}
					generating={drafting !== null}
					onStop={stopDrafting}
					placeholder={drafting ? "Intercept is drafting…" : placeholder}
					label={`Message ${nurse}`}
					dictation
					onAttach={onAttach ? () => filePicker.current?.click() : undefined}
					commands={quickRequests}
					onAddCommand={(name) => setAdding(name)}
				/>
				<AddQuickRequestDialog
					open={adding !== null}
					onOpenChange={(open) => {
						if (!open) {
							setAdding(null);
							field.current?.querySelector("textarea")?.focus();
						}
					}}
					defaultName={adding ?? ""}
					taken={requests.map((request) => request.name)}
					onAdd={addRequest}
				/>
				{/* The + opens this: any file, an image sent as a photo. */}
				{onAttach ? (
					<input
						ref={filePicker}
						type='file'
						className='sr-only'
						tabIndex={-1}
						aria-hidden='true'
						onChange={(event) => {
							const picked = event.target.files?.[0];
							if (picked) onAttach(attachmentFromFile(picked));
							event.target.value = "";
						}}
					/>
				) : null}
			</div>
		</div>
	);
}

export {
	ConsultField,
	ConsultMessages,
	ConsultMessagesButton,
	useConsultMessages,
	useNewIncoming,
	useUnreadMessages,
	type ConsultAttachment,
	type ConsultFile,
	type ConsultMessage,
	type ConsultReplies,
};
