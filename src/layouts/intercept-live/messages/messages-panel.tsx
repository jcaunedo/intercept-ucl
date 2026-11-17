import * as React from "react";
import { ArrowUpRightIcon, ChevronLeftIcon, ImageIcon, MessageCircleIcon, PanelRightIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage, type AvatarFallbackProps } from "@/components/data-display/avatar";
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
import { avatarTones, patientInitials } from "../shared/patient-avatar";
import type { PanelHospital } from "../shared/patient-panel";

/** Who a thread is with at the bedside: the patient's nurse. */
type MessageThreadBedside = {
	name: string;
	/** "RN". */
	role: string;
	initials: string;
	tone?: AvatarFallbackProps["tone"];
	presence?: "online" | "away" | "offline";
};

/**
 * One patient's thread with their bedside nurse (PRD Messages MSG-001): the same thread the alert panel and the patient's
 * page show, here with every other thread in the clinician's scope.
 */
type MessageThread = {
	/** The patient's id: one thread per patient. */
	id: string;
	patient: CensusPatient;
	bedside: MessageThreadBedside;
	/** How the thread reaches the hospital, as a generic label, never a vendor's name ("Hospital messaging"; MSG-019). */
	channel: string;
	/** The thread as the API has it, oldest first. */
	messages: ConsultMessage[];
	/** How many of the bedside's latest messages the clinician hasn't read. */
	unread?: number;
	/** An urgent clinical message is in it, apart from routine chat (MSG-020, CC-03). */
	urgent?: boolean;
	/** Prototype only: the nurse's simulated replies (MSG-008). */
	replies?: ConsultReplies;
};

/** All threads, the unread ones or the urgent ones. */
type MessagesTab = "all" | "unread" | "urgent";

type MessagesPanelProps = {
	threads: MessageThread[];
	/** The hospitals in the clinician's scope, to filter by. */
	hospitals: PanelHospital[];
	/** The thread open first; the newest by default. */
	defaultThreadId?: string;
	defaultTab?: MessagesTab;
	/** A message the clinician sent, by thread (patient), for the app to send through the hospital's messaging. */
	onSendMessage?: (threadId: string, text: string) => void;
};

const presenceLabels: Record<NonNullable<MessageThreadBedside["presence"]>, string> = {
	online: "Online",
	away: "Away",
	offline: "Offline",
};

const presenceDots: Record<NonNullable<MessageThreadBedside["presence"]>, string> = {
	online: "bg-success",
	away: "bg-warning",
	offline: "bg-icon-subtle",
};

const patientName = (patient: CensusPatient) => [patient.firstName, patient.lastName].filter(Boolean).join(" ");

/** "MICU · Bed 7". */
const patientPlace = (patient: CensusPatient) => [patient.unit, patient.room, patient.bed].filter(Boolean).join(" · ");

const nurseLabel = (bedside: MessageThreadBedside) => `${bedside.name}, ${bedside.role}`;

const lastMessage = (thread: MessageThread) => thread.messages.at(-1);

/** The list's preview of a message: its text, or the photo's title. */
function preview(message: ConsultMessage | undefined, thread: MessageThread) {
	if (!message) return "No messages yet";
	const who = message.from === "you" ? "You" : (message.by ?? thread.bedside.name).split(",")[0];
	const what = message.text ?? (message.photo ? `Photo: ${message.photo.title}` : "");
	return `${who}: ${what}`;
}

/**
 * Intercept Live's Messages page (PRD Messages MSG-018): every thread with the bedside from every hospital the clinician
 * covers, in one inbox. The list (search, hospital, All / Unread / Urgent) on the left; the open thread in the middle,
 * the same thread and message box as the alert panel's; the patient and who the thread is with on the right. Opening a
 * thread reads it. Replies go back through each hospital's own messaging.
 */
