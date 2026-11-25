import * as React from "react";
import { ArrowUpRightIcon, ChevronLeftIcon, PanelRightIcon } from "lucide-react";

import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/data-display/avatar";
import { Badge } from "@/components/data-display/badge";
import {
	conversationRowPresenceDots,
	type ConversationRowPatient,
	type ConversationRowPerson,
} from "@/components/data-display/conversation-row";
import { Button } from "@/components/buttons/button";
import { PanelRightAltIcon } from "@/components/icons/panel-right-alt-icon";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { handleLinkClick } from "@/lib/new-tab-click";
import { formatRelativeDate } from "@/lib/relative-date";
import { cn } from "@/lib/utils";

/** Who the conversation is with: ConversationRow's person. */
type MessageHeaderPerson = ConversationRowPerson;

/** The patient the conversation is about: ConversationRow's patient. */
type MessageHeaderPatient = ConversationRowPatient;

type MessageHeaderProps = Omit<React.ComponentProps<"header">, "children"> & {
	person: MessageHeaderPerson;
	/** The line under the name: "Bedside nurse · Sidney Regional · Hospital messaging". */
	role?: string;
	/** The person's name is the heading, at this level. */
	headingLevel?: "h2" | "h3";
	/**
	 * When the last message was sent: "12 min ago" on the right, before Urgent, updated each minute, the exact time in its
	 * tooltip. ConversationRow's `sentAt`, so the header and the open row say the same.
	 */
	sentAt?: string | number | Date;
	/** An urgent clinical message is in it: a solid red Urgent badge on the right. */
	urgent?: boolean;
	urgentLabel?: string;
	/** The patient it's about: a 40px bar under the header. None leaves it out. */
	patient?: MessageHeaderPatient;
	/**
	 * A short summary of the patient, after their place on the bar ("Miller, Sarah · MICU · Bed 11 - MAP has fallen…"):
	 * 14/20 `foreground`, on the bar's one line, cut off with an ellipsis. On a button bar it's also its description.
	 */
	patientSummary?: string;
	/**
	 * Opens the patient's page. The patient's name becomes its own link, underlined on hover, whatever the rest of the bar
	 * does. Without `onToggleDetails`, a click anywhere on the bar opens the patient too, with an arrow at its end
	 * (Intercept Live, below xl, where the details can't show).
	 */
	onOpenPatient?: () => void;
	/**
	 * The patient's page as an address, with `onOpenPatient`: the name is then a real link, so Cmd/Ctrl+click opens the
	 * patient in a new tab while a plain click still calls `onOpenPatient` (`handleLinkClick`).
	 */
	patientHref?: string;
	/** Read after the patient's name on its link ("Miller, Sarah, open patient"). */
	openPatientLabel?: string;
	/** A Back button before the avatar (a narrow screen showing the conversation alone). */
	onBack?: () => void;
	backLabel?: string;
	/** Extra props for Back, e.g. a class that hides it once the list shows beside the conversation. */
	backButtonProps?: Omit<React.ComponentProps<typeof Button>, "onClick">;
	/**
	 * Makes the patient bar a button that opens and closes the patient's details beside the conversation, a `panel-right`
	 * icon at its end (intercept.ds `about-patient`); the name, with `onOpenPatient`, still opens the patient. Needs a
	 * `patient`: no patient, no bar.
	 */
	onToggleDetails?: () => void;
	/** Whether the details are open: the bar is `aria-expanded`. */
	detailsOpen?: boolean;
	/** Read after the patient's name on the toggle bar ("Miller, Sarah, patient details"). */
	detailsLabel?: string;
	/** The details' element id, for the toggle bar's `aria-controls`. */
	detailsId?: string;
};

/**
 * The open conversation's header: who it's with and where they work, when the last message came and Urgent, then the
 * patient it's about as a bar with a
 * short summary after their place (intercept.ds `about-patient`). The patient's name opens their page (`onOpenPatient`);
 * the rest of the bar opens and closes the patient's details (`onToggleDetails`), or opens the patient too.
 *
 * Figma: [intercept.ds › message-header](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1704-19847)
 */
