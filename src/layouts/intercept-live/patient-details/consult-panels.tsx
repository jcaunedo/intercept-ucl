import * as React from "react";
import { ListFilterIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/overlays/dropdown-menu";
import { enterTransition, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

import {
	ConsultNotetaker,
	ConsultPanelContent,
	ConsultTile,
	threadWith,
	useConsult,
	type PatientConsultData,
} from "../alert-modal/alert-modal";
import { ConsultSessionScope, useSessionState } from "../alert-modal/consult-session";
import {
	ConsultMessages,
	useConsultMessages,
	useNewIncoming,
	useUnreadMessages,
	type ConsultMessage,
} from "../alert-modal/consult-messages";
import { PagePanel, usePatientHeaderActions } from "../side-panel";

// The patient page's Video consult and Messages (Nov 5, 2026, Intercept-Live "Video and Messages Interations",
// `219:16129`): the app header's two buttons open them as panels right of the page, full height, Video consult first.
// The call, its AI Notetaker and the thread with the bedside nurse are the alert panel's (`alert-modal.tsx`,
// `consult-messages.tsx`).

/** Each panel's width, Figma's. Fixed: the call keeps its 352 × 248 shape at any width, and nothing needs resizing. */
const panelWidth = 416;

// The shadows fall to the right (Nov 5, 2026, user's call: "review the shadows, are to the right"): each panel sits
// under whatever is on its left, the page or the call. The canvas sits under the shell's page panel slot in the stacking
// order, so a panel can't show the page's shadow from below: each panel draws it as an inset on its own left edge, and
// casts none itself. The same shadow on both (user's call, same day: "use the shadow 1 in 2"; Messages had Figma's 8%).
const panelShadow = "shadow-[inset_16px_0_32px_-16px_oklch(0_0_0/5%)]";

/**
 * A panel right of the page, in the shell's page panel slot: a 60px header (its title, `lg` medium, and one control on
 * the right) over a rule, then its content. It slides open by growing its width (`enterTransition`, as the shell's side
 * panels), so the page narrows beside it; instant under reduced motion. `onOpened` runs once it's open.
 */
function PatientPanel({
	id,
	title,
	open,
	action,
	onOpened,
	onKeyDown,
	className,
	children,
}: {
	id: string;
	title: string;
	open: boolean;
	/** The header's control, right of the title. */
	action?: React.ReactNode;
	onOpened?: (heading: HTMLHeadingElement | null) => void;
	onKeyDown?: React.KeyboardEventHandler<HTMLElement>;
	className?: string;
	children: React.ReactNode;
}) {
	const { resolve } = useMotionPreference();
	const heading = React.useRef<HTMLHeadingElement>(null);
	return (
		<AnimatePresence initial={false}>
			{open ? (
				<motion.aside
					key={id}
					id={id}
					aria-labelledby={`${id}-title`}
					initial={{ width: 0 }}
					animate={{ width: panelWidth }}
					exit={{ width: 0 }}
					transition={resolve(enterTransition)}
					onAnimationComplete={(definition) => {
						if ((definition as { width?: number }).width === panelWidth) onOpened?.(heading.current);
					}}
					onKeyDown={onKeyDown}
					className={cn("relative h-full shrink-0 overflow-hidden border-l border-border bg-background", className)}
				>
					{/* At the panel's width and kept to its right edge, so the content slides in with the edge without reflowing. */}
					<div className='absolute inset-y-0 right-0 flex flex-col' style={{ width: panelWidth }}>
						<div className='flex h-15 shrink-0 items-center gap-4 border-b border-border px-4'>
							<h2
								ref={heading}
								id={`${id}-title`}
								tabIndex={-1}
								className='min-w-0 flex-1 truncate px-2 text-lg font-medium text-foreground outline-none'
							>
								{title}
							</h2>
							{action}
						</div>
						{children}
					</div>
				</motion.aside>
			) : null}
		</AnimatePresence>
	);
}

/* -------------------------------------------------------------------------- */
/* Messages filter                                                            */
/* -------------------------------------------------------------------------- */

/** Who sent a message: the clinician, the thread's nurse, or someone else at the bedside by name. */
const senderOf = (message: ConsultMessage) => (message.from === "you" ? "you" : (message.by ?? "nurse"));

/** What the thread shows: the senders left out, and whether only photos show. */
type MessagesFilterState = { hidden: string[]; photosOnly: boolean };

const noFilter: MessagesFilterState = { hidden: [], photosOnly: false };

/**
 * The Messages panel's filter (Nov 5, 2026, Intercept-Live `222:18380`; user's call: by sender and photos): a ghost
 * `list-filter` button, on the hover fill while a filter is on, opening a menu. From: a checkbox per sender in the thread
 * (the nurse, anyone else at the bedside who sent something, You), all checked at first; then Photos only (the bedside's
 * pictures of a monitor, a blood gas); then Show all while anything is filtered. The menu stays open while boxes are
 * ticked.
 */
function MessagesFilter({
	messages,
	nurse,
	value,
	onValueChange,
}: {
	messages: readonly ConsultMessage[];
	/** The thread's nurse, "Kelly Ortiz, RN". */
	nurse: string;
	value: MessagesFilterState;
	onValueChange: (value: MessagesFilterState) => void;
}) {
	// The nurse first, then the others at the bedside in the order they first wrote, then You.
	const others = [...new Set(messages.map(senderOf))].filter((sender) => sender !== "nurse" && sender !== "you");
	const senders = [
		{ key: "nurse", label: nurse },
		...others.map((sender) => ({ key: sender, label: sender })),
		{ key: "you", label: "You" },
	];
	const filtered = value.hidden.length > 0 || value.photosOnly;
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant='ghost'
					size='icon-md'
					aria-label={filtered ? "Filter messages, filtered" : "Filter messages"}
					className={cn(filtered && "bg-accent")}
				>
					<ListFilterIcon aria-hidden='true' />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end'>
				<DropdownMenuLabel>From</DropdownMenuLabel>
				{senders.map(({ key, label }) => (
					<DropdownMenuCheckboxItem
						key={key}
						checked={!value.hidden.includes(key)}
						onCheckedChange={(checked) =>
							onValueChange({
								...value,
								hidden: checked ? value.hidden.filter((item) => item !== key) : [...value.hidden, key],
							})
						}
						onSelect={(event) => event.preventDefault()}
					>
						{label}
					</DropdownMenuCheckboxItem>
				))}
				<DropdownMenuSeparator />
				<DropdownMenuCheckboxItem
					checked={value.photosOnly}
					onCheckedChange={(checked) => onValueChange({ ...value, photosOnly: checked })}
					onSelect={(event) => event.preventDefault()}
				>
					Photos only
				</DropdownMenuCheckboxItem>
				{filtered ? (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem onSelect={() => onValueChange(noFilter)}>Show all</DropdownMenuItem>
					</>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/* -------------------------------------------------------------------------- */
/* Panels                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The patient page's video consult and messages with the bedside nurse, in two panels right of the page (Intercept-Live
 * `219:16129`, Nov 5, 2026). The app header's Video consult opens the call's panel and rings the bedside at once (the
 * call, then the AI Notetaker under it, its button in the panel's header); pressed again (it's an icon then), it ends
 * the call and closes the panel. The call's own End leaves the panel open, the notes still to come, with Video consult in
 * the tile to call again. Messages opens the thread to the right of the call (it takes focus in its field); its × or the
 * header's pressed Messages closes it, and so does Escape inside it. A new message from the bedside opens it on its own,
 * without moving focus, as on the alert panel. The header's unread count is the thread's. Mounted per patient (keyed by
 * the page): switching patient or going Back ends the call. The call, its notetaker and the thread are the patient's
 * consult session (`consult-session.tsx`): opened from the alert panel's patient name, the page picks them up as they
 * were, the call still on with its panel open and Messages open or closed (Nov 5, 2026, user's call).
 */
function PatientConsultPanels(props: React.ComponentProps<typeof PatientConsultPanelsContent>) {
	return (
		<ConsultSessionScope patientId={props.data.patientId}>
			<PatientConsultPanelsContent {...props} />
		</ConsultSessionScope>
	);
}

/** The panels, inside the patient's consult session (`PatientConsultPanels`). */
function PatientConsultPanelsContent({
	data,
	onOpenConsult,
	onOpenMessages,
	onConsultNote,
	onSendMessage,
}: {
	data: PatientConsultData;
	/** The call's panel opened (the call rings). */
	onOpenConsult?: () => void;
	/** The messages panel opened from the header. */
	onOpenMessages?: () => void;
	/** The clinician approved the AI Notetaker's draft. */
	onConsultNote?: (note: string) => void;
	/** A message the clinician sent the bedside nurse. */
	onSendMessage?: (text: string) => void;
}) {
	const [consult, setConsult] = useConsult("idle");
	// A call picked up from the alert panel opens with its panel; Messages as they were there.
	const [consultOpen, setConsultOpen] = React.useState(consult !== "idle");
	const [messagesOpen, setMessagesOpen] = useSessionState("messagesOpen", false);
	// The field takes focus when the clinician opens the thread, not when a new message opens it.
	const [focusMessages, setFocusMessages] = React.useState(false);
	const [notetakerSlot, setNotetakerSlot] = React.useState<HTMLDivElement | null>(null);
	// The call's microphone, so the notetaker stops transcribing the clinician while they're muted.
	const [micMuted, setMicMuted] = React.useState(false);
	const [messages, sendMessage, nurseTyping] = useConsultMessages(
		data.messages,
		data.connection?.photos,
		onSendMessage,
		data.scriptedReplies,
	);
	if (useNewIncoming(messages) && !messagesOpen) {
		setFocusMessages(false);
		setMessagesOpen(true);
	}
	const unread = useUnreadMessages(messages, messagesOpen);
	const [filter, setFilter] = React.useState<MessagesFilterState>(noFilter);
	const nurse = threadWith(data.bedside);

	// Closing the call's panel ends the call: no call runs out of sight.
	const closeConsult = () => {
		setConsult("idle");
		setConsultOpen(false);
	};

	usePatientHeaderActions({
		videoConsultOpen: consultOpen,
		onVideoConsult: () => {
			if (consultOpen) {
				closeConsult();
				return;
			}
			setConsultOpen(true);
			setConsult("connecting");
			onOpenConsult?.();
		},
		messagesOpen,
		unreadMessages: unread,
		onOpenMessages: () => {
			if (messagesOpen) {
				setMessagesOpen(false);
				return;
			}
			setFocusMessages(true);
			setMessagesOpen(true);
			onOpenMessages?.();
		},
	});

	return (
		<PagePanel>
			<PatientPanel
				id='patient-video-consult'
				title='Video consult'
				open={consultOpen}
				action={
					// The notetaker's button, then ×, 8px apart (Intercept-Live `222:18365`).
					<div className='flex shrink-0 items-center gap-2'>
						<div ref={setNotetakerSlot} className='flex items-center' />
						<Button variant='ghost' size='icon-md' aria-label='Close video consult' onClick={closeConsult}>
							<XIcon aria-hidden='true' />
						</Button>
					</div>
				}
				onOpened={(heading) => heading?.focus({ preventScroll: true })}
				className={panelShadow}
			>
				<div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pt-6 pb-4'>
					<ConsultPanelContent
						data={data}
						tile={
							<ConsultTile
								data={data}
								state={consult}
								onEnd={() => setConsult("idle")}
								onStart={() => setConsult("connecting")}
								onMutedChange={setMicMuted}
							/>
						}
						notetaker={
							<ConsultNotetaker
								data={data}
								live={consult === "live"}
								muted={micMuted}
								onApprove={onConsultNote}
								actionSlot={notetakerSlot}
							/>
						}
					/>
				</div>
			</PatientPanel>
			<PatientPanel
				id='patient-messages'
				title='Messages'
				open={messagesOpen}
				action={
					// The filter, then ×, 8px apart (Intercept-Live `222:18380`).
					<div className='flex shrink-0 items-center gap-2'>
						<MessagesFilter
							messages={messages}
							nurse={nurse}
							value={filter}
							onValueChange={setFilter}
						/>
						<Button variant='ghost' size='icon-md' aria-label='Close messages' onClick={() => setMessagesOpen(false)}>
							<XIcon aria-hidden='true' />
						</Button>
					</div>
				}
				onKeyDown={(event) => {
					// Escape in the filter's menu (a portal, outside the panel's DOM) closes only the menu.
					if (event.key === "Escape" && event.currentTarget.contains(event.target as Node)) setMessagesOpen(false);
				}}
				className={panelShadow}
			>
				{/* 24px bottom: the thread pulls its field 8px down, to Figma's 16px. */}
				<div className='flex min-h-0 flex-1 flex-col px-6 pt-6 pb-6'>
					<ConsultMessages
						messages={messages}
						onSend={sendMessage}
						nurse={nurse}
						typing={nurseTyping}
						autoFocus={focusMessages}
						filter={
							filter.hidden.length || filter.photosOnly
								? (message) =>
										!filter.hidden.includes(senderOf(message)) && (!filter.photosOnly || Boolean(message.photo))
								: undefined
						}
					/>
				</div>
			</PatientPanel>
		</PagePanel>
	);
}

export { PatientConsultPanels };
