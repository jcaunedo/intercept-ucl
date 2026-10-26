import * as React from "react";

import { Button } from "@/components/buttons/button";
import { Typography } from "@/components/typography/typography";
import { cn } from "@/lib/utils";

type EmptyStateProps = Omit<React.ComponentProps<"div">, "title"> & {
	/** What's missing, e.g. "No patients match these filters". */
	title: string;
	/** One line on what will appear here, or how to get there. */
	description?: string;
	/** Optional icon above the title. */
	icon?: React.ReactNode;
	/** Names the next step, e.g. "Clear filters". Omit for no button. */
	buttonLabel?: string;
	/** Optional icon before the button's label. */
	buttonIcon?: React.ReactNode;
	/** Forwarded to the button, e.g. `onClick`. */
	buttonProps?: Omit<React.ComponentProps<typeof Button>, "children">;
	/** Heading level for the title. Defaults to `h2`, under the page's `h1`. */
	headingLevel?: "h2" | "h3";
};

/**
 * A centered message for a view with nothing to show: a list with no items yet, filters that match nothing, or a
 * page that isn't available yet. The same layout for every empty view; only the copy, and whether there's an action,
 * changes. It centers itself in the space its parent gives it (pass `className="flex-1"` to fill a panel).
 *
 * Figma: none yet. Ported from bethere-ucl's EmptyState (DESIGN.md "EmptyState").
 */
function EmptyState({
	title,
	description,
	icon,
	buttonLabel,
	buttonIcon,
	buttonProps,
	headingLevel = "h2",
	className,
	...props
}: EmptyStateProps) {
	return (
		<div
			data-slot='empty-state'
			className={cn("flex w-full flex-col items-center justify-center gap-4 text-center", className)}
			{...props}
		>
			{/* Icon, title and description 8px apart; the button 16px below them. */}
			<div className='flex flex-col items-center gap-2'>
				{icon ? (
					<div data-slot='empty-state-icon' className='flex items-center justify-center text-icon'>
						{icon}
					</div>
				) : null}
				<Typography as={headingLevel} size='lg' weight='semibold' className='text-foreground'>
					{title}
				</Typography>
				{/* Capped at 640px so long copy wraps to a comfortable line length. */}
				{description ? (
					<Typography size='base' className='max-w-[640px] text-muted-foreground'>
						{description}
					</Typography>
				) : null}
			</div>
			{buttonLabel ? (
				<Button variant='default' size='lg' {...buttonProps}>
					{buttonIcon}
					{buttonLabel}
				</Button>
			) : null}
		</div>
	);
}

export { EmptyState, type EmptyStateProps };
