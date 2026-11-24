import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { Avatar, AvatarBadge, AvatarFallback, AvatarImage, type AvatarFallbackProps } from "@/components/data-display/avatar";
import { CircleAlertFilledIcon } from "@/components/icons/circle-alert-filled-icon";
import { UnreadIcon } from "@/components/icons/unread-icon";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { exitTransition, standardTransition, useMotionPreference } from "@/lib/motion";
import { formatRelativeDate } from "@/lib/relative-date";
import { cn } from "@/lib/utils";

/** Whether the person can be reached now: the dot on their avatar. */
type ConversationRowPresence = "online" | "away" | "offline";

/** Who the conversation is with: a bedside nurse, a charge nurse, a pharmacist… */
type ConversationRowPerson = {
	/** As shown, credential included: "Kelly Ortiz, RN". */
	name: string;
	initials: string;
	photo?: string;
	tone?: AvatarFallbackProps["tone"];
	presence?: ConversationRowPresence;
};

/** The patient the conversation is about. */
type ConversationRowPatient = {
	/** As shown, last name first as on the patient cards: "Miller, Sarah". */
	name: string;
	/** Where they are: "MICU · Bed 11". */
	place?: string;
	initials: string;
	photo?: string;
	tone?: AvatarFallbackProps["tone"];
};

const conversationRowPresenceDots: Record<ConversationRowPresence, string> = {
	online: "bg-success",
	away: "bg-warning",
	offline: "bg-icon-subtle",
};

type ConversationRowProps = Omit<React.ComponentProps<"button">, "children"> & {
	person: ConversationRowPerson;
	/** The line under the name: "Bedside nurse · Sidney Regional". */
	role?: string;
	/** The last message, two lines at most: "You: …", or a photo's title with an icon. */
	preview: React.ReactNode;
	/** The last message as text, for the row's accessible name, when `preview` isn't a string. */
	previewLabel?: string;
	/** When the last message was sent: "2 min ago", updated each minute, the exact time in its tooltip. */
	sentAt?: string | number | Date;
	/** The patient it's about; none leaves the patient line out. */
	patient?: ConversationRowPatient;
	/** An urgent clinical message is in it: a red alert icon after the time. */
	urgent?: boolean;
	/** What the row's accessible name and the icon's tooltip call it ("Urgent"). */
	urgentLabel?: string;
	/**
	 * Unread messages: a bold name and the unread icon after the time (before Urgent); a count goes in the
	 * row's accessible name ("3 unread"), `true` reads `unreadLabel`.
	 */
	unread?: number | boolean;
	/** What the row's accessible name (without a count) and the unread icon's tooltip call it ("Unread"). */
	unreadLabel?: string;
	/** The open conversation: the `background` fill, a 2px `foreground` bar on the left edge, `aria-current`. */
	selected?: boolean;
};

/**
 * One conversation in a messages list: who it's with and where they work, when the last message came, the last message
 * and the patient it's about. A button that spans the list, a rule under it; put it in a list item.
 *
 * Figma: [intercept.ds › messages / conversation-row](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1615-583)
 */