function MessagesPanel({ threads, hospitals, defaultThreadId, defaultTab = "all", onSendMessage }: MessagesPanelProps) {
	const navigation = usePatientNavigation();
	const now = useCurrentMinute();
	const [tab, setTab] = React.useState<MessagesTab>(defaultTab);
	const [query, setQuery] = React.useState("");
	const [hospitalId, setHospitalId] = React.useState("all");
	const sorted = React.useMemo(
		() =>
			[...threads].sort(
				(a, b) => Date.parse(lastMessage(b)?.sentAt ?? "0") - Date.parse(lastMessage(a)?.sentAt ?? "0"),
			),
		[threads],
	);
	const [selectedId, setSelectedId] = React.useState<string | undefined>(defaultThreadId ?? sorted[0]?.id);
	// Below md one column shows at a time: the list, or the thread once one is picked.
	const [threadShown, setThreadShown] = React.useState(false);
	const [detailsOpen, setDetailsOpen] = React.useState(true);
	// Threads opened here, read: their unread count clears.
	const [read, setRead] = React.useState<ReadonlySet<string>>(() => new Set(selectedId ? [selectedId] : []));
	// Threads opened this visit keep their consult session, so a message sent in one is still there on coming back to it.
	const [visited, setVisited] = React.useState<string[]>(() => (selectedId ? [selectedId] : []));

	const unreadOf = (thread: MessageThread) => (read.has(thread.id) ? 0 : (thread.unread ?? 0));
	const tones = React.useMemo(() => avatarTones(threads.map((thread) => thread.patient)), [threads]);

	const needle = query.trim().toLowerCase();
	const shown = sorted.filter((thread) => {
		if (tab === "unread" && !unreadOf(thread)) return false;
		if (tab === "urgent" && !thread.urgent) return false;
		if (hospitalId !== "all" && thread.patient.hospitalId !== hospitalId) return false;
		if (!needle) return true;
		const haystack = [
			patientName(thread.patient),
			thread.bedside.name,
			thread.patient.hospital,
			...thread.messages.map((message) => message.text ?? message.photo?.title ?? ""),
		]
			.join(" ")
			.toLowerCase();
		return haystack.includes(needle);
	});
	const unreadCount = sorted.filter((thread) => unreadOf(thread) > 0).length;
	const urgentCount = sorted.filter((thread) => thread.urgent).length;
	const selected = sorted.find((thread) => thread.id === selectedId);

	const select = (id: string) => {
		setSelectedId(id);
		setThreadShown(true);
		setRead((ids) => new Set(ids).add(id));
		setVisited((ids) => (ids.includes(id) ? ids : [...ids, id]));
	};

	const openPatient = (thread: MessageThread) =>
		navigation?.openPatient(
			thread.id,
			shown.map((item) => item.id),
		);

	if (!threads.length) {
		return (
			<main className='relative flex flex-1 flex-col p-6'>
				<Typography as='h1' size='2xl' weight='bold'>
					Messages
				</Typography>
				<EmptyState
					className='absolute inset-0 px-6'
					icon={<MessageCircleIcon />}
					title='No messages yet'
					description="Messages with your patients' bedside nurses, from every hospital you cover, will appear here."
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
						<TabsTrigger value='unread' aria-label={`Unread, ${unreadCount} threads`}>
							Unread
							{unreadCount ? <Counter count={unreadCount} /> : null}
						</TabsTrigger>
						<TabsTrigger value='urgent' aria-label={`Urgent, ${urgentCount} threads`}>
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
			    over a `flex-1` box, so a long thread scrolls inside its column instead of making the page taller. */}
			<div className='relative flex-1'>
				<div className='absolute inset-0 flex'>
					<h1 className='sr-only'>Messages</h1>

					{/* Threads */}
					<section
						aria-label='Threads'
						className={cn(
							"flex w-full shrink-0 flex-col border-r border-border md:w-[22rem]",
							threadShown && "max-md:hidden",
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
								{shown.map((thread) => {
									const last = lastMessage(thread);
									const unread = unreadOf(thread);
									const when = last && now !== null ? formatRelativeDate(last.sentAt, now) : undefined;
									const name = patientName(thread.patient);
									const isSelected = thread.id === selectedId;
									return (
										<li key={thread.id}>
											<button
												type='button'
												onClick={() => select(thread.id)}
												aria-current={isSelected ? "true" : undefined}
												aria-label={[
													name,
													thread.urgent ? "Urgent" : undefined,
													unread ? `${unread} unread` : undefined,
													preview(last, thread),
													when?.label,
												]
													.filter(Boolean)
													.join(", ")}
												className={cn(
													"flex w-full gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
													isSelected && "bg-accent",
												)}
											>
												<PatientAvatar thread={thread} tone={tones.get(thread.id)} />
												<span className='flex min-w-0 flex-1 flex-col gap-0.5'>
													<span className='flex items-baseline gap-2'>
														<span className={cn("min-w-0 flex-1 truncate text-sm", unread ? "font-bold" : "font-semibold")}>
															{name}
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
													<span
														className={cn(
															"line-clamp-2 text-sm",
															unread ? "text-foreground" : "text-muted-foreground",
														)}
													>
														{last?.photo && !last.text ? (
															<ImageIcon aria-hidden className='mr-1 inline size-3.5 align-[-2px]' />
														) : null}
														{preview(last, thread)}
													</span>
													<span className='flex items-center gap-2 pt-1'>
														<span className='min-w-0 flex-1 truncate text-xs text-muted-foreground'>
															{thread.patient.hospital} · {patientPlace(thread.patient)}
														</span>
														{thread.urgent ? (
															<Badge variant='red' size='xs'>
																Urgent
															</Badge>
														) : null}
														{unread ? <Counter count={unread} /> : null}
													</span>
												</span>
											</button>
										</li>
									);
								})}
							</ul>
						) : (
							<div className='flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center'>
								<MessageCircleIcon aria-hidden className='size-5 text-icon-subtle' />
								<p className='text-sm text-muted-foreground'>
									{tab === "unread" && !needle && hospitalId === "all"
										? "You're all caught up"
										: "No threads match"}
								</p>
							</div>
						)}
					</section>

					{/* Each thread opened this visit keeps its consult session (sent messages, the draft), before the open one's
					    scope so the open one owns its session. */}
					{visited.map((id) => (
						<ConsultSessionScope key={id} patientId={id}>
							{null}
						</ConsultSessionScope>
					))}

					{/* The open thread */}
					{selected ? (
						<section
							aria-label={`Thread about ${patientName(selected.patient)}`}
							className={cn("flex min-w-0 flex-1 flex-col", !threadShown && "max-md:hidden")}
						>
							<header className='flex shrink-0 items-center gap-3 border-b border-border px-6 py-3'>
								<Button
									variant='ghost'
									size='icon-md'
									aria-label='Back to threads'
									onClick={() => setThreadShown(false)}
									className='-ml-2 md:hidden'
								>
									<ChevronLeftIcon />
								</Button>
								<PatientAvatar thread={selected} tone={tones.get(selected.id)} size='md' />
								<div className='flex min-w-0 flex-1 flex-col'>
									<div className='flex items-center gap-2'>
										<Typography as='h2' size='base' weight='semibold' className='truncate'>
											{patientName(selected.patient)}
										</Typography>
										{selected.urgent ? (
											<Badge variant='red' size='xs'>
												Urgent
											</Badge>
										) : null}
									</div>
									<Typography size='sm' className='truncate text-muted-foreground'>
										With {nurseLabel(selected.bedside)} · {selected.patient.hospital} · {selected.channel}
									</Typography>
								</div>
								{navigation ? (
									<Button variant='outline' size='sm' onClick={() => openPatient(selected)}>
										Open patient
										<ArrowUpRightIcon />
									</Button>
								) : null}
								<Button
									variant='ghost'
									size='icon-md'
									aria-label='Patient details'
									aria-pressed={detailsOpen}
									onClick={() => setDetailsOpen((open) => !open)}
									className='hidden aria-pressed:bg-accent xl:inline-flex'
								>
									<PanelRightIcon />
								</Button>
							</header>
							<ConsultSessionScope key={selected.id} patientId={selected.id}>
								<ThreadView thread={selected} onSendMessage={onSendMessage} />
							</ConsultSessionScope>
						</section>
					) : (
						<div className='hidden flex-1 flex-col items-center justify-center gap-2 text-center md:flex'>
							<MessageCircleIcon aria-hidden className='size-5 text-icon-subtle' />
							<p className='text-sm text-muted-foreground'>Pick a thread to read it</p>
						</div>
					)}

					{/* The patient and who the thread is with, from xl up. */}
					{selected && detailsOpen ? (
						<ThreadDetails
							thread={selected}
							tone={tones.get(selected.id)}
							onOpenPatient={navigation ? () => openPatient(selected) : undefined}
							onAsk={
								navigation
									? () => navigation.askAboutPatient(selected.id, patientName(selected.patient))
									: undefined
							}
						/>
					) : null}
				</div>
			</div>
		</>
	);
}