function MessageHeader({
	person,
	role,
	headingLevel: Heading = "h2",
	sentAt,
	urgent = false,
	urgentLabel = "Urgent",
	patient,
	patientSummary,
	onOpenPatient,
	patientHref,
	openPatientLabel = "open patient",
	onBack,
	backLabel = "Back to conversations",
	backButtonProps,
	onToggleDetails,
	detailsOpen = false,
	detailsLabel = "patient details",
	detailsId,
	className,
	...props
}: MessageHeaderProps) {
	const { className: backClassName, ...backRest } = backButtonProps ?? {};
	const summaryId = React.useId();
	const now = useCurrentMinute();
	const when = sentAt !== undefined && now !== null ? formatRelativeDate(sentAt, now) : undefined;
	const summary = patientSummary?.trim();
	const barAction = onToggleDetails ?? onOpenPatient;
	// Above the bar's own button (a sibling stretched over the bar, below), so a click on the name opens the patient.
	const nameLinkClassName =
		"relative z-10 rounded-sm font-semibold text-foreground underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring";
	const nameLinkProps = patient
		? {
				"aria-label": `${patient.name}, ${openPatientLabel}`,
				// Without the toggle, the name is the bar's only stop for the keyboard, so it carries the summary.
				"aria-describedby": !onToggleDetails && summary ? summaryId : undefined,
			}
		: {};
	const patientName = !patient ? null : onOpenPatient ? (
		patientHref ? (
			<a
				href={patientHref}
				onClick={(event) => handleLinkClick(event, patientHref, onOpenPatient)}
				className={nameLinkClassName}
				{...nameLinkProps}
			>
				{patient.name}
			</a>
		) : (
			<button type='button' onClick={onOpenPatient} className={nameLinkClassName} {...nameLinkProps}>
				{patient.name}
			</button>
		)
	) : (
		<span className='font-semibold text-foreground'>{patient.name}</span>
	);
	const patientLine = patient ? (
		<span className='flex min-w-0 flex-1 items-center gap-1.5 px-[2px]'>
			{/* 20px, inside the 40px bar: Avatar's smallest size is 24px, so the size and the initials are set here. */}
			<Avatar size='xs' className='size-5 shrink-0 [&_[data-slot=avatar-fallback]]:text-[7px]'>
				{patient.photo ? <AvatarImage src={patient.photo} alt='' /> : null}
				<AvatarFallback tone={patient.tone}>{patient.initials}</AvatarFallback>
			</Avatar>
			{/* intercept.ds `about-patient` (`1705:19876`): one 14/20 line, the name semibold `foreground`, the place and
			    the hyphen muted, the summary `foreground`. */}
			<span className='min-w-0 flex-1 truncate text-sm text-muted-foreground'>
				{patientName}
				{patient.place ? ` · ${patient.place}` : null}
				{summary ? (
					<>
						{/* Figma's two spaces each side of the hyphen: `truncate` collapses repeated spaces, `whitespace-pre` keeps them. */}
						<span aria-hidden className='whitespace-pre'>
							{"  -  "}
						</span>
						<span id={summaryId} className='text-foreground'>
							{summary}
						</span>
					</>
				) : null}
			</span>
		</span>
	) : null;
	return (
		<header data-slot='message-header' className={cn("flex shrink-0 flex-col", className)} {...props}>
			<div className='flex items-center gap-4 border-b border-border px-6 py-3'>
				<div className='flex min-w-0 flex-1 items-center gap-3'>
					{onBack ? (
						<Button
							variant='ghost'
							size='icon-md'
							aria-label={backLabel}
							onClick={onBack}
							className={cn("-ml-2", backClassName)}
							{...backRest}
						>
							<ChevronLeftIcon />
						</Button>
					) : null}
					<Avatar size='md' className='shrink-0'>
						{person.photo ? <AvatarImage src={person.photo} alt='' /> : null}
						<AvatarFallback tone={person.tone}>{person.initials}</AvatarFallback>
						{person.presence ? <AvatarBadge className={conversationRowPresenceDots[person.presence]} /> : null}
					</Avatar>
					<div className='flex min-w-0 flex-1 flex-col'>
						<Heading className='truncate text-base font-semibold'>{person.name}</Heading>
						{role ? <p className='truncate text-sm text-muted-foreground'>{role}</p> : null}
					</div>
				</div>
				{/* The last message's time, then Urgent, 8px apart, as on the open row (ConversationRow). */}
				{when || urgent ? (
					<div className='flex shrink-0 items-center gap-2'>
						{when ? (
							<time
								dateTime={new Date(sentAt as string | number | Date).toISOString()}
								title={when.title}
								className='text-sm text-muted-foreground'
							>
								{when.label}
							</time>
						) : null}
						{urgent ? (
							<Badge variant='destructive' size='xs' className='bg-severity-critical'>
								{urgentLabel}
							</Badge>
						) : null}
					</div>
				) : null}
			</div>
			{patient ? (
				// The bar's click target is a button stretched over it (last, so it sits above the line's text), not the bar
				// itself: the patient's name is a link of its own, and a link can't sit inside a button.
				<div
					data-slot='message-header-patient'
					className={cn(
						"relative flex items-center gap-1.5 border-b border-border bg-background py-2.5 pr-4 pl-6",
						barAction && "group/patient transition-colors hover:bg-accent",
					)}
				>
					{patientLine}
					{/* Closed: lucide `panel-right`, `icon-subtle`, `icon` on hover (Figma's two states). Open: intercept.ds
					    `panel-right-alt` (`1727:569`), the panel drawn solid, in `icon`. */}
					{onToggleDetails ? (
						detailsOpen ? (
							<PanelRightAltIcon aria-hidden className='size-4 shrink-0 text-icon' />
						) : (
							<PanelRightIcon
								aria-hidden
								className='size-4 shrink-0 text-icon-subtle transition-colors group-hover/patient:text-icon'
							/>
						)
					) : onOpenPatient ? (
						<ArrowUpRightIcon
							aria-hidden
							className='size-4 shrink-0 text-icon-subtle transition-colors group-hover/patient:text-icon'
						/>
					) : null}
					{onToggleDetails ? (
						<button
							type='button'
							data-slot='message-header-patient-button'
							onClick={onToggleDetails}
							aria-label={`${patient.name}, ${detailsLabel}`}
							aria-expanded={detailsOpen}
							aria-controls={detailsId}
							// The label replaces the bar's text for screen readers, so the summary is read as its description.
							aria-describedby={summary ? summaryId : undefined}
							className='absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'
						/>
					) : onOpenPatient ? (
						// The whole bar opens the patient for the mouse; the keyboard and screen readers get the name's link, which
						// does the same, so this one stays out of their way.
						<button
							type='button'
							data-slot='message-header-patient-button'
							tabIndex={-1}
							aria-hidden
							onClick={onOpenPatient}
							className='absolute inset-0 outline-none'
						/>
					) : null}
				</div>
			) : null}
		</header>
	);
}

export { MessageHeader, type MessageHeaderPatient, type MessageHeaderPerson, type MessageHeaderProps };
