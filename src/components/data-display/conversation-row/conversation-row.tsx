import * as React from "react";

import { Avatar, AvatarBadge, AvatarFallback, AvatarImage, type AvatarFallbackProps } from "@/components/data-display/avatar";
import { CircleAlertFilledIcon } from "@/components/icons/circle-alert-filled-icon";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
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
	/** "Sarah Miller". */
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
	/** Unread messages: a bold name and a brand-colored time; a count goes in the row's accessible name ("3 unread"). */
	unread?: number | boolean;
	/** The open conversation: the `background` fill, `aria-current`. */
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
	selected = false,
	className,
	type = "button",
	...props
}: ConversationRowProps) {
	const now = useCurrentMinute();
	const when = sentAt !== undefined && now !== null ? formatRelativeDate(sentAt, now) : undefined;
	const unreadCount = typeof unread === "number" ? unread : 0;
	const isUnread = Boolean(unread);
	// One name, in the order a clinician triages: who, Urgent, how many unread, the patient, the message, when.
	const label = [
		person.name,
		urgent ? urgentLabel : undefined,
		unreadCount ? `${unreadCount} unread` : undefined,
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
				"flex w-full flex-col gap-2 border-b border-border px-4 py-3.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
				selected ? "bg-background" : "hover:bg-accent",
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
					<span className='flex items-center gap-2'>
						<span className={cn("min-w-0 flex-1 truncate text-sm", isUnread ? "font-bold" : "font-semibold")}>
							{person.name}
						</span>
						{when ? (
							<time
								dateTime={new Date(sentAt as string | number | Date).toISOString()}
								title={when.title}
								className={cn(
									"shrink-0 text-xs",
									isUnread ? "font-medium text-primary" : "text-muted-foreground",
								)}
							>
								{when.label}
							</time>
						) : null}
						{urgent ? (
							<span title={urgentLabel} className='inline-flex shrink-0'>
								<CircleAlertFilledIcon className='size-4 text-severity-critical' />
							</span>
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