/** The thread's messages and the message box: the alert panel's own, so a thread reads the same everywhere. */
function ThreadView({
	thread,
	onSendMessage,
}: {
	thread: MessageThread;
	onSendMessage?: (threadId: string, text: string) => void;
}) {
	const [messages, send, typing] = useConsultMessages(
		thread.messages,
		[],
		onSendMessage ? (text) => onSendMessage(thread.id, text) : undefined,
		thread.replies,
	);
	return (
		// The thread keeps a readable width on a wide screen; ConsultMessages pulls its scroll area 24px out to the sides.
		<div className='mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-6 pt-4 pb-6'>
			<ConsultMessages messages={messages} onSend={send} nurse={nurseLabel(thread.bedside)} typing={typing} />
		</div>
	);
}

/** The patient's avatar: their photo, else their initials in their color. */
function PatientAvatar({
	thread,
	tone,
	size = "sm",
}: {
	thread: MessageThread;
	tone?: AvatarFallbackProps["tone"];
	size?: "sm" | "md" | "lg";
}) {
	return (
		<Avatar size={size} className='shrink-0'>
			{thread.patient.photo ? <AvatarImage src={thread.patient.photo} alt='' /> : null}
			<AvatarFallback tone={tone}>{patientInitials(thread.patient)}</AvatarFallback>
		</Avatar>
	);
}

