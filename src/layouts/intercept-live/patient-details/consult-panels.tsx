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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/forms/select";

import {
	ConsultNotetaker,
	ConsultPanelContent,
	ConsultTile,
	PathwayContent,
	threadWith,
	useConsult,
	type AlertConsultState,
	type AlertDetailData,
	type PatientConsultData,
} from "../alert-panel/alert-panel";
import type { CarePathwayDecision } from "../alert-panel/care-pathway";
import { useSessionState } from "../alert-panel/consult-session";
import type { DischargeDecision } from "../alert-panel/discharge-plan";
import type { KeepOrTransferDecision } from "../alert-panel/keep-or-transfer";
import type { BundleDecision } from "../alert-panel/sepsis-bundle";
import {
	ConsultMessages,
	useConsultMessages,
	useNewIncoming,
	useUnreadMessages,
	type ConsultMessage,
} from "../alert-panel/consult-messages";
import { PagePanel, useHideToasts, usePatientHeaderActions } from "../side-panel";

// The patient page's Video consult and Messages (Nov 5, 2026, Intercept-Live "Video and Messages Interations",
// `219:16129`): the app header's two buttons open them as panels right of the page, full height, Video consult first.
// The call, its AI Notetaker and the thread with the bedside nurse are the alert panel's (`alert-panel.tsx`,
// `consult-messages.tsx`). Pathway (Nov 6, 2026, user's call: a side panel, as on the alert) shares the Messages panel's
// place, one at a time as on the alert panel, and shows the alert panel's own Pathway column (`PathwayContent`).

/**
 * The patient's pathways, for the page's Pathway panel: the details of their alerts that come with one (a pathway, a
 * sepsis bundle or a protocol), the alert to show first, then the others, and where each decision goes, by alert.
 */
type PatientPathways = {
	details: AlertDetailData[];
	onPathwayDecision?: (alertId: string, decision: CarePathwayDecision, detail: AlertDetailData) => void;
	onTransferDecision?: (alertId: string, decision: KeepOrTransferDecision, detail: AlertDetailData) => void;
	onBundleDecision?: (alertId: string, decision: BundleDecision) => void;
	onDischargeDecision?: (decision: DischargeDecision) => void;
};

/**
 * Opens the page's Pathway panel, in Messages' place, from anywhere on the patient's page (the Care plan's Open
 * pathway): it's kept in the patient's consult session, which the page's panels read.
 */
function useOpenPathwayPanel() {
	const [, setPathwayOpen] = useSessionState("pathwayOpen", false);
	const [, setMessagesOpen] = useSessionState("messagesOpen", false);
	const [, setAlertsOpen] = useSessionState("alertsOpen", false);
	return React.useCallback(() => {
		setMessagesOpen(false);
		setPathwayOpen(true);
	}, [setMessagesOpen, setPathwayOpen]);
}

/**
 * Opens the page's Alerts panel from the patient header's View alerts (Nov 9, 2026, user's call): an open call, Messages
 * or Pathway stays beside it (three panels at once). Kept in the patient's consult session, as the other panels.
 */
function useOpenAlertsPanel() {
	const [, setAlertsOpen] = useSessionState("alertsOpen", false);
	return React.useCallback(() => setAlertsOpen(true), [setAlertsOpen]);
}

/**
 * An alert's own way to its pathway, from its card in the Alerts panel (Nov 9, 2026, user's call: "without opening the
 * modal"): `toggle(alertId)` opens that alert's pathway in the Pathway panel, right of Alerts, which stays open (Messages
 * closes), or closes it when it's the one shown. `shownAlertId` is the alert whose pathway is showing.
 */
