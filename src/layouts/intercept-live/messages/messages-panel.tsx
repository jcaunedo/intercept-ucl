import * as React from "react";
import {
	ArrowUpRightIcon,
	ImageIcon,
	MapPinIcon,
	MessageCircleIcon,
	PaperclipIcon,
	SquarePenIcon,
	XIcon,
} from "lucide-react";
import { AnimatePresence, motion, type MotionStyle } from "motion/react";

import { Avatar, AvatarFallback, AvatarImage, type AvatarFallbackProps } from "@/components/data-display/avatar";
import { Button } from "@/components/buttons/button";
import { MessageHeader } from "@/components/data-display/message-header";
import { ConversationRow } from "@/components/data-display/conversation-row";
import { Counter } from "@/components/data-display/counter";
import { EmptyState } from "@/components/feedback/empty-state";
import { SearchInput } from "@/components/forms/search-input";
import { FilterPanelButton } from "@/components/forms/filter-panel";
import { Tabs, TabsList, TabsTrigger } from "@/components/navigation/tabs";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/overlays/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/overlays/tooltip";
import { Typography } from "@/components/typography/typography";
import { AiSparkleIcon } from "@/components/icons/ai-sparkle-icon";
import { type LabTileFlag, labTileFlags } from "@/components/data-display/lab-tile";
import { mediaAbove } from "@/lib/breakpoints";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { formatRelativeDate } from "@/lib/relative-date";
import { enterTransition, useMotionPreference } from "@/lib/motion";
import { PatientCardScore, PatientCardTags } from "@/components/cards/patient-census-card";
import { cn } from "@/lib/utils";

import {
	ConsultMessages,
	useConsultMessages,
	type ConsultMessage,
	type ConsultReplies,
} from "../alert-panel/consult-messages";
import { ConsultSessionScope } from "../alert-panel/consult-session";
import type { PatientRecord } from "../patient-details/patient-details";
import { formatElapsed, latest } from "../patient-details/section-parts";
import {
	formatVitalValue,
	limitState,
	vitalParameters,
	type VitalSeries,
} from "../patient-details/sections/vitals-section";
import { usePatientNavigation } from "../patient-navigation";
import { ResizeHandle } from "../side-panel";
import { withFlagDetails } from "../shared/flag-details";
import type { CensusPatient } from "../patients/patients-panel";
import { patientInitials } from "../shared/patient-avatar";
import { usePatientTones } from "../shared/patient-tones";
import type { PanelHospital } from "../shared/patient-panel";

/** The person a conversation is with, at a client hospital: a bedside nurse, a charge nurse, a pharmacist… */
type MessageContact = {
	name: string;
	/** "RN", "PharmD": shown after the name, "Kelly Ortiz, RN". */
	credential: string;
	/** What they do there: "Bedside nurse", "Charge nurse", "Pharmacist". */
	role: string;
	initials: string;
	photo?: string;
	tone?: AvatarFallbackProps["tone"];
	presence?: "online" | "away" | "offline";
};

/**
 * The clinician's conversation with one person at a client hospital about one patient (PRD Messages MSG-001, MSG-018),
 * or about none (staffing, a drug shortage). Never about two patients: a nurse with three patients has three
 * conversations, so no message can be read or sent against the wrong patient. A patient's own thread (the alert panel,
 * the patient page) is that patient's conversations.
 */
type MessageConversation = {
	id: string;
	with: MessageContact;
	/** Where the person works; replies go back through this hospital's messaging. */
	hospitalId: string;
	hospital: string;
	/** How the conversation reaches the hospital, as a generic label, never a vendor's name ("Hospital messaging"; MSG-019). */
	channel: string;
	/** The one patient the conversation is about; none for a conversation about no patient. */
	patient?: CensusPatient;
	/** The conversation as the API has it, oldest first, every message about its patient. */
	messages: ConsultMessage[];
	/** How many of the person's latest messages the clinician hasn't read. */
	unread?: number;
	/** An urgent clinical message is in it, apart from routine chat (MSG-020, CC-03). */
	urgent?: boolean;
	/** Prototype only: the person's simulated replies (MSG-008). */
	replies?: ConsultReplies;
};

/** All conversations, the unread ones or the urgent ones. */
type MessagesTab = "all" | "unread" | "urgent";

type MessagesPanelProps = {
	conversations: MessageConversation[];
	/** The hospitals in the clinician's scope, to filter by. */
	hospitals: PanelHospital[];
	/** The conversation open first; the newest by default. */
	defaultConversationId?: string;
	/** The details column (from xl) starts open. Closed by default (Nov 23, 2026, user's call); its toggle opens it. */
	defaultDetailsOpen?: boolean;
	defaultTab?: MessagesTab;
	/**
	 * A message the clinician sent, by conversation, with the conversation's patient (none: about no patient), for the app
	 * to send through the hospital's messaging.
	 */
	onSendMessage?: (conversationId: string, text: string, patientId?: string) => void;
	/**
	 * The conversations read, when the app keeps them (Intercept Live's layout does, so the Sidebar's Messages dot leaves
	 * once nothing is unread). Without it the page keeps them itself, for as long as it's open.
	 */
	readIds?: ReadonlySet<string>;
	/** A conversation was opened, so it's read: its unread count clears. */
	onRead?: (conversationId: string) => void;
	/**
	 * Start a conversation: the dark square-pen button right of the filter, shown only with it (how a conversation starts
	 * is still open, PRD Messages MSG-018).
	 */
	onNewConversation?: () => void;
	/**
	 * The patients' records, so each conversation's patient shows their flags as the Monitoring card does: each flag a
	 * popover with what changed and what's behind it (`withFlagDetails`).
	 */
	patientRecords?: PatientRecord[];
};