/** The right column: the patient (score, flags), who the thread is with, and where it goes. */
function ThreadDetails({
	thread,
	tone,
	onOpenPatient,
	onAsk,
}: {
	thread: MessageThread;
	tone?: AvatarFallbackProps["tone"];
	onOpenPatient?: () => void;
	onAsk?: () => void;
}) {
	const { patient, bedside } = thread;
	const name = patientName(patient);
	const photos = thread.messages.filter((message) => message.photo).length;
	return (
		<aside
			aria-label='Patient details'
			className='hidden w-80 shrink-0 flex-col gap-6 overflow-y-auto border-l border-border p-6 xl:flex'
		>
			<div className='flex flex-col gap-3'>
				<div className='flex items-center gap-3'>
					<PatientAvatar thread={thread} tone={tone} size='lg' />
					<div className='flex min-w-0 flex-col'>
						<Typography size='base' weight='semibold' className='truncate'>
							{name}
						</Typography>
						<Typography size='sm' className='text-muted-foreground'>
							{[patient.sex, patient.age].filter(Boolean).join(", ")}
							{patient.mrn ? ` · MRN ${patient.mrn}` : ""}
						</Typography>
					</div>
				</div>
				<Typography size='sm' className='text-muted-foreground'>
					{patient.hospital} · {patientPlace(patient)}
				</Typography>
				<PatientCardScore acuity={patient.acuity} trajectory={patient.trajectory} />
				{patient.tags ? <PatientCardTags tags={patient.tags} name={name} size='sm' /> : null}
			</div>

			<hr className='border-border' />

			<dl className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm'>
				<dt className='text-muted-foreground'>With</dt>
				<dd className='flex flex-col'>
					<span className='font-medium'>{nurseLabel(bedside)}</span>
					{bedside.presence ? (
						<span className='flex items-center gap-1.5 text-muted-foreground'>
							<span className={cn("size-2 rounded-full", presenceDots[bedside.presence])} aria-hidden />
							{presenceLabels[bedside.presence]}
						</span>
					) : null}
				</dd>
				<dt className='text-muted-foreground'>Hospital</dt>
				<dd>{patient.hospital}</dd>
				<dt className='text-muted-foreground'>Channel</dt>
				<dd>{thread.channel}</dd>
				<dt className='text-muted-foreground'>Photos</dt>
				<dd>{photos ? `${photos} in this thread` : "None"}</dd>
			</dl>

			{onOpenPatient || onAsk ? (
				<div className='flex flex-col gap-2'>
					{onOpenPatient ? (
						<Button variant='outline' onClick={onOpenPatient}>
							Open patient
							<ArrowUpRightIcon />
						</Button>
					) : null}
					{onAsk ? (
						<Button variant='outline' onClick={onAsk}>
							<AiSparkleIcon />
							Ask Intercept Live
						</Button>
					) : null}
				</div>
			) : null}
		</aside>
	);
}

export {
	MessagesPanel,
	type MessageThread,
	type MessageThreadBedside,
	type MessagesPanelProps,
	type MessagesTab,
};
