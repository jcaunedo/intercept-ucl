import * as React from "react";
import {
	ArrowUpRightIcon,
	ChevronLeftIcon,
	ImageIcon,
	MessageCircleIcon,
	PanelRightIcon,
} from "lucide-react";

import { Avatar, AvatarBadge, AvatarFallback, AvatarImage, type AvatarFallbackProps } from "@/components/data-display/avatar";
import { Badge } from "@/components/data-display/badge";
import { Button } from "@/components/buttons/button";
import { Counter } from "@/components/data-display/counter";
import { EmptyState } from "@/components/feedback/empty-state";
import { SearchInput } from "@/components/forms/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/forms/select";
import { AiSparkleIcon } from "@/components/icons/ai-sparkle-icon";
import { Tabs, TabsList, TabsTrigger } from "@/components/navigation/tabs";
import { Typography } from "@/components/typography/typography";
import { PatientCardScore, PatientCardTags } from "@/components/cards/patient-census-card";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { formatRelativeDate } from "@/lib/relative-date";
import { cn } from "@/lib/utils";

import {
	ConsultMessages,
	useConsultMessages,
	type ConsultMessage,
	type ConsultReplies,
} from "../alert-panel/consult-messages";
import { ConsultSessionScope } from "../alert-panel/consult-session";
import { usePatientNavigation } from "../patient-navigation";
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
};

/** How many messages are still unread: each conversation's count, unless it's been read. */
const unreadMessageCount = (conversations: readonly MessageConversation[], readIds: ReadonlySet<string>) =>
	conversations.reduce((total, conversation) => total + (readIds.has(conversation.id) ? 0 : (conversation.unread ?? 0)), 0);

const presenceLabels: Record<NonNullable<MessageContact["presence"]>, string> = {
	online: "Online",
	away: "Away",
	offline: "Offline",
};

const presenceDots: Record<NonNullable<MessageContact["presence"]>, string> = {
	online: "bg-success",
	away: "bg-warning",
	offline: "bg-icon-subtle",
};

const patientName = (patient: CensusPatient) => [patient.firstName, patient.lastName].filter(Boolean).join(" ");

/** "MICU · Bed 7". */
const patientPlace = (patient: CensusPatient) => [patient.unit, patient.room, patient.bed].filter(Boolean).join(" · ");

/** "Kelly Ortiz, RN". */
const contactLabel = (contact: MessageContact) => `${contact.name}, ${contact.credential}`;

const lastMessage = (conversation: MessageConversation) => conversation.messages.at(-1);