/** How many messages are still unread: each conversation's count, unless it's been read. */
const unreadMessageCount = (conversations: readonly MessageConversation[], readIds: ReadonlySet<string>) =>
	conversations.reduce((total, conversation) => total + (readIds.has(conversation.id) ? 0 : (conversation.unread ?? 0)), 0);

/** "Sarah Miller", for sentences ("Message about Sarah Miller…"). */
const patientName = (patient: CensusPatient) => [patient.firstName, patient.lastName].filter(Boolean).join(" ");

/** "Miller, Sarah", where the name stands alone (a row's patient line, the header's patient bar), as the cards show it. */
const patientListName = (patient: CensusPatient) => [patient.lastName, patient.firstName].filter(Boolean).join(", ");

/** "MICU · Bed 7". */
const patientPlace = (patient: CensusPatient) => [patient.unit, patient.room, patient.bed].filter(Boolean).join(" · ");

/** "Sidney Regional · MICU · 4 - B": hospital, unit, then room and bed, as PatientHeader's location. */
const patientLocation = (patient: CensusPatient) =>
	[patient.hospital, patient.unit, [patient.room, patient.bed].filter(Boolean).join(" - ")].filter(Boolean).join(" · ");

/** "Kelly Ortiz, RN". */
const contactLabel = (contact: MessageContact) => `${contact.name}, ${contact.credential}`;

const lastMessage = (conversation: MessageConversation) => conversation.messages.at(-1);

/** The list's preview of a message: its text, or the photo's title; "You: " or someone else's name first. */
function preview(message: ConsultMessage | undefined) {
	if (!message) return "No messages yet";
	const what =
		message.text ?? (message.photo ? `Photo: ${message.photo.title}` : message.file ? `File: ${message.file.name}` : "");
	if (message.from === "you") return `You: ${what}`;
	return message.by ? `${message.by.split(",")[0]}: ${what}` : what;
}

/**
 * Intercept Live's Messages page (PRD Messages MSG-018): every conversation with the people at every hospital the
 * clinician covers, in one inbox, one per person and patient. The list (search, hospital, All / Unread / Urgent) on the
 * left, each row leading with who wrote and where, then the patient it's about; the open conversation in the middle,
 * its patient fixed above the alert panel's own thread and message box; who it's with and its patient on the right.
 * Opening a conversation reads it. Replies go back through each hospital's own messaging.
 */
