import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Avatar, AvatarBadge, AvatarFallback, AvatarImage, type AvatarFallbackProps } from "@/components/data-display/avatar";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { formatRelativeDate } from "@/lib/relative-date";
import { cn } from "@/lib/utils";

/** Whether the author can be reached now: the dot on their avatar. */
type ChatMessagePresence = "online" | "away" | "offline";

/** Who wrote the message. Their avatar shows when it has a photo or initials. */
type ChatMessageAuthor = {
	/** As shown in the name row: "You", "Kelly Ortiz, RN". */
	name: string;
	initials?: string;
	photo?: string;
	tone?: AvatarFallbackProps["tone"];
	presence?: ChatMessagePresence;
};

const chatMessagePresenceDots: Record<ChatMessagePresence, string> = {
	online: "bg-success",
	away: "bg-warning",
	offline: "bg-icon-subtle",
};

const chatMessageVariants = cva("flex flex-col gap-1", {
	variants: {
		variant: {
			received: "items-start",
			sent: "items-end",
		},
	},
	defaultVariants: { variant: "received" },
});

// The 16px text, 8 / 14 padding, the 16px corners with the one by the author 6px. Up to 584px of text (612 with the
// padding), never wider than 85% of the thread, so a narrow column (the alert panel's) still shows whose side it's on.
const chatBubbleVariants = cva(
	"max-w-[min(85%,38.25rem)] rounded-2xl px-3.5 py-2 text-base whitespace-pre-wrap text-foreground",
	{
		variants: {
			variant: {
				received: "rounded-bl-md border border-border bg-background",
				sent: "rounded-br-md bg-neutral-muted",
			},
		},
		defaultVariants: { variant: "received" },
	},
);

type ChatMessageProps = React.ComponentProps<"div"> &
	VariantProps<typeof chatMessageVariants> & {
		author: ChatMessageAuthor;
		/** When it was sent: "1 hr ago" after the name, updated each minute, the exact time in its tooltip. */
		sentAt?: string | number | Date;
		/**
		 * The name and time row. Leave it off for a message that follows the same author's within 30 seconds, so the run
		 * reads as one (ConsultMessages does this).
		 */
		showMeta?: boolean;
		/** Something sent with the message, above its text and outside the bubble: a photo with its readings. */
		attachment?: React.ReactNode;
		/** The text, in the bubble; none draws no bubble (a photo alone). */
		children?: React.ReactNode;
	};

/**
 * One message in a chat thread: who wrote it and when (their 16px avatar, the name, the time), then the text in a
 * bubble. `received` sits on the left on the background with a border; `sent` on the right on `neutral-muted`, the
 * author's avatar after the name.
 *
 * Figma: [intercept.ds › messages](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1635-9631)
 */
function ChatMessage({
	variant = "received",
	author,
	sentAt,
	showMeta = true,
	attachment,
	children,
	className,
	...props
}: ChatMessageProps) {
	const now = useCurrentMinute();
	const when = sentAt !== undefined && now !== null ? formatRelativeDate(sentAt, now) : undefined;
	const sent = variant === "sent";
	const avatar =
		author.photo || author.initials ? (
			// 16px, the row's height less 2px: Avatar's smallest size is 24px, so the size, the initials and the dot are
			// set here (DESIGN.md "ChatMessage").
			<Avatar size='xs' className='size-4 shrink-0 [&_[data-slot=avatar-fallback]]:text-[6px]'>
				{author.photo ? <AvatarImage src={author.photo} alt='' /> : null}
				<AvatarFallback tone={author.tone}>{author.initials}</AvatarFallback>
				{author.presence ? (
					<AvatarBadge className={cn("size-1 ring-1", chatMessagePresenceDots[author.presence])} />
				) : null}
			</Avatar>
		) : null;
	return (
		<div
			data-slot='chat-message'
			data-variant={variant}
			className={cn(chatMessageVariants({ variant }), className)}
			{...props}
		>
			{showMeta ? (
				<p className='flex items-center gap-1.5 text-xs'>
					{sent ? null : avatar}
					<span>
						{author.name}
						{when ? (
							<span className='text-muted-foreground'>
								{" · "}
								<time dateTime={new Date(sentAt as string | number | Date).toISOString()} title={when.title}>
									{when.label}
								</time>
							</span>
						) : null}
					</span>
					{sent ? avatar : null}
				</p>
			) : (
				// Grouped under the one before: the author is still read out.
				<span className='sr-only'>{author.name}</span>
			)}
			{attachment}
			{children ? <p className={chatBubbleVariants({ variant })}>{children}</p> : null}
		</div>
	);
}

/** One side of the day divider: a 1px zigzag, 8px tall with a 16.375px period, stretching to fill. */
function ZigzagRule() {
	// useId's characters aren't all safe inside url(#…).
	const id = `zigzag-${React.useId().replace(/[^\w-]/g, "")}`;
	return (
		<svg aria-hidden='true' className='h-2.5 min-w-0 flex-1 text-border-defined' preserveAspectRatio='none'>
			<defs>
				<pattern id={id} width='16.375' height='10' patternUnits='userSpaceOnUse'>
					<path d='M0 9 L8.1875 1 L16.375 9' fill='none' stroke='currentColor' strokeWidth='1' />
				</pattern>
			</defs>
			<rect width='100%' height='100%' fill={`url(#${id})`} />
		</svg>
	);
}

type ChatDayDividerProps = React.ComponentProps<"div"> & {
	/** The day: "Today", "Yesterday", "Saturday, Nov 7". */
	children: React.ReactNode;
	/** The day's element: a heading, so a thread can be skimmed by day (`h3` default). */
	headingLevel?: "h2" | "h3" | "h4" | "p";
};

/**
 * The day between two zigzag rules, before a thread's first message of each day.
 *
 * Figma: [intercept.ds › messages](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1635-10614)
 */
function ChatDayDivider({ children, headingLevel: Heading = "h3", className, ...props }: ChatDayDividerProps) {
	return (
		<div data-slot='chat-day-divider' className={cn("flex items-center gap-4 py-4", className)} {...props}>
			<ZigzagRule />
			<Heading className='shrink-0 text-xs font-medium text-foreground-subtle'>{children}</Heading>
			<ZigzagRule />
		</div>
	);
}

export {
	ChatDayDivider,
	ChatMessage,
	chatBubbleVariants,
	chatMessagePresenceDots,
	chatMessageVariants,
	type ChatDayDividerProps,
	type ChatMessageAuthor,
	type ChatMessagePresence,
	type ChatMessageProps,
};