/** The list's preview of a message: its text, or the photo's title; "You: " or someone else's name first. */
function preview(message: ConsultMessage | undefined) {
	if (!message) return "No messages yet";
	const what = message.text ?? (message.photo ? `Photo: ${message.photo.title}` : "");
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
	defaultTab = "all",
	onSendMessage,
	readIds,
	onRead,
}: MessagesPanelProps) {
	const navigation = usePatientNavigation();
	const now = useCurrentMinute();
	const [tab, setTab] = React.useState<MessagesTab>(defaultTab);
	const [query, setQuery] = React.useState("");
	const [hospitalId, setHospitalId] = React.useState("all");
	const sorted = React.useMemo(
		() =>
			[...conversations].sort(
				(a, b) => Date.parse(lastMessage(b)?.sentAt ?? "0") - Date.parse(lastMessage(a)?.sentAt ?? "0"),
			),
		[conversations],
	);
	const [selectedId, setSelectedId] = React.useState<string | undefined>(defaultConversationId ?? sorted[0]?.id);
	// Below md one column shows at a time: the list, or the conversation once one is picked.
	const [conversationShown, setConversationShown] = React.useState(false);
	const [detailsOpen, setDetailsOpen] = React.useState(true);
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
	const shown = sorted.filter((conversation) => {
		if (tab === "unread" && !unreadOf(conversation)) return false;
		if (tab === "urgent" && !conversation.urgent) return false;
		if (hospitalId !== "all" && conversation.hospitalId !== hospitalId) return false;
		if (!needle) return true;
		const haystack = [
			conversation.with.name,
			conversation.with.role,
			conversation.hospital,
			conversation.patient ? patientName(conversation.patient) : "",
			...conversation.messages.map((message) => message.text ?? message.photo?.title ?? ""),
		]
			.join(" ")
			.toLowerCase();
		return haystack.includes(needle);
	});
	const unreadCount = sorted.filter((conversation) => unreadOf(conversation) > 0).length;
	const urgentCount = sorted.filter((conversation) => conversation.urgent).length;
	const selected = sorted.find((conversation) => conversation.id === selectedId);

	const select = (id: string) => {
		setSelectedId(id);
		setConversationShown(true);
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
			<div className='flex items-center justify-between gap-6 border-b border-border pr-6 pl-4'>
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
				<Typography size='sm' className='hidden shrink-0 text-muted-foreground md:block'>
					Replies go back through each hospital's messaging
				</Typography>
			</div>

			{/* Fills the canvas to the bottom of the screen, as Schedule (DESIGN.md "Schedule fills the screen"): positioned
			    over a `flex-1` box, so a long conversation scrolls inside its column instead of making the page taller. */}
			<div className='relative flex-1'>
				<div className='absolute inset-0 flex'>
					<h1 className='sr-only'>Messages</h1>

					{/* Conversations */}
					<section
						aria-label='Conversations'
						className={cn(
							"flex w-full shrink-0 flex-col border-r border-border md:w-[22rem]",
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
							<Select value={hospitalId} onValueChange={setHospitalId}>
								<SelectTrigger aria-label='Hospital' className='w-36 shrink-0'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent position='popper' align='end'>
									<SelectItem value='all'>All hospitals</SelectItem>
									{[...hospitals]
										.sort((a, b) => a.name.localeCompare(b.name))
										.map((hospital) => (
											<SelectItem key={hospital.id} value={hospital.id}>
												{hospital.name}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</div>
						{shown.length ? (
							<ul className='flex min-h-0 flex-1 flex-col overflow-y-auto p-2'>
								{shown.map((conversation) => (
									<ConversationRow
										key={conversation.id}
										conversation={conversation}
										unread={unreadOf(conversation)}
										now={now}
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
									{tab === "unread" && !needle && hospitalId === "all"
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
							<header className='flex shrink-0 items-center gap-3 border-b border-border px-6 py-3'>
								<Button
									variant='ghost'
									size='icon-md'
									aria-label='Back to conversations'
									onClick={() => setConversationShown(false)}
									className='-ml-2 md:hidden'
								>
									<ChevronLeftIcon />
								</Button>
								<ContactAvatar contact={selected.with} size='md' />
								<div className='flex min-w-0 flex-1 flex-col'>
									<div className='flex items-center gap-2'>
										<Typography as='h2' size='base' weight='semibold' className='truncate'>
											{contactLabel(selected.with)}
										</Typography>
										{selected.urgent ? (
											<Badge variant='red' size='xs'>
												Urgent
											</Badge>
										) : null}
									</div>
									<Typography size='sm' className='truncate text-muted-foreground'>
										{selected.with.role} · {selected.hospital} · {selected.channel}
									</Typography>
								</div>
								<Button
									variant='ghost'
									size='icon-md'
									aria-label='Conversation details'
									aria-pressed={detailsOpen}
									onClick={() => setDetailsOpen((open) => !open)}
									className='hidden aria-pressed:bg-accent xl:inline-flex'
								>
									<PanelRightIcon />
								</Button>
							</header>
							<ConsultSessionScope key={selected.id} patientId={sessionKey(selected.id)}>
								<ConversationView
									conversation={selected}
									tones={tones}
									onSendMessage={onSendMessage}
									onOpenPatient={navigation ? openPatient : undefined}
								/>
							</ConsultSessionScope>
						</section>
					) : (
						<div className='hidden flex-1 flex-col items-center justify-center gap-2 text-center md:flex'>
							<MessageCircleIcon aria-hidden className='size-5 text-icon-subtle' />
							<p className='text-sm text-muted-foreground'>Pick a conversation to read it</p>
						</div>
					)}

					{/* Who it's with and the patient it's about, from xl up. */}
					{selected && detailsOpen ? (
						<ConversationDetails
							conversation={selected}
							tones={tones}
							onOpenPatient={navigation ? openPatient : undefined}
							onAsk={
								navigation
									? (patient) => navigation.askAboutPatient(patient.id, patientName(patient))
									: undefined
							}
						/>
					) : null}
				</div>
			</div>
		</>
	);
}

/**
 * A conversation's session key: apart from the patients' consult sessions (the alert panel and the patient page key
 * theirs by patient), since a patient can have conversations with several people.
 */
const sessionKey = (conversationId: string) => `conversation:${conversationId}`;

/**
 * One row of the list: who wrote and where first, then the last message, then the patient the conversation is about
 * (none for a conversation about no patient) and Urgent. Unread shows as the bold name and the brand-colored time; the
 * count is in the row's name for screen readers only (no Counter on the row since Nov 18, 2026, user's call).
 */
function ConversationRow({
	conversation,
	unread,
	now,
	selected,
	tones,
	onSelect,
}: {
	conversation: MessageConversation;
	unread: number;
	now: number | null;
	selected: boolean;
	tones: ReadonlyMap<string, AvatarFallbackProps["tone"]>;
	onSelect: () => void;
}) {
	const last = lastMessage(conversation);
	const when = last && now !== null ? formatRelativeDate(last.sentAt, now) : undefined;
	const about = conversation.patient;
	return (
		// A divider between rows, inset to the content's edges (12px), clear of the rows' hover and selected fills by the
		// 4px around each row (Nov 18, 2026, user's call).
		<li className='relative py-1 first:pt-0 last:pb-0 not-last:after:absolute not-last:after:inset-x-3 not-last:after:bottom-0 not-last:after:h-px not-last:after:bg-border'>
			<button
				type='button'
				onClick={onSelect}
				aria-current={selected ? "true" : undefined}
				aria-label={[
					contactLabel(conversation.with),
					conversation.urgent ? "Urgent" : undefined,
					unread ? `${unread} unread` : undefined,
					about ? `About ${patientName(about)}` : undefined,
					preview(last),
					when?.label,
				]
					.filter(Boolean)
					.join(", ")}
				className={cn(
					"flex w-full flex-col gap-2 rounded-lg p-3 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
					selected && "bg-accent",
				)}
			>
				{/* The avatar heads the row beside who and where; the message and the patient run the row's full width under
				    them, not indented past the avatar (Nov 18, 2026, user's call). */}
				<span className='flex w-full items-center gap-3'>
					<ContactAvatar contact={conversation.with} />
					<span className='flex min-w-0 flex-1 flex-col gap-0.5'>
						<span className='flex items-baseline gap-2'>
							<span className={cn("min-w-0 flex-1 truncate text-sm", unread ? "font-bold" : "font-semibold")}>
								{contactLabel(conversation.with)}
							</span>
							{when ? (
								<time
									dateTime={last?.sentAt}
									title={when.title}
									className={cn("shrink-0 text-xs", unread ? "font-medium text-primary" : "text-muted-foreground")}
								>
									{when.label}
								</time>
							) : null}
						</span>
						<span className='truncate text-xs text-muted-foreground'>
							{conversation.with.role} · {conversation.hospital}
						</span>
					</span>
				</span>
				<span className='flex w-full min-w-0 flex-col gap-1.5'>
					<span className={cn("line-clamp-2 text-sm", unread ? "text-foreground" : "text-muted-foreground")}>
						{last?.photo && !last.text ? <ImageIcon aria-hidden className='mr-1 inline size-3.5 align-[-2px]' /> : null}
						{preview(last)}
					</span>
					{about || conversation.urgent ? (
						<span className='flex items-center gap-2'>
							<span className='flex min-w-0 flex-1 items-center gap-1.5'>
								{about ? (
									<>
										<PatientAvatar patient={about} tone={tones.get(about.id)} size='xs' />
										<span className='min-w-0 truncate text-xs text-foreground'>
											<span className='font-medium'>{patientName(about)}</span>
											<span className='text-muted-foreground'> · {patientPlace(about)}</span>
										</span>
									</>
								) : null}
							</span>
							{conversation.urgent ? (
								<Badge variant='red' size='xs'>
									Urgent
								</Badge>
							) : null}
						</span>
					) : null}
				</span>
			</button>
		</li>
	);
}

/**
 * The open conversation: its patient, fixed (a conversation is about one patient, never another: PRD Messages MSG-001),
 * with Open patient; then the alert panel's own thread and message box, every message about that patient.
 */
function ConversationView({
	conversation,
	tones,
	onSendMessage,
	onOpenPatient,
}: {
	conversation: MessageConversation;
	tones: ReadonlyMap<string, AvatarFallbackProps["tone"]>;
	onSendMessage?: (conversationId: string, text: string, patientId?: string) => void;
	onOpenPatient?: (patientId: string) => void;
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
			{/* About: the patient this conversation is about, so it's never read or answered as another's. Only in a
			    conversation about a patient. */}
			{about ? (
				<div className='flex shrink-0 items-center gap-3 border-b border-border px-6 py-2'>
					<span className='shrink-0 text-xs text-muted-foreground'>About</span>
					<span className='flex min-w-0 items-center gap-2'>
						<PatientAvatar patient={about} tone={tones.get(about.id)} size='xs' />
						<span className='min-w-0 truncate text-sm'>
							<span className='font-semibold'>{patientName(about)}</span>
							<span className='text-muted-foreground'> · {patientPlace(about)}</span>
						</span>
					</span>
					<span className='flex-1' />
					{onOpenPatient ? (
						<Button variant='outline' size='xs' onClick={() => onOpenPatient(about.id)} className='shrink-0'>
							Open patient
							<ArrowUpRightIcon />
						</Button>
					) : null}
				</div>
			) : null}
			{/* The conversation keeps a readable width on a wide screen; ConsultMessages pulls its scroll area 24px out to the
			    sides. */}
			<div className='mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-6 pt-4 pb-6'>
				<ConsultMessages
					messages={messages}
					onSend={(text) => send(text, about?.id)}
					nurse={contactLabel(conversation.with)}
					typing={typing}
					placeholder={about ? `Message about ${patientName(about)}…` : "Send a message…"}
				/>
			</div>
		</>
	);
}

/** The person's avatar: their photo, else their initials in their color, with their presence as its dot. */
function ContactAvatar({ contact, size = "sm" }: { contact: MessageContact; size?: "sm" | "md" | "lg" }) {
	return (
		<Avatar size={size} className='shrink-0'>
			{contact.photo ? <AvatarImage src={contact.photo} alt='' /> : null}
			<AvatarFallback tone={contact.tone}>{contact.initials}</AvatarFallback>
			{contact.presence ? <AvatarBadge className={presenceDots[contact.presence]} /> : null}
		</Avatar>
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

/** The right column: who the conversation is with, where it goes, and the patient it's about (score, flags). */
function ConversationDetails({
	conversation,
	tones,
	onOpenPatient,
	onAsk,
}: {
	conversation: MessageConversation;
	tones: ReadonlyMap<string, AvatarFallbackProps["tone"]>;
	onOpenPatient?: (patientId: string) => void;
	onAsk?: (patient: CensusPatient) => void;
}) {
	const contact = conversation.with;
	const patient = conversation.patient;
	const photos = conversation.messages.filter((message) => message.photo).length;
	return (
		<aside
			aria-label='Conversation details'
			className='hidden w-[22rem] shrink-0 flex-col gap-6 overflow-y-auto border-l border-border p-6 xl:flex'
		>
			<div className='flex items-center gap-3'>
				<ContactAvatar contact={contact} size='lg' />
				<div className='flex min-w-0 flex-col'>
					<Typography size='base' weight='semibold' className='truncate'>
						{contactLabel(contact)}
					</Typography>
					<Typography size='sm' className='text-muted-foreground'>
						{contact.role}
						{contact.presence ? ` · ${presenceLabels[contact.presence]}` : ""}
					</Typography>
				</div>
			</div>

			<dl className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm'>
				<dt className='text-muted-foreground'>Hospital</dt>
				<dd>{conversation.hospital}</dd>
				<dt className='text-muted-foreground'>Channel</dt>
				<dd>{conversation.channel}</dd>
				<dt className='text-muted-foreground'>Photos</dt>
				<dd>{photos ? `${photos} in this conversation` : "None"}</dd>
			</dl>

			<hr className='border-border' />

			<section aria-labelledby='conversation-patient' className='flex flex-col gap-4'>
				<Typography as='h3' id='conversation-patient' size='sm' weight='semibold'>
					Patient
				</Typography>
				{patient ? (
					<div className='flex flex-col gap-2'>
						<div className='flex items-center gap-3'>
							<PatientAvatar patient={patient} tone={tones.get(patient.id)} />
							<div className='flex min-w-0 flex-col'>
								<Typography size='sm' weight='semibold' className='truncate'>
									{patientName(patient)}
								</Typography>
								<Typography size='xs' className='truncate text-muted-foreground'>
									{[[patient.sex, patient.age].filter(Boolean).join(", "), patientPlace(patient)]
										.filter(Boolean)
										.join(" · ")}
								</Typography>
							</div>
						</div>
						<PatientCardScore acuity={patient.acuity} trajectory={patient.trajectory} size='sm' />
						{patient.tags?.length ? <PatientCardTags tags={patient.tags} name={patientName(patient)} size='sm' /> : null}
						{onOpenPatient || onAsk ? (
							<div className='flex gap-2'>
								{onOpenPatient ? (
									<Button variant='outline' size='xs' onClick={() => onOpenPatient(patient.id)}>
										Open patient
										<ArrowUpRightIcon />
									</Button>
								) : null}
								{onAsk ? (
									<Button
										variant='outline'
										size='xs'
										onClick={() => onAsk(patient)}
										aria-label={`Ask Intercept Live about ${patientName(patient)}`}
									>
										<AiSparkleIcon />
										Ask Intercept Live
									</Button>
								) : null}
							</div>
						) : null}
					</div>
				) : (
					<p className='text-sm text-muted-foreground'>Not about a patient</p>
				)}
			</section>
		</aside>
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
