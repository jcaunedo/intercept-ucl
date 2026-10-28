import * as React from "react";

import { formatRelativeDate } from "@/lib/relative-date";
import { cn } from "@/lib/utils";

// Building blocks every Patient details section shares, so the Overview and the other tabs read as one page: a titled
// card, the words for missing data, label-over-value pairs, and how times and freshness are written. Every value says
// where it's from and how old it is (PRD PD-120); a section without data says so instead of looking normal (PD-121).

/** "8:10 AM" in the user's locale. */
const formatTime = (iso: string) => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/** "Oct 26, 9:02 AM" in the user's locale, for anything older than today. */
const formatDateTime = (iso: string) =>
	new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/** "Ventilator · 2 min ago": a value's source and age, or just the source before the first client render. */
function freshness(source: string, at: string, now: number | null) {
	return now === null ? source : `${source} · ${formatRelativeDate(at, now).label.toLowerCase()}`;
}

/** "2 h 21 min ago", "21 min ago", "just now". */
function formatElapsed(from: string, now: number) {
	const minutes = Math.max(0, Math.floor((now - Date.parse(from)) / 60_000));
	if (minutes < 1) return "just now";
	const hours = Math.floor(minutes / 60);
	return `${hours ? `${hours} h ` : ""}${minutes % 60 || !hours ? `${minutes % 60} min ` : ""}ago`;
}

/** A titled block of a section: its heading, where its data comes from (`meta`), an optional action, and its content. */
function SectionCard({
	title,
	meta,
	action,
	headingLevel = "h2",
	className,
	children,
}: {
	title: string;
	meta?: React.ReactNode;
	/** A control at the right of the heading row, e.g. a window switch or "New note". */
	action?: React.ReactNode;
	headingLevel?: "h2" | "h3";
	className?: string;
	children: React.ReactNode;
}) {
	const headingId = React.useId();
	const Heading = headingLevel;
	return (
		<section
			aria-labelledby={headingId}
			className={cn("flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-4", className)}
		>
			<div className='flex flex-wrap items-center justify-between gap-x-3 gap-y-1'>
				<Heading id={headingId} className='text-base font-semibold text-foreground'>
					{title}
				</Heading>
				{meta || action ? (
					<div className='flex items-center gap-3'>
						{meta ? <p className='flex items-center gap-1.5 text-xs text-muted-foreground'>{meta}</p> : null}
						{action}
					</div>
				) : null}
			</div>
			{children}
		</section>
	);
}

/** What a section shows when there's nothing to show: plain words, never an empty box or a zero. */
function NoData({ children }: { children: React.ReactNode }) {
	return <p className='text-sm text-muted-foreground'>{children}</p>;
}

/** A label over its value, inside a `<dl>`. */
function Detail({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className='flex flex-col'>
			<dt className='text-xs text-muted-foreground'>{label}</dt>
			<dd className='text-sm text-foreground'>{children}</dd>
		</div>
	);
}

export { Detail, formatDateTime, formatElapsed, formatTime, freshness, NoData, SectionCard };