function ConversationRow({
	person,
	role,
	preview,
	previewLabel,
	sentAt,
	patient,
	urgent = false,
	urgentLabel = "Urgent",
	unread,
	unreadLabel = "Unread",
	selected = false,
	className,
	type = "button",
	...props
}: ConversationRowProps) {
	const now = useCurrentMinute();
	const { prefersReducedMotion, resolve } = useMotionPreference();
	const when = sentAt !== undefined && now !== null ? formatRelativeDate(sentAt, now) : undefined;
	const unreadCount = typeof unread === "number" ? unread : 0;
	const isUnread = Boolean(unread);
	// One name, in the order a clinician triages: who, Urgent, how many unread, the patient, the message, when.
	const label = [
		person.name,
		urgent ? urgentLabel : undefined,
		unreadCount ? `${unreadCount} unread` : isUnread ? unreadLabel : undefined,
		patient ? `About ${patient.name}` : undefined,
		typeof preview === "string" ? preview : previewLabel,
		when?.label,
	]
		.filter(Boolean)
		.join(", ");
	return (
		<button
			data-slot='conversation-row'
			data-selected={selected || undefined}
			data-unread={isUnread || undefined}
			type={type}
			aria-current={selected ? "true" : undefined}
			aria-label={label}
			className={cn(
				// The ring sits inside: rows span a list that scrolls, which would clip one outside.
				"relative flex w-full flex-col gap-2 border-b border-border px-4 py-3.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
				// The selected row's bar on its left edge, down to the rule; always there, so selecting fades it in.
				"before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-foreground before:opacity-0 before:transition-opacity",
				selected ? "bg-background before:opacity-100" : "hover:bg-accent",
				className,
			)}
			{...props}
		>
			<span className='flex w-full items-center gap-3'>
				<Avatar size='sm' className='shrink-0'>
					{person.photo ? <AvatarImage src={person.photo} alt='' /> : null}
					<AvatarFallback tone={person.tone}>{person.initials}</AvatarFallback>
					{person.presence ? <AvatarBadge className={conversationRowPresenceDots[person.presence]} /> : null}
				</Avatar>
				<span className='flex min-w-0 flex-1 flex-col'>
					{/* Margins, not a gap: the unread slot opens and closes its own space, so reading a conversation slides the
					    time over instead of jumping. */}
					<span className='flex items-center'>
						<span className={cn("min-w-0 flex-1 truncate text-sm", isUnread ? "font-bold" : "font-semibold")}>
							{person.name}
						</span>
						{when ? (
							<time
								dateTime={new Date(sentAt as string | number | Date).toISOString()}
								title={when.title}
								// Muted on an unread row too: the unread icon after it marks the row (Nov 24, 2026, user's call).
								className='ml-2 shrink-0 text-xs text-muted-foreground'
							>
								{when.label}
							</time>
						) : null}
						<AnimatePresence initial={false}>
							{isUnread ? (
								<motion.span
									key='unread'
									title={unreadLabel}
									// The slot opens its width and the 8px before it while the icon grows from its center, on one curve
									// (ChatComposer's Send). A fade under reduced motion.
									initial={
										prefersReducedMotion ? { width: 16, marginLeft: 8, opacity: 0 } : { width: 0, marginLeft: 0, scale: 0 }
									}
									animate={{ width: 16, marginLeft: 8, scale: 1, opacity: 1, transition: resolve(standardTransition) }}
									exit={
										prefersReducedMotion
											? { opacity: 0, transition: resolve(exitTransition) }
											: { width: 0, marginLeft: 0, scale: 0, transition: resolve(exitTransition) }
									}
									className='inline-flex shrink-0 justify-center'
								>
									<UnreadIcon className='size-4 shrink-0 text-brand' />
								</motion.span>
							) : null}
						</AnimatePresence>
						{urgent ? (
							<motion.span
								title={urgentLabel}
								// 4px after the unread icon, 8px after the time; eases between them with the unread slot.
								initial={false}
								animate={{
									marginLeft: isUnread ? 4 : 8,
									transition: resolve(isUnread ? standardTransition : exitTransition),
								}}
								className='inline-flex shrink-0'
							>
								<CircleAlertFilledIcon className='size-4 text-severity-critical' />
							</motion.span>
						) : null}
					</span>
					{role ? <span className='truncate text-xs text-muted-foreground'>{role}</span> : null}
				</span>
			</span>
			<span className='flex w-full min-w-0 flex-col gap-1.5 px-[2px]'>
				<span className='line-clamp-2 text-sm text-foreground'>{preview}</span>
				{patient ? (
					<span className='flex min-w-0 items-center gap-1.5'>
						<Avatar size='xs' className='shrink-0'>
							{patient.photo ? <AvatarImage src={patient.photo} alt='' /> : null}
							<AvatarFallback tone={patient.tone}>{patient.initials}</AvatarFallback>
						</Avatar>
						<span className='min-w-0 truncate text-xs text-foreground'>
							{patient.name}
							{patient.place ? <span className='text-muted-foreground'> · {patient.place}</span> : null}
						</span>
					</span>
				) : null}
			</span>
		</button>
	);
}

export {
	ConversationRow,
	conversationRowPresenceDots,
	type ConversationRowPatient,
	type ConversationRowPerson,
	type ConversationRowPresence,
	type ConversationRowProps,
};