function MessagesPanel({
	conversations,
	hospitals,
	defaultConversationId,
	defaultDetailsOpen = false,
	defaultTab = "all",
	onSendMessage,
	readIds,
	onRead,
	onNewConversation,
	patientRecords,
}: MessagesPanelProps) {
	const navigation = usePatientNavigation();
	const [tab, setTab] = React.useState<MessagesTab>(defaultTab);
	const [query, setQuery] = React.useState("");
	// The Filters popover (Hospital; Nov 23, 2026, user's call: a popover, not the Filters sheet). Picked hospitals narrow
	// the list; none picked shows every hospital.
	const [pickedHospitals, setPickedHospitals] = React.useState<string[]>([]);
	// Each patient's flags with their details, as on Monitoring and Patients.
	const flagged = React.useMemo(
		() =>
			conversations.map((conversation) =>
				conversation.patient
					? { ...conversation, patient: withFlagDetails([conversation.patient], patientRecords)[0] }
					: conversation,
			),
		[conversations, patientRecords],
	);
	const sorted = React.useMemo(
		() =>
			[...flagged].sort(
				(a, b) => Date.parse(lastMessage(b)?.sentAt ?? "0") - Date.parse(lastMessage(a)?.sentAt ?? "0"),
			),
		[flagged],
	);
	const [selectedId, setSelectedId] = React.useState<string | undefined>(defaultConversationId ?? sorted[0]?.id);
	// Below md one column shows at a time: the list, or the conversation once one is picked.
	const [conversationShown, setConversationShown] = React.useState(false);
	const [detailsOpen, setDetailsOpen] = React.useState(defaultDetailsOpen);
	// A width the clinician dragged the details column to; none follows the breakpoints. Kept across conversations.
	const [detailsWidth, setDetailsWidth] = React.useState<number | null>(null);
	// The details column shows from xl. There the patient bar opens and closes it; below, the bar opens the patient.
	const detailsFit = useMediaQuery(mediaAbove("xl"));
	// Conversations opened, read: their unread count clears. The app's when it keeps them (`readIds`), else the page's.
	const [ownRead, setOwnRead] = React.useState<ReadonlySet<string>>(() => new Set(selectedId ? [selectedId] : []));
	const read = readIds ?? ownRead;
	const markRead = React.useCallback(
		(id: string) => {
			setOwnRead((ids) => (ids.has(id) ? ids : new Set(ids).add(id)));
			onRead?.(id);
		},
		[onRead],
	);
	// The conversation open on arrival is read too.
	React.useEffect(() => {
		if (selectedId) markRead(selectedId);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only the one open on arrival.
	}, []);
	// Conversations opened this visit keep their session, so a message sent in one is still there on coming back to it.
	const [visited, setVisited] = React.useState<string[]>(() => (selectedId ? [selectedId] : []));

	const unreadOf = (conversation: MessageConversation) =>
		read.has(conversation.id) ? 0 : (conversation.unread ?? 0);
	// Patients keep the color they have on every other page: the tones come from every patient mentioned.
	const mentioned = React.useMemo(
		() => conversations.flatMap((conversation) => (conversation.patient ? [conversation.patient] : [])),
		[conversations],
	);
	const tones = usePatientTones(mentioned);

	const needle = query.trim().toLowerCase();
	// The tab and the search; the Filters' counts are over these, the list narrows them further by hospital.
	const searched = sorted.filter((conversation) => {
		if (tab === "unread" && !unreadOf(conversation)) return false;
		if (tab === "urgent" && !conversation.urgent) return false;
		if (!needle) return true;
		const haystack = [
			conversation.with.name,
			conversation.with.role,
			conversation.hospital,
			// Both orders, so "Sarah Miller" and "Miller, Sarah" both find her.
			conversation.patient ? `${patientName(conversation.patient)} ${patientListName(conversation.patient)}` : "",
			...conversation.messages.map((message) => message.text ?? message.photo?.title ?? ""),
		]
			.join(" ")
			.toLowerCase();
		return haystack.includes(needle);
	});
	const shown = pickedHospitals.length
		? searched.filter((conversation) => pickedHospitals.includes(conversation.hospitalId))
		: searched;
	// Each hospital with its conversations in the tab and search, for the popover.
	const hospitalOptions = [...hospitals]
		.sort((first, second) => first.name.localeCompare(second.name))
		.map((hospital) => ({
			id: hospital.id,
			label: hospital.name,
			count: searched.filter((conversation) => conversation.hospitalId === hospital.id).length,
		}));
	const unreadCount = sorted.filter((conversation) => unreadOf(conversation) > 0).length;
	const urgentCount = sorted.filter((conversation) => conversation.urgent).length;
	const selected = sorted.find((conversation) => conversation.id === selectedId);
	// The open conversation's patient's record: the details column's summary, and the same summary on the header's patient
	// bar (intercept.ds `about-patient`).
	const selectedRecord = selected?.patient
		? patientRecords?.find((item) => item.id === selected.patient?.id)
		: undefined;
	// The open conversation's patient is the page's patient, so the Sidebar's Ask Intercept Live opens about them
	// (Nov 23, 2026, user's call); none for a conversation about no one, and cleared when the page leaves.
	const screenPatient = selected?.patient;
	const setScreenPatient = navigation?.setScreenPatient;
	React.useEffect(() => {
		if (!setScreenPatient) return;
		setScreenPatient(
			screenPatient
				? {
						id: screenPatient.id,
						name: [screenPatient.lastName, screenPatient.firstName].filter(Boolean).join(", "),
						tags: screenPatient.tags?.map((tag) => tag.label),
					}
				: null,
		);
		return () => setScreenPatient(null);
	}, [screenPatient, setScreenPatient]);

	const select = (id: string) => {
		setSelectedId(id);
		setConversationShown(true);
		markRead(id);
		setVisited((ids) => (ids.includes(id) ? ids : [...ids, id]));
	};

	// Arrow keys move through the list, opening each conversation (Nov 23, 2026, user's call): Up and Left the one above,
	// Down and Right the one below, Home and End the first and last. Focus follows, so the row stays in view. Below md
	// the list stays shown, as a key press isn't a pick.
	const moveWithKeys = (event: React.KeyboardEvent<HTMLUListElement>) => {
		const step =
			event.key === "ArrowUp" || event.key === "ArrowLeft"
				? -1
				: event.key === "ArrowDown" || event.key === "ArrowRight"
					? 1
					: event.key === "Home"
						? -Infinity
						: event.key === "End"
							? Infinity
							: 0;
		if (!step || !shown.length) return;
		event.preventDefault();
		const rows = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-slot='conversation-row']")];
		const from = rows.indexOf((event.target as HTMLElement).closest("[data-slot='conversation-row']") as HTMLButtonElement);
		const to = Math.min(shown.length - 1, Math.max(0, step === -Infinity ? 0 : step === Infinity ? shown.length - 1 : from + step));
		if (to === from) return;
		rows[to]?.focus();
		const id = shown[to].id;
		setSelectedId(id);
		markRead(id);
		setVisited((ids) => (ids.includes(id) ? ids : [...ids, id]));
	};

	const openPatient = (patientId: string) => navigation?.openPatient(patientId, [patientId]);

	if (!conversations.length) {
		return (
			<main className='relative flex flex-1 flex-col p-6'>
				<Typography as='h1' size='2xl' weight='bold'>
					Messages
				</Typography>
				<EmptyState
					className='absolute inset-0 px-6'
					icon={<MessageCircleIcon />}
					title='No messages yet'
					description='Messages from the nurses and staff at every hospital you cover will appear here.'
				/>
			</main>
		);
	}

	return (
		<>
			{/* All, Unread and Urgent, right under the header, as the Patients page's hospital bar. */}
			<div className='flex items-center border-b border-border pr-6 pl-4'>
				<Tabs value={tab} onValueChange={(value) => setTab(value as MessagesTab)} className='-mb-px min-w-0'>
					<TabsList variant='line' size='lg' aria-label='Messages'>
						<TabsTrigger value='all'>All</TabsTrigger>
						<TabsTrigger value='unread' aria-label={`Unread, ${unreadCount} conversations`}>
							Unread
							{unreadCount ? <Counter count={unreadCount} /> : null}
						</TabsTrigger>
						<TabsTrigger value='urgent' aria-label={`Urgent, ${urgentCount} conversations`}>
							Urgent
							{urgentCount ? <Counter variant='critical' count={urgentCount} /> : null}
						</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			{/* Fills the canvas to the bottom of the screen, as Schedule (DESIGN.md "Schedule fills the screen"): positioned
			    over a `flex-1` box, so a long conversation scrolls inside its column instead of making the page taller. */}
			<div className='relative flex-1'>
				{/* A size container, so the details column's content can be a third of its width (`cqw`) while the column slides. */}
				<div className='@container absolute inset-0 flex'>
					<h1 className='sr-only'>Messages</h1>


					{/* Conversations */}
					<section
						aria-label='Conversations'
						className={cn(
							"flex w-full shrink-0 flex-col border-r border-border bg-background-subtle md:w-[22rem]",
							conversationShown && "max-md:hidden",
						)}
					>
						<div className='flex shrink-0 items-center gap-2 border-b border-border p-3'>
							<SearchInput
								collapsible={false}
								value={query}
								onValueChange={setQuery}
								placeholder='Search messages'
								className='min-w-0 flex-1'
							/>
							<HospitalFilter options={hospitalOptions} value={pickedHospitals} onValueChange={setPickedHospitals} />
							{onNewConversation ? (
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button variant='neutral' size='icon-md' aria-label='New conversation' onClick={onNewConversation}>
												<SquarePenIcon />
											</Button>
										</TooltipTrigger>
										<TooltipContent side='bottom'>New conversation</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							) : null}
						</div>
						{shown.length ? (
							<ul
								aria-label='Conversations, arrow keys to move between them'
								onKeyDown={moveWithKeys}
								className='flex min-h-0 flex-1 flex-col overflow-y-auto pb-2'
							>
								{shown.map((conversation) => (
									<ConversationListRow
										key={conversation.id}
										conversation={conversation}
										unread={unreadOf(conversation)}
										// One Tab stop in the list: the open conversation (the first when none is shown), then arrows.
										tabbable={
											conversation.id === selectedId ||
											(!shown.some((item) => item.id === selectedId) && conversation.id === shown[0]?.id)
										}
										selected={conversation.id === selectedId}
										tones={tones}
										onSelect={() => select(conversation.id)}
									/>
								))}
							</ul>
						) : (
							<div className='flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center'>
								<MessageCircleIcon aria-hidden className='size-5 text-icon-subtle' />
								<p className='text-sm text-muted-foreground'>
									{tab === "unread" && !needle && !pickedHospitals.length
										? "You're all caught up"
										: "No conversations match"}
								</p>
							</div>
						)}
					</section>

					{/* Each conversation opened this visit keeps its session (sent messages, the draft, the patient picked),
					    before the open one's scope so the open one owns its session. */}
					{visited.map((id) => (
						<ConsultSessionScope key={id} patientId={sessionKey(id)}>
							{null}
						</ConsultSessionScope>
					))}

					{/* The open conversation */}
					{selected ? (
						<section
							aria-label={[
								`Conversation with ${contactLabel(selected.with)}`,
								selected.patient ? `about ${patientName(selected.patient)}` : undefined,
							]
								.filter(Boolean)
								.join(" ")}
							className={cn("flex min-w-0 flex-1 flex-col", !conversationShown && "max-md:hidden")}
						>
							{/* intercept.ds `header-message`: the person and Urgent, then the patient bar (`about-patient`) with the
							    summary, so the conversation is never read or answered as another patient's. From xl the bar opens and
							    closes the patient's details; below, it opens the patient. */}
							<MessageHeader
								person={{
									name: contactLabel(selected.with),
									initials: selected.with.initials,
									photo: selected.with.photo,
									tone: selected.with.tone,
									presence: selected.with.presence,
								}}
								role={`${selected.with.role} · ${selected.hospital} · ${selected.channel}`}
								// The last message's time, as the open row shows it (Nov 23, 2026, user request).
								sentAt={lastMessage(selected)?.sentAt}
								urgent={selected.urgent}
								patient={
									selected.patient
										? {
												name: patientListName(selected.patient),
												place: patientPlace(selected.patient),
												initials: patientInitials(selected.patient),
												photo: selected.patient.photo,
												tone: tones.get(selected.patient.id),
											}
										: undefined
								}
								patientSummary={patientSummaryText(selectedRecord)}
								onOpenPatient={navigation && selected.patient ? () => openPatient(selected.patient!.id) : undefined}
								onBack={() => setConversationShown(false)}
								backButtonProps={{ className: "md:hidden" }}
								onToggleDetails={detailsFit && selected.patient ? () => setDetailsOpen((open) => !open) : undefined}
								detailsOpen={detailsOpen}
								detailsId={patientDetailsId}
							/>
							<ConsultSessionScope key={selected.id} patientId={sessionKey(selected.id)}>
								<ConversationView conversation={selected} onSendMessage={onSendMessage} />
							</ConsultSessionScope>
						</section>
					) : (
						<div className='hidden flex-1 flex-col items-center justify-center gap-2 text-center md:flex'>
							<MessageCircleIcon aria-hidden className='size-5 text-icon-subtle' />
							<p className='text-sm text-muted-foreground'>Pick a conversation to read it</p>
						</div>
					)}

					{/* The patient's details, from xl up, only for a conversation about a patient (the bar opens them). It slides
					    open and closed (ConversationDetails); one stable key, so switching conversations with it open doesn't
					    replay the slide. */}
					<AnimatePresence initial={false}>
						{selected?.patient && detailsOpen ? (
							<ConversationDetails
								key='details'
								width={detailsWidth}
								onWidthChange={setDetailsWidth}
								patient={selected.patient}
								tones={tones}
								record={selectedRecord}
								onOpenPatient={navigation ? () => openPatient(selected.patient!.id) : undefined}
								onClose={() => setDetailsOpen(false)}
							/>
						) : null}
					</AnimatePresence>
				</div>
			</div>
		</>
	);
}

