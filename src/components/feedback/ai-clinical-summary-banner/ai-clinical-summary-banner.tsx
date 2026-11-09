import { GitBranchIcon, XIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/buttons/button";
import { AiSparkleIcon } from "@/components/icons/ai-sparkle-icon";
import { cn } from "@/lib/utils";

type AiClinicalSummaryBannerProps = Omit<React.ComponentProps<"section">, "title" | "children"> & {
	/** What wrote it, first on the top line. Defaults to "AI clinical summary". */
	label?: string;
	/** The summary's headline, after the label: "AI clinical summary: Worsening hemodynamic and respiratory status". */
	title?: string;
	/** The summary itself, on the second line. */
	children: React.ReactNode;
	/** Where it comes from and how fresh it is, e.g. "17 sources · 3 h 10 min ago", after the source icon. */
	source?: React.ReactNode;
	/** Makes the summary one click target, e.g. to ask Intercept Live what's behind it. */
	onOpen?: () => void;
	/** The click target's name for screen readers, read after the summary. Defaults to "Ask Intercept Live for more". */
	openLabel?: string;
	/** Shows × at the end, which calls this, e.g. to hide the banner. */
	onClose?: () => void;
	/** The × button's name. Defaults to "Dismiss summary". */
	closeLabel?: string;
};

/**
 * A summary written by Intercept's AI, marked by its sparkle: a headline over one line of summary, then its sources and
 * freshness, and an optional ×. Each line keeps to one line, cut off with an ellipsis; the full text is in the hover title
 * and for screen readers. With `onOpen` the whole banner is one click target, except ×.
 *
 * Figma: [intercept.ds › AI Clinical Summary Banner](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1467-13678)
 */
function AiClinicalSummaryBanner({
	label = "AI clinical summary",
	title,
	children,
	source,
	onOpen,
	openLabel = "Ask Intercept Live for more",
	onClose,
	closeLabel = "Dismiss summary",
	className,
	...props
}: AiClinicalSummaryBannerProps) {
	const heading = title ? `${label}: ${title}` : label;
	const summaryText = typeof children === "string" ? children : undefined;

	const content = (
		<>
			<AiSparkleIcon aria-hidden='true' className='size-4 shrink-0' />
			<span className='flex min-w-0 flex-1 flex-col text-base text-foreground'>
				<span title={heading} className='truncate font-semibold'>
					{heading}
				</span>
				<span title={summaryText} className='truncate'>
					{children}
				</span>
			</span>
		</>
	);

	return (
		<section
			data-slot='ai-clinical-summary-banner'
			aria-label={label}
			className={cn(
				"relative flex items-center gap-2 rounded-lg border border-tone-accent-defined bg-tone-accent-subtle px-2.5 py-2 text-left",
				// The open target's hover and focus show on the whole banner.
				onOpen &&
					"transition-colors duration-160 ease-out has-[[data-slot=ai-clinical-summary-banner-open]:hover]:border-tone-accent has-[[data-slot=ai-clinical-summary-banner-open]:hover]:bg-tone-accent-muted has-[[data-slot=ai-clinical-summary-banner-open]:focus-visible]:ring-2 has-[[data-slot=ai-clinical-summary-banner-open]:focus-visible]:ring-ring has-[[data-slot=ai-clinical-summary-banner-open]:focus-visible]:ring-offset-2 motion-reduce:transition-none",
				className,
			)}
			{...props}
		>
			{onOpen ? (
				// Its hit area covers the banner (`after:inset-0`), so a click anywhere opens it; × sits above it.
				<button
					type='button'
					data-slot='ai-clinical-summary-banner-open'
					onClick={onOpen}
					className="flex min-w-0 flex-1 items-center gap-[9px] text-left outline-none after:absolute after:inset-0 after:rounded-lg after:content-['']"
				>
					{content}
					<span className='sr-only'>. {openLabel}.</span>
				</button>
			) : (
				<div className='flex min-w-0 flex-1 items-center gap-[9px]'>{content}</div>
			)}

			{source ? (
				<span className='flex shrink-0 items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground'>
					<GitBranchIcon aria-hidden='true' className='size-3 text-icon-muted' />
					{source}
				</span>
			) : null}

			{onClose ? (
				<Button
					variant='ghost'
					size='icon-sm'
					onClick={onClose}
					aria-label={closeLabel}
					className='relative shrink-0 opacity-60 hover:opacity-100 focus-visible:opacity-100'
				>
					<XIcon aria-hidden='true' />
				</Button>
			) : null}
		</section>
	);
}

export { AiClinicalSummaryBanner, type AiClinicalSummaryBannerProps };