function useAlertPathwayPanel() {
	const [pathwayOpen, setPathwayOpen] = useSessionState("pathwayOpen", false);
	const [messagesOpen, setMessagesOpen] = useSessionState("messagesOpen", false);
	const [pathwayAlertId, setPathwayAlertId] = useSessionState<string | undefined>("pathwayAlert", undefined);
	const shownAlertId = pathwayOpen && !messagesOpen ? pathwayAlertId : undefined;
	const toggle = React.useCallback(
		(alertId: string) => {
			if (shownAlertId === alertId) {
				setPathwayOpen(false);
				return;
			}
			setPathwayAlertId(alertId);
			setMessagesOpen(false);
			setPathwayOpen(true);
		},
		[shownAlertId, setPathwayOpen, setPathwayAlertId, setMessagesOpen],
	);
	return { shownAlertId, toggle };
}

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
								// 16px semibold, 8px in, as Figma's title (a Breadcrumb `sm` page; Intercept-Live `221:18234`, Nov 6, 2026).
							className='min-w-0 flex-1 truncate px-2 text-base font-semibold text-foreground outline-none'
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
 * The patient page's video consult, messages with the bedside nurse and pathway, in panels right of the page (Intercept-Live
 * `219:16129`, Nov 5, 2026). The app header's Video consult opens the call's panel and rings the bedside at once (the
 * call, then the AI Notetaker under it, its button in the panel's header); pressed again (it's an icon then), it ends
 * the call and closes the panel. The call's own End leaves the panel open, the notes still to come, with Video consult in
 * the tile to call again. Messages opens the thread to the right of the call (it takes focus in its field); its × or the
 * header's pressed Messages closes it, and so does Escape inside it. A new message from the bedside opens it on its own,
 * without moving focus, as on the alert panel. The header's unread count is the thread's. Mounted per patient (keyed by
 * the page): switching patient or going Back ends the call. The call, its notetaker and the thread are the patient's
 * consult session (`consult-session.tsx`): opened from the alert panel's patient name, the page picks them up as they
 * were, the call still on with its panel open and Messages open or closed (Nov 5, 2026, user's call).
 *
 * With `pathways`, the header's Pathway opens the alert's Pathway column as a panel in Messages' place (Nov 6, 2026):
 * the pathway to review, edit, accept or decline, then what it runs (the sepsis bundle, the DKA protocol, the bedside
 * tasks) and keep or transfer, as on the alert. What's being done on it (a dose edit, a note, a decline's reason) and
 * whether it's open go with the consult session too, both ways between here and the alert panel. With more than one
 * alert's pathway, a select at its top picks the alert. Its × or the header's pressed Pathway closes it; Escape closes
 * an open edit or form first.
 *
 * Inside the patient's `ConsultSessionScope`, which the page provides around everything on it.
 */