/**
 * The list's Filters: the outline Filters button (its Counter counts the picked hospitals) opening a popover with a
 * checkbox per hospital and how many conversations each has; picking narrows the list, and it stays open while picking.
 * A menu like the live feed's filter (LiveFeedFilter), not the Filters sheet (Nov 23, 2026, user's call).
 */
function HospitalFilter({
	options,
	value,
	onValueChange,
}: {
	options: { id: string; label: string; count: number }[];
	value: string[];
	onValueChange: (value: string[]) => void;
}) {
	const [open, setOpen] = React.useState(false);
	return (
		// Not modal: the list narrows live behind it, and stays readable and scrollable while picking.
		<DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
			<DropdownMenuTrigger asChild>
				<FilterPanelButton open={open} count={value.length} iconOnly />
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end' className='w-64'>
				<DropdownMenuLabel>Hospital</DropdownMenuLabel>
				{options.map((option) => (
					<DropdownMenuCheckboxItem
						key={option.id}
						checked={value.includes(option.id)}
						onCheckedChange={(checked) =>
							onValueChange(checked ? [...value, option.id] : value.filter((id) => id !== option.id))
						}
						onSelect={(event) => event.preventDefault()}
						disabled={option.count === 0 && !value.includes(option.id)}
					>
						<span className='min-w-0 flex-1 truncate'>{option.label}</span>
						<span className='ml-auto text-xs text-muted-foreground'>
							{option.count}
							<span className='sr-only'> conversations</span>
						</span>
					</DropdownMenuCheckboxItem>
				))}
				{value.length ? (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem onSelect={() => onValueChange([])}>Show all hospitals</DropdownMenuItem>
					</>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/**
 * A conversation's session key: apart from the patients' consult sessions (the alert panel and the patient page key
 * theirs by patient), since a patient can have conversations with several people.
 */
const sessionKey = (conversationId: string) => `conversation:${conversationId}`;

/**
 * One row of the list (UCL ConversationRow, in a list item): the person and where they work, the last message, the
 * patient the conversation is about (none for a conversation about no patient). Unread is the bold name and the unread icon
 * after the time; the count is read to screen readers only (no Counter on the row since Nov 18, 2026, user's call).
 */
function ConversationListRow({
	conversation,
	unread,
	tabbable,
	selected,
	tones,
	onSelect,
}: {
	conversation: MessageConversation;
	unread: number;
	tabbable: boolean;
	selected: boolean;
	tones: ReadonlyMap<string, AvatarFallbackProps["tone"]>;
	onSelect: () => void;
}) {
	const last = lastMessage(conversation);
	const about = conversation.patient;
	const contact = conversation.with;
	return (
		<li>
			<ConversationRow
				onClick={onSelect}
				tabIndex={tabbable ? 0 : -1}
				selected={selected}
				unread={unread}
				urgent={conversation.urgent}
				person={{
					name: contactLabel(contact),
					initials: contact.initials,
					photo: contact.photo,
					tone: contact.tone,
					presence: contact.presence,
				}}
				role={`${contact.role} · ${conversation.hospital}`}
				sentAt={last?.sentAt}
				previewLabel={preview(last)}
				preview={
					<>
						{last?.photo && !last.text ? <ImageIcon aria-hidden className='mr-1 inline size-3.5 align-[-2px]' /> : null}
						{last?.file && !last.text ? <PaperclipIcon aria-hidden className='mr-1 inline size-3.5 align-[-2px]' /> : null}
						{preview(last)}
					</>
				}
				patient={
					about
						? {
								name: patientListName(about),
								place: patientPlace(about),
								initials: patientInitials(about),
								photo: about.photo,
								tone: tones.get(about.id),
							}
						: undefined
				}
			/>
		</li>
	);
}

/**
 * The open conversation: its patient, fixed (a conversation is about one patient, never another: PRD Messages MSG-001),
 * with Open patient; then the alert panel's own thread and message box, every message about that patient.
 */
function ConversationView({
	conversation,
	onSendMessage,
}: {
	conversation: MessageConversation;
	onSendMessage?: (conversationId: string, text: string, patientId?: string) => void;
}) {
	const about = conversation.patient;
	const [messages, send, typing] = useConsultMessages(
		conversation.messages,
		[],
		onSendMessage ? (text, patientId) => onSendMessage(conversation.id, text, patientId) : undefined,
		conversation.replies,
	);
	return (
		<>
			{/* The conversation keeps a readable width on a wide screen; ConsultMessages pulls its scroll area 24px out to the
			    sides. */}
			<div className='mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-6 pt-4 pb-2'>
				<ConsultMessages
					messages={messages}
					onSend={(text) => send(text, about?.id)}
					onAttach={(attachment) => send("", about?.id, attachment)}
					nurse={contactLabel(conversation.with)}
					patientName={about ? patientName(about) : undefined}
					patientId={about?.id}
					contact={{
						initials: conversation.with.initials,
						photo: conversation.with.photo,
						tone: conversation.with.tone,
						presence: conversation.with.presence,
					}}
					typing={typing}
					placeholder={about ? `Message about ${patientName(about)}…` : "Send a message…"}
				/>
				{/* Under the field, 8px from it (ConsultMessages' -8px bottom margin, then 16) and from the column's bottom
				    (Intercept-Live `289:10409`; it was at the tab bar's right until Nov 23, 2026). */}
				<p className='mt-4 text-center text-xs text-foreground-subtle'>Replies go back through each hospital's messaging</p>
			</div>
		</>
	);
}

/** A patient's avatar: their photo, else their initials in their color, as on every other page. */
function PatientAvatar({
	patient,
	tone,
	size = "sm",
}: {
	patient: CensusPatient;
	tone?: AvatarFallbackProps["tone"];
	size?: "xs" | "sm" | "md" | "lg";
}) {
	return (
		<Avatar size={size} className='shrink-0'>
			{patient.photo ? <AvatarImage src={patient.photo} alt='' /> : null}
			<AvatarFallback tone={tone}>{patientInitials(patient)}</AvatarFallback>
		</Avatar>
	);
}

/** The details column's id, for the patient bar's `aria-controls`. */
const patientDetailsId = "messages-patient-details";

/** The Conversations list's width (`md:w-[22rem]`), to keep the conversation's room when the details are dragged wider. */
const CONVERSATIONS_WIDTH = 352;
/** The narrowest the conversation gets while the details are dragged wider. */
const CONVERSATION_MIN_WIDTH = 480;
/** The details column's drag limits: the side panels' 320–720px, less when the conversation would get too narrow. */
const DETAILS_MIN_WIDTH = 320;
const DETAILS_MAX_WIDTH = 720;

/**
 * The right column: the patient the conversation is about (score, flags, summary), then a short clinical snapshot to
 * answer without leaving Messages (Nov 23, 2026, user request); the patient's name opens their page for the rest.
 * Who the conversation is with left it the same day (user's call): the header says so. It opens and closes as the
 * shell's side panels do (SidePanel): its width grows from 0 on `enterTransition` and shrinks back on close, so the
 * conversation narrows and widens beside it instead of jumping; instant under reduced motion. Its content keeps its full
 * width against the right edge while the column moves, so nothing reflows mid-slide. Its edge on the conversation's
 * side resizes it as the side panels' do (`ResizeHandle`): drag, arrows, Home and End; double-click goes back to the
 * breakpoints' width.
 */
function ConversationDetails({
	patient,
	tones,
	record,
	onOpenPatient,
	onClose,
	width,
	onWidthChange,
}: {
	/** The width the clinician dragged it to, px; `null` follows the breakpoints. */
	width: number | null;
	onWidthChange: (width: number | null) => void;
	patient: CensusPatient;
	tones: ReadonlyMap<string, AvatarFallbackProps["tone"]>;
	/** The patient's record: their summary and clinical context. */
	record?: PatientRecord;
	/** Makes the patient's name a button that opens their page. */
	onOpenPatient?: () => void;
	/** The × at the top right, as the side panels': closes the column (the header's patient bar opens it again). */
	onClose?: () => void;
}) {
	const { resolve } = useMotionPreference();
	const now = useCurrentMinute();
	const name = [patient.lastName, patient.firstName].filter(Boolean).join(", ");
	// The column's own width and its row's, for the resize handle: where a drag starts, and how wide it may go while the
	// conversation keeps CONVERSATION_MIN_WIDTH.
	const asideRef = React.useRef<HTMLElement>(null);
	const [measured, setMeasured] = React.useState({ column: 0, row: 0 });
	React.useLayoutEffect(() => {
		const aside = asideRef.current;
		const row = aside?.parentElement;
		if (!aside || !row) return;
		const measure = () => setMeasured({ column: aside.offsetWidth, row: row.clientWidth });
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(aside);
		observer.observe(row);
		return () => observer.disconnect();
	}, []);
	const maxWidth = Math.max(
		DETAILS_MIN_WIDTH,
		Math.min(DETAILS_MAX_WIDTH, measured.row - CONVERSATIONS_WIDTH - CONVERSATION_MIN_WIDTH),
	);
	// A dragged width, kept inside the limits when the window narrows.
	const dragged = width === null ? null : Math.min(maxWidth, Math.max(DETAILS_MIN_WIDTH, width));
	return (
		<motion.aside
			ref={asideRef}
			id={patientDetailsId}
			aria-label='Patient details'
			// Its width, `--details-width` (Nov 23, 2026, user's calls): at 2.5xl (1728) and below, the Conversations list's
			// 22rem; above, a third of the page's row, at most 560px. Motion slides a 0 → 1 variable and CSS takes that share
			// of the width, so the slide covers the real width at any window size and a resize follows at once. Animating
			// `width` to 33% under a `max-width` would stall at the cap on wide screens. A dragged width replaces it (inline).
			initial={{ "--details-open": 0 }}
			animate={{ "--details-open": 1 }}
			exit={{ "--details-open": 0 }}
			transition={resolve(enterTransition)}
			style={dragged === null ? undefined : ({ "--details-width": `${dragged}px` } as MotionStyle)}
			className='relative hidden w-[calc(var(--details-open,0)*var(--details-width))] shrink-0 overflow-hidden border-l border-border bg-background-subtle [--details-width:22rem] xl:block 2.5xl:[--details-width:min(100cqw/3,560px)]'
		>
			{/* Intercept-Live `289:10410`: on the list's gray, 20px sides, 16px top and bottom and between its parts. The
			    column's full width (`--details-width`) less its 1px border, pinned right, so it slides in with the column's
			    edge. */}
			<div className='absolute inset-y-0 right-0 flex w-[calc(var(--details-width)-1px)] flex-col gap-4 overflow-y-auto px-5 py-4'>
				<section aria-labelledby='conversation-patient' className='flex flex-col gap-3'>
					<div className='flex flex-col gap-1.5'>
						<div className='flex items-center justify-between gap-2'>
							<Typography as='h3' id='conversation-patient' size='xs'>
								Patient
							</Typography>
							{/* The side panels' ×, kept from pushing the column down: the 36px button overhangs the 20px label line. */}
							{onClose ? (
								<Button
									variant='ghost'
									size='icon-md'
									aria-label='Close patient details'
									aria-controls={patientDetailsId}
									onClick={onClose}
									className='-my-2 -mr-2'
								>
									<XIcon aria-hidden='true' />
								</Button>
							) : null}
						</div>
						<div className='flex items-center gap-3'>
							<PatientAvatar patient={patient} tone={tones.get(patient.id)} size='md' />
							<div className='flex min-w-0 flex-col'>
								{/* The name opens the patient (Nov 23, 2026, user's call): AlertModal's patient name, at this size: underlined
								    in `foreground-subtle` (`foreground` on hover), an arrow after it, named "{name}, open patient". */}
								{onOpenPatient ? (
									<button
										type='button'
										onClick={onOpenPatient}
										aria-label={`${name}, open patient`}
										className='group/name inline-flex max-w-full min-w-0 items-center gap-1 self-start rounded-md text-left text-base font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'
									>
										<span className='truncate underline decoration-foreground-subtle decoration-from-font [text-underline-position:from-font] transition-[text-decoration-color] group-hover/name:decoration-foreground'>
											{name}
										</span>
										<ArrowUpRightIcon aria-hidden='true' className='size-4 shrink-0' />
									</button>
								) : (
									<Typography size='base' weight='semibold' className='truncate'>
										{name}
									</Typography>
								)}
								<Typography size='sm' className='truncate text-muted-foreground'>
									{[[patient.sex, patient.age].filter(Boolean).join(", "), patientPlace(patient)]
										.filter(Boolean)
										.join(" · ")}
								</Typography>
							</div>
						</div>
					</div>
					{/* Where they are, then the score line, 4px apart. */}
					<div className='flex flex-col gap-1'>
						{patientLocation(patient) ? (
							<p className='flex min-w-0 items-center gap-1 text-sm font-medium'>
								<MapPinIcon aria-hidden className='size-4 shrink-0 text-icon-muted' />
								<span className='sr-only'>Location: </span>
								<span className='truncate'>{patientLocation(patient)}</span>
							</p>
						) : null}
						<PatientCardScore acuity={patient.acuity} trajectory={patient.trajectory} />
					</div>
					{/* The Monitoring card's tag row at its size (Badge `sm`, 32px), each flag opening its details. */}
					{patient.tags?.length ? <PatientCardTags tags={patient.tags} name={patientName(patient)} /> : null}
					<PatientSummary record={record} />
				</section>

				{record ? <ClinicalSnapshot record={record} now={now} /> : null}
			</div>
			{/* The edge on the conversation's side: the side panels' resize handle (drag, arrows, Home / End; double-click
			    back to the breakpoints' width). */}
			<ResizeHandle
				side='right'
				label='Resize patient details'
				width={dragged ?? measured.column}
				onWidthChange={onWidthChange}
				min={DETAILS_MIN_WIDTH}
				max={maxWidth}
				onReset={() => onWidthChange(null)}
			/>
		</motion.aside>
	);
}

/* -------------------------------------------------------------------------- */
/* Clinical snapshot                                                          */
/* -------------------------------------------------------------------------- */

// The details column's clinical snapshot (Nov 23, 2026, user's calls: "clinical info such as medicines, last vitals…";
// then "should be simple, a summary, not a duplication of the patient page"): one line per topic, the latest values
// only, so the doctor can answer without leaving Messages; the patient's name above opens their page for the rest. A
// topic without data is left out (the patient page says what's missing).

/** The vitals the snapshot names, in the Timeline's order: BP, then its MAP. */
const snapshotVitals = ["hr", "bp", "map", "spo2", "rr", "temp"] as const;

/** One vital in the snapshot: "HR 128↑", with its limit in words for screen readers. */
function SnapshotVital({ parameter, series }: { parameter: (typeof snapshotVitals)[number]; series: VitalSeries }) {
	const reading = series.readings.at(-1);
	if (!reading) return null;
	const meta = vitalParameters[parameter];
	const state = limitState(reading.value, series.limits);
	// Only the units a bare number would hide: %, °C.
	const unit = parameter === "spo2" || parameter === "temp" ? meta.unit : "";
	return (
		<span className='whitespace-nowrap'>
			<abbr title={meta.name} className='text-muted-foreground no-underline'>
				{meta.label}
			</abbr>{" "}
			<span className='tabular-nums'>
				{formatVitalValue(parameter, reading.value)}
				{reading.diastolic !== undefined ? `/${reading.diastolic}` : null}
				{unit === "%" ? "%" : unit ? ` ${unit}` : null}
			</span>
			{state ? (
				<>
					<span aria-hidden='true'>{state.glyph}</span>
					<span className='sr-only'> ({state.words.toLowerCase()})</span>
				</>
			) : null}
		</span>
	);
}

/**
 * The clinical snapshot: the latest vitals on one line, the breathing support, the infusions running, the abnormal labs
 * and how many medications, each a muted label over its line, and how old the newest value is.
 */
function ClinicalSnapshot({ record, now }: { record: PatientRecord; now: number | null }) {
	const headingId = React.useId();
	const series = record.vitals?.series ?? [];
	const vitals = snapshotVitals.flatMap((parameter) => {
		const item = series.find((entry) => entry.parameter === parameter);
		return item?.readings.length ? [{ parameter, item }] : [];
	});
	const { ventilator, infusions, labs, medications } = record;
	const flaggedLabs = (labs ?? []).filter((lab) => lab.flag && lab.value !== undefined);
	const pendingLabs = (labs ?? []).filter((lab) => lab.value === undefined);
	const medicationCounts = medications
		? [
				medications.scheduled.length ? `${medications.scheduled.length} scheduled` : undefined,
				medications.prn.length ? `${medications.prn.length} as needed` : undefined,
			].filter(Boolean)
		: [];
	const updated = latest([
		...vitals.map(({ item }) => item.readings.at(-1)?.at),
		ventilator?.updatedAt,
		...(infusions?.map((infusion) => infusion.updatedAt) ?? []),
		...(labs?.map((lab) => lab.resultedAt) ?? []),
	]);
	const lines = [
		vitals.length
			? {
					label: "Vitals",
					value: (
						<span className='flex flex-wrap gap-x-2.5 gap-y-0.5'>
							{vitals.map(({ parameter, item }) => (
								<SnapshotVital key={parameter} parameter={parameter} series={item} />
							))}
						</span>
					),
				}
			: undefined,
		ventilator
			? {
					label: "Oxygen",
					value: [
						ventilator.support === "Invasive" ? "Ventilator" : ventilator.support,
						...ventilator.settings.slice(0, 2).map((setting) => `${setting.label} ${setting.value}`),
					].join(" · "),
				}
			: undefined,
		infusions?.length
			? {
					label: "Infusions",
					value: (
						<ul className='flex flex-col'>
							{infusions.map((infusion) => (
								<li key={infusion.drug}>
									{infusion.drug}
									{infusion.rate ? <span className='text-muted-foreground tabular-nums'> {infusion.rate}</span> : null}
								</li>
							))}
						</ul>
					),
				}
			: undefined,
		flaggedLabs.length || pendingLabs.length
			? {
					label: "Abnormal labs",
					value: (
						<span className='flex flex-wrap gap-x-2.5 gap-y-0.5'>
							{flaggedLabs.map((lab) => {
								const flag = labTileFlags[lab.flag as Exclude<LabTileFlag, "none">];
								return (
									<span key={lab.name} className='whitespace-nowrap'>
										<span className='text-muted-foreground'>{lab.name}</span>{" "}
										<span className='tabular-nums'>{lab.value}</span>{" "}
										<span className={cn("text-xs font-bold", flag.className)}>
											<span aria-hidden='true'>{flag.letter}</span>
											<span className='sr-only'>{flag.label}</span>
										</span>
									</span>
								);
							})}
							{pendingLabs.map((lab) => (
								<span key={lab.name} className='whitespace-nowrap text-muted-foreground'>
									{lab.name} pending
								</span>
							))}
						</span>
					),
				}
			: undefined,
		medicationCounts.length ? { label: "Medications", value: medicationCounts.join(" · ") } : undefined,
	].filter((line) => line !== undefined);
	if (!lines.length) return null;
	return (
		<>
			<hr className='border-border' />
			<section aria-labelledby={headingId} className='flex flex-col gap-3'>
				<div className='flex items-baseline justify-between gap-3'>
					<Typography as='h3' id={headingId} size='xs' className='shrink-0'>
						Clinical snapshot
					</Typography>
					{updated && now !== null ? (
						<p className='min-w-0 truncate text-xs text-muted-foreground'>Updated {formatElapsed(updated, now)}</p>
					) : null}
				</div>
				<dl className='flex flex-col gap-2.5 text-sm'>
					{lines.map((line) => (
						<div key={line.label} className='flex flex-col gap-0.5'>
							<dt className='text-xs text-muted-foreground'>{line.label}</dt>
							<dd className='text-foreground'>{line.value}</dd>
						</div>
					))}
				</dl>
			</section>
		</>
	);
}

/** The patient's summary in a line: the record's AI brief, else the diagnosis. The details column and the header's bar. */
const patientSummaryText = (record?: PatientRecord) => record?.brief?.text ?? record?.diagnosis;

/**
 * A short summary of the patient, to answer the person without opening the chart (Intercept-Live `289:10452`, 24px under
 * the flags): the AI brief of what matters now, with where it came from and how fresh it is, else the diagnosis; then
 * code status and allergies, the safety facts a reply can't get wrong. Nothing without a record.
 */
function PatientSummary({ record }: { record?: PatientRecord }) {
	const now = useCurrentMinute();
	if (!record) return null;
	const text = patientSummaryText(record);
	const updated = record.brief && now !== null ? formatRelativeDate(record.brief.updatedAt, now) : undefined;
	const allergies =
		record.allergies === undefined
			? "Allergies unknown"
			: record.allergies.length
				? `Allergies: ${record.allergies.join(", ")}`
				: "No known allergies";
	const safety = [record.codeStatus ?? "Code status unknown", allergies, record.isolation].filter(Boolean).join(" · ");
	return (
		<section aria-label='Patient summary' className='mt-3 flex flex-col gap-1.5'>
			{text ? <p className='text-sm font-medium'>{text}</p> : null}
			{record.brief ? (
				<p className='flex items-center gap-1 text-xs text-muted-foreground'>
					<AiSparkleIcon className='size-3 shrink-0' />
					<span>
						AI summary · {record.brief.sourceCount} sources{updated ? ` · ${updated.label}` : ""}
					</span>
				</p>
			) : null}
			<p className='text-xs text-muted-foreground'>{safety}</p>
		</section>
	);
}

export {
	MessagesPanel,
	unreadMessageCount,
	type MessageContact,
	type MessageConversation,
	type MessagesPanelProps,
	type MessagesTab,
};
