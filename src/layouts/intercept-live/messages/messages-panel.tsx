import * as React from "react";
import {
	ArrowUpRightIcon,
	CheckIcon,
	ChevronDownIcon,
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/overlays/dropdown-menu";
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
import { ConsultSessionScope, useSessionState } from "../alert-panel/consult-session";
import { usePatientNavigation } from "../patient-navigation";
import type { CensusPatient } from "../patients/patients-panel";
import { avatarTones, patientInitials } from "../shared/patient-avatar";
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
 * The clinician's conversation with one person at a client hospital (PRD Messages MSG-001, MSG-018), as their hospital's
 * messaging has it: one per person, whatever patients it's about. Each message can be about a patient (`patientId`);
 * some are about none (staffing, a drug shortage). A patient's own thread (the alert panel, the patient page) is that
 * patient's messages across conversations.
 */
type MessageConversation = {
	id: string;
	with: MessageContact;
	/** Where the person works; replies go back through this hospital's messaging. */
	hospitalId: string;
	hospital: string;
	/** How the conversation reaches the hospital, as a generic label, never a vendor's name ("Hospital messaging"; MSG-019). */
	channel: string;
	/** The conversation as the API has it, oldest first, each message with the patient it's about, if any. */
	messages: ConsultMessage[];
	/** The patients its messages are about, to show and to pick from when writing. */
	patients?: CensusPatient[];
	/** How many of the person's latest messages the clinician hasn't read. */
	unread?: number;
	/** An urgent clinical message is in it, apart from routine chat (MSG-020, CC-03). */
	urgent?: boolean;
	/** Prototype only: the person's simulated replies, by the patient the message is about (MSG-008). */
	replies?: (patient: CensusPatient | undefined) => ConsultReplies | undefined;
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
	 * A message the clinician sent, by conversation, with the patient it's about (none: about no patient), for the app to
	 * send through the hospital's messaging.
	 */
	onSendMessage?: (conversationId: string, text: string, patientId?: string) => void;
};

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

const patientOf = (conversation: MessageConversation, patientId: string | undefined) =>
	patientId ? conversation.patients?.find((patient) => patient.id === patientId) : undefined;

/** The list's preview of a message: its text, or the photo's title; "You: " or someone else's name first. */
function preview(message: ConsultMessage | undefined) {
	if (!message) return "No messages yet";
	const what = message.text ?? (message.photo ? `Photo: ${message.photo.title}` : "");
	if (message.from === "you") return `You: ${what}`;
	return message.by ? `${message.by.split(",")[0]}: ${what}` : what;
}

/**
 * Intercept Live's Messages page (PRD Messages MSG-018): every conversation with the people at every hospital the
 * clinician covers, in one inbox, one per person. The list (search, hospital, All / Unread / Urgent) on the left, each row
 * leading with who wrote and where, the patient as context when there is one; the open conversation in the middle, the
 * alert panel's own thread and message box, with the patient each message is about; who it's with and the patients it
 * mentions on the right. Opening a conversation reads it. Replies go back through each hospital's own messaging.
 */
function MessagesPanel({
	conversations,
	hospitals,
	defaultConversationId,
	defaultTab = "all",
	onSendMessage,
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
	// Conversations opened here, read: their unread count clears.
	const [read, setRead] = React.useState<ReadonlySet<string>>(() => new Set(selectedId ? [selectedId] : []));
	// Conversations opened this visit keep their session, so a message sent in one is still there on coming back to it.
	const [visited, setVisited] = React.useState<string[]>(() => (selectedId ? [selectedId] : []));

	const unreadOf = (conversation: MessageConversation) =>
		read.has(conversation.id) ? 0 : (conversation.unread ?? 0);
	// Patients keep the color they have on every other page: the tones come from every patient mentioned.
	const tones = React.useMemo(
		() => avatarTones(conversations.flatMap((conversation) => conversation.patients ?? [])),
		[conversations],
	);

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
			...(conversation.patients ?? []).map(patientName),
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
		setRead((ids) => new Set(ids).add(id));
		setVisited((ids) => (ids.includes(id) ? ids : [...ids, id]));
	};

	const openPatient = (conversation: MessageConversation, patientId: string) =>
		navigation?.openPatient(
			patientId,
			(conversation.patients ?? []).map((patient) => patient.id),
		);

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
							<ul className='flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2'>
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
							aria-label={`Conversation with ${contactLabel(selected.with)}`}
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
									onOpenPatient={navigation ? (patientId) => openPatient(selected, patientId) : undefined}
								/>
							</ConsultSessionScope>
						</section>
					) : (
						<div className='hidden flex-1 flex-col items-center justify-center gap-2 text-center md:flex'>
							<MessageCircleIcon aria-hidden className='size-5 text-icon-subtle' />
							<p className='text-sm text-muted-foreground'>Pick a conversation to read it</p>
						</div>
					)}

					{/* Who it's with and the patients it's about, from xl up. */}
					{selected && detailsOpen ? (
						<ConversationDetails
							conversation={selected}
							tones={tones}
							onOpenPatient={navigation ? (patientId) => openPatient(selected, patientId) : undefined}
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
 * A conversation's session key: apart from the patients' consult sessions, since a conversation isn't one patient's (the
 * alert panel and the patient page key theirs by patient).
 */
const sessionKey = (conversationId: string) => `conversation:${conversationId}`;

/**
 * One row of the list: who wrote and where first, then the last message, then the patient it's about (none for a
 * message about no patient), Urgent and the unread count.
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
	tones: Map<string, AvatarFallbackProps["tone"]>;
	onSelect: () => void;
}) {
	const last = lastMessage(conversation);
	const when = last && now !== null ? formatRelativeDate(last.sentAt, now) : undefined;
	const about = patientOf(conversation, last?.patientId);
	return (
		<li>
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
					"flex w-full gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
					selected && "bg-accent",
				)}
			>
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
					<span className={cn("line-clamp-2 pt-0.5 text-sm", unread ? "text-foreground" : "text-muted-foreground")}>
						{last?.photo && !last.text ? <ImageIcon aria-hidden className='mr-1 inline size-3.5 align-[-2px]' /> : null}
						{preview(last)}
					</span>
					{about || conversation.urgent || unread ? (
						<span className='flex items-center gap-2 pt-1'>
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
							{unread ? <Counter count={unread} /> : null}
						</span>
					) : null}
				</span>
			</button>
		</li>
	);
}

/**
 * The open conversation: who the next message is about (the patient of the latest message to start with, changeable
 * to another of its patients or to none), the messages with each change of patient marked, and the alert panel's own
 * message box.
 */
function ConversationView({
	conversation,
	tones,
	onSendMessage,
	onOpenPatient,
}: {
	conversation: MessageConversation;
	tones: Map<string, AvatarFallbackProps["tone"]>;
	onSendMessage?: (conversationId: string, text: string, patientId?: string) => void;
	onOpenPatient?: (patientId: string) => void;
}) {
	const patients = conversation.patients ?? [];
	// Who the next message is about: kept with the conversation's session, "" for no patient.
	const [aboutId, setAboutId] = useSessionState<string>("messagesAbout", lastMessage(conversation)?.patientId ?? "");
	const about = patientOf(conversation, aboutId || undefined);
	const [messages, send, typing] = useConsultMessages(
		conversation.messages,
		[],
		onSendMessage ? (text, patientId) => onSendMessage(conversation.id, text, patientId) : undefined,
		conversation.replies?.(about),
	);
	const label = (patientId: string) => {
		const patient = patientOf(conversation, patientId);
		return patient ? `${patientName(patient)} · ${patientPlace(patient)}` : "another patient";
	};
	return (
		<>
			{/* About: who the next message is about, so it's never sent against the wrong patient. Only in a conversation
			    that mentions a patient. */}
			{patients.length ? (
				<div className='flex shrink-0 items-center gap-3 border-b border-border px-6 py-2'>
					<span className='shrink-0 text-xs text-muted-foreground'>About</span>
					{about ? (
						<span className='flex min-w-0 items-center gap-2'>
							<PatientAvatar patient={about} tone={tones.get(about.id)} size='xs' />
							<span className='min-w-0 truncate text-sm'>
								<span className='font-semibold'>{patientName(about)}</span>
								<span className='text-muted-foreground'> · {patientPlace(about)}</span>
							</span>
						</span>
					) : (
						<span className='text-sm text-muted-foreground'>No patient</span>
					)}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant='ghost' size='xs' aria-label='Change who the message is about' className='shrink-0'>
								Change
								<ChevronDownIcon />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align='start' className='w-72'>
							<DropdownMenuLabel>About</DropdownMenuLabel>
							{patients.map((patient) => (
								<DropdownMenuItem key={patient.id} onSelect={() => setAboutId(patient.id)}>
									<PatientAvatar patient={patient} tone={tones.get(patient.id)} size='xs' />
									<span className='min-w-0 flex-1 truncate'>
										{patientName(patient)}
										<span className='text-muted-foreground'> · {patientPlace(patient)}</span>
									</span>
									{patient.id === aboutId ? <CheckIcon aria-label='Picked' /> : null}
								</DropdownMenuItem>
							))}
							<DropdownMenuSeparator />
							<DropdownMenuItem onSelect={() => setAboutId("")}>
								<span className='flex-1'>No patient</span>
								{!aboutId ? <CheckIcon aria-label='Picked' /> : null}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
					<span className='flex-1' />
					{about && onOpenPatient ? (
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
					patientLabel={patients.length ? label : undefined}
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

/** The right column: who the conversation is with, where it goes, and the patients it's about (score, flags). */
function ConversationDetails({
	conversation,
	tones,
	onOpenPatient,
	onAsk,
}: {
	conversation: MessageConversation;
	tones: Map<string, AvatarFallbackProps["tone"]>;
	onOpenPatient?: (patientId: string) => void;
	onAsk?: (patient: CensusPatient) => void;
}) {
	const contact = conversation.with;
	const patients = conversation.patients ?? [];
	const photos = conversation.messages.filter((message) => message.photo).length;
	return (
		<aside
			aria-label='Conversation details'
			className='hidden w-80 shrink-0 flex-col gap-6 overflow-y-auto border-l border-border p-6 xl:flex'
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

			<section aria-labelledby='conversation-patients' className='flex flex-col gap-4'>
				<Typography as='h3' id='conversation-patients' size='sm' weight='semibold'>
					Patients
				</Typography>
				{patients.length ? (
					<ul className='flex flex-col gap-5'>
						{patients.map((patient) => {
							const name = patientName(patient);
							return (
								<li key={patient.id} className='flex flex-col gap-2'>
									<div className='flex items-center gap-3'>
										<PatientAvatar patient={patient} tone={tones.get(patient.id)} />
										<div className='flex min-w-0 flex-col'>
											<Typography size='sm' weight='semibold' className='truncate'>
												{name}
											</Typography>
											<Typography size='xs' className='truncate text-muted-foreground'>
												{[[patient.sex, patient.age].filter(Boolean).join(", "), patientPlace(patient)]
													.filter(Boolean)
													.join(" · ")}
											</Typography>
										</div>
									</div>
									<PatientCardScore acuity={patient.acuity} trajectory={patient.trajectory} size='sm' />
									{patient.tags?.length ? <PatientCardTags tags={patient.tags} name={name} size='sm' /> : null}
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
													aria-label={`Ask Intercept Live about ${name}`}
												>
													<AiSparkleIcon />
													Ask Intercept Live
												</Button>
											) : null}
										</div>
									) : null}
								</li>
							);
						})}
					</ul>
				) : (
					<p className='text-sm text-muted-foreground'>Not about a patient</p>
				)}
			</section>
		</aside>
	);
}

export {
	MessagesPanel,
	type MessageContact,
	type MessageConversation,
	type MessagesPanelProps,
	type MessagesTab,
};