function PatientConsultPanels({
	data,
	pathways,
	defaultConsult = "idle",
	defaultPathway,
	onOpenConsult,
	onOpenMessages,
	onConsultNote,
	onSendMessage,
}: {
	data: PatientConsultData;
	/** The call as the panels open: `live` for a consult request answered on the patient's page, its panel open. */
	defaultConsult?: AlertConsultState;
	/** Opens with this alert's pathway out, scrolled to `focus` (a notice's Review referrals). */
	defaultPathway?: { alertId?: string; focus?: "discharge" };
	pathways?: PatientPathways;
	/** The call's panel opened (the call rings). */
	onOpenConsult?: () => void;
	/** The messages panel opened from the header. */
	onOpenMessages?: () => void;
	/** The clinician approved the AI Notetaker's draft. */
	onConsultNote?: (note: string) => void;
	/** A message the clinician sent the bedside nurse. */
	onSendMessage?: (text: string) => void;
}) {
	const [consult, setConsult] = useConsult(defaultConsult);
	// A call picked up from the alert panel opens with its panel; Messages as they were there.
	const [consultOpen, setConsultOpen] = React.useState(consult !== "idle");
	const [messagesOpen, setMessagesOpen] = useSessionState("messagesOpen", false);
	// Pathway shares Messages' place: one at a time.
	const [pathwayOpen, setPathwayOpen] = useSessionState("pathwayOpen", false);
	// Alerts (`PatientAlertsPanel`) stays open beside either (Nov 9, 2026, user's call: three panels at once: the call,
	// Alerts, and Messages or Pathway).
	const pathwayDetails = pathways?.details ?? [];
	const [pathwayAlertId, setPathwayAlertId] = useSessionState<string | undefined>("pathwayAlert", undefined);
	const pathwayDetail = pathwayDetails.find((detail) => detail.alert.id === pathwayAlertId) ?? pathwayDetails[0];
	const pathwayShown = pathwayOpen && !messagesOpen && Boolean(pathwayDetail);
	// Opened at an alert's pathway (a notice's Review referrals): its pathway out, in Messages' place.
	React.useEffect(() => {
		if (!defaultPathway) return;
		if (defaultPathway.alertId) setPathwayAlertId(defaultPathway.alertId);
		setMessagesOpen(false);
		setPathwayOpen(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- once, as the page opens.
	}, []);
	const pathwayEscape = React.useRef<(() => boolean) | null>(null);
	// The field takes focus when the clinician opens the thread, not when a new message opens it.
	const [focusMessages, setFocusMessages] = React.useState(false);
	const [notetakerSlot, setNotetakerSlot] = React.useState<HTMLDivElement | null>(null);
	const [noteSlot, setNoteSlot] = React.useState<HTMLDivElement | null>(null);
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
		setPathwayOpen(false);
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
			setPathwayOpen(false);
			setMessagesOpen(true);
			onOpenMessages?.();
		},
		// No Pathway in the header (Nov 9, 2026, user's call: a pathway belongs to the alert that suggests it, not to the
		// patient): the panel opens from the alert, through the Overview's Care plan (Review / Open pathway), and closes
		// with its own ×.
	});

	return (
		<PagePanel>
			<PatientPanel
				id='patient-video-consult'
				title='Video consult'
				open={consultOpen}
				action={
					// The notetaker's button, then × (Nov 9, 2026, user's call; none since Nov 6), 8px apart, as Messages'. × does
					// what the app header's "Close video consult" does: closes the panel, which ends the call.
					<div className='flex shrink-0 items-center gap-2'>
						<div ref={setNotetakerSlot} className='flex shrink-0 items-center empty:hidden' />
						<Button variant='ghost' size='icon-md' aria-label='Close video consult' onClick={closeConsult}>
							<XIcon aria-hidden='true' />
						</Button>
					</div>
				}
				onOpened={(heading) => heading?.focus({ preventScroll: true })}
				className={cn(panelShadow, "order-1")}
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
								noteSlot={noteSlot}
							/>
						}
					/>
				</div>
				{/* Add a note, pinned under the scrolling content, 16px from the panel's bottom (Intercept-Live `230:6415`). */}
				<div ref={setNoteSlot} className='shrink-0 px-6 pb-4 empty:hidden' />
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
				className={cn(panelShadow, "order-3")}
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
			<PatientPanel
				id='patient-pathway'
				title='Pathway'
				open={pathwayShown}
				action={
					<Button variant='ghost' size='icon-md' aria-label='Close pathway' onClick={() => setPathwayOpen(false)}>
						<XIcon aria-hidden='true' />
					</Button>
				}
				onOpened={(heading) => heading?.focus({ preventScroll: true })}
				onKeyDown={(event) => {
					// Escape closes an open dose edit, decline or form first, then the panel. Not from a select's list (a
					// portal, outside the panel's DOM).
					if (event.key !== "Escape" || !event.currentTarget.contains(event.target as Node)) return;
					if (!pathwayEscape.current?.()) setPathwayOpen(false);
				}}
				className={cn(panelShadow, "order-3")}
			>
				{pathwayDetail ? (
					// The alert panel's Pathway column: 24px in, its parts 16px apart, its decision stuck to the bottom.
					<div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6'>
						{pathwayDetails.length > 1 ? (
							<Select value={pathwayDetail.alert.id} onValueChange={setPathwayAlertId}>
								<SelectTrigger size='sm' aria-label='Alert' className='w-full'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{pathwayDetails.map((detail) => (
										<SelectItem key={detail.alert.id} value={detail.alert.id}>
											{detail.alert.title}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : null}
						<PathwayContent
							key={pathwayDetail.alert.id}
							data={pathwayDetail}
							onPathwayDecision={
								pathways?.onPathwayDecision &&
								((decision) => pathways.onPathwayDecision?.(pathwayDetail.alert.id, decision, pathwayDetail))
							}
							onTransferDecision={
								pathways?.onTransferDecision &&
								((decision) => pathways.onTransferDecision?.(pathwayDetail.alert.id, decision, pathwayDetail))
							}
							onBundleDecision={
								pathways?.onBundleDecision &&
								((decision) => pathways.onBundleDecision?.(pathwayDetail.alert.id, decision))
							}
							onDischargeDecision={pathways?.onDischargeDecision}
							escapeRef={pathwayEscape}
							fill
							focusDischarge={defaultPathway?.focus === "discharge"}
						/>
					</div>
				) : null}
			</PatientPanel>
		</PagePanel>
	);
}

/**
 * The page's Alerts panel (Nov 9, 2026, user's call): every alert of the patient, the unresolved at the top, opened by
 * the patient header's View alerts. It stays open beside the call and Messages or Pathway (three panels at once; an
 * alert's Pathway opens right of it), and the panels keep their order with CSS `order`: the call, Alerts, then
 * Messages or Pathway. × or Escape closes it.
 * It lists the alerts itself, so the shell's alert toasts hide while it's open, as with the live feed.
 */
function PatientAlertsPanel({ children }: { children: React.ReactNode }) {
	const [alertsOpen, setAlertsOpen] = useSessionState("alertsOpen", false);
	useHideToasts(alertsOpen);
	return (
		<PagePanel>
			<PatientPanel
				id='patient-alerts'
				title='Alerts'
				open={alertsOpen}
				action={
					<Button variant='ghost' size='icon-md' aria-label='Close alerts' onClick={() => setAlertsOpen(false)}>
						<XIcon aria-hidden='true' />
					</Button>
				}
				onOpened={(heading) => heading?.focus({ preventScroll: true })}
				onKeyDown={(event) => {
					// Not from an alert's menus or forms in a portal, outside the panel's DOM.
					if (event.key === "Escape" && event.currentTarget.contains(event.target as Node)) setAlertsOpen(false);
				}}
				// Between the call and Messages / Pathway, whichever opened first, so an alert's pathway opens on its right.
				className={cn(panelShadow, "order-2")}
			>
				<div className='flex min-h-0 flex-1 flex-col overflow-y-auto p-6'>{children}</div>
			</PatientPanel>
		</PagePanel>
	);
}

export {
	PatientAlertsPanel,
	PatientConsultPanels,
	useAlertPathwayPanel,
	useOpenAlertsPanel,
	useOpenPathwayPanel,
	type PatientPathways,
};
