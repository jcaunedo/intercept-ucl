import * as React from "react";
import { ArrowUpRightIcon, ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import type { BadgeProps } from "@/components/data-display/badge";
import { formatRelativeDate } from "@/lib/relative-date";
import { cn } from "@/lib/utils";

import { SourceLabel } from "../shared/source-label";

// Building blocks every Patient details section shares, so the Overview and the other tabs read as one page: a titled
// card, the Overview's cards (which the Care Plan tab shows too), the words for missing data, label-over-value pairs, and how times and freshness are written. Every value says
// where it's from and how old it is (PRD PD-120); a section without data says so instead of looking normal (PD-121).

/** "8:10 AM" in the user's locale. */
const formatTime = (iso: string) => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/** "Oct 26, 9:02 AM" in the user's locale, for anything older than today. */
const formatDateTime = (iso: string) =>
	new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/**
 * A time when it's within the last 12 hours ("2:14 PM"), a date and time for anything older ("Nov 18, 8:10 AM") or before
 * the first client render. Every tab writes a past time this way, so a multi-day stay never shows a bare time.
 */
function formatWhen(iso: string, now: number | null) {
	return now !== null && now - Date.parse(iso) < 12 * 3_600_000 ? formatTime(iso) : formatDateTime(iso);
}

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
	id,
	title,
	meta,
	action,
	headingLevel = "h2",
	className,
	children,
}: {
	/** Lets the page bring the card into view and focus it, e.g. from the header's "View alerts". */
	id?: string;
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
			id={id}
			aria-labelledby={headingId}
			tabIndex={id ? -1 : undefined}
			className={cn(
				"flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-4",
				id && "scroll-mt-[calc(var(--patient-header-height,0px)+5rem)] outline-none",
				className,
			)}
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

/**
 * A section's group without a card (Nov 13, 2026, user's call: tables without containers): its heading, a note at the
 * right (e.g. the source), then its content, usually a UCL Table.
 */
function SectionGroup({ title, meta, children }: { title: string; meta?: React.ReactNode; children: React.ReactNode }) {
	const headingId = React.useId();
	return (
		<section aria-labelledby={headingId} className='flex min-w-0 flex-col gap-3'>
			<div className='flex flex-wrap items-center justify-between gap-x-3 gap-y-1'>
				<h2 id={headingId} className='text-base font-semibold text-foreground'>
					{title}
				</h2>
				{meta ? <p className='flex items-center gap-1.5 text-xs text-muted-foreground'>{meta}</p> : null}
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

/** The latest of the timestamps, for a section's freshness. */
const latest = (times: (string | undefined)[]) =>
	times.reduce<string | undefined>((last, time) => (time && (!last || time > last) ? time : last), undefined);

/** "45 min", "2 h 39 min", "5 h". */
function formatSpan(minutes: number) {
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	if (!hours) return `${rest} min`;
	return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/* -------------------------------------------------------------------------- */
/* Overview cards (the Overview's grid and the Care Plan tab)               */
/* -------------------------------------------------------------------------- */

/**
 * One of the Overview's cards (Intercept-Live `149:4464`, Nov 9, 2026): the title with the card's links at the right, its
 * content, and a footer at the bottom (where the data comes from, or a note). Cards in a row of the grid share its
 * height, so their footers line up.
 */
function OverviewCard({
	title,
	leading,
	meta,
	actions,
	footer,
	className,
	children,
}: {
	/** The heading's content: words, or a control inside the heading (a disclosure, the Care Plan tab's problems). */
	title: React.ReactNode;
	/** Before the title, e.g. Live monitoring's live dot. */
	leading?: React.ReactNode;
	/** Right of the title, muted, e.g. "3/3 devices connected". */
	meta?: React.ReactNode;
	/** The card's links, at the right of the title. */
	actions?: React.ReactNode;
	footer?: React.ReactNode;
	className?: string;
	children: React.ReactNode;
}) {
	const headingId = React.useId();
	return (
		<section
			aria-labelledby={headingId}
			className={cn(
				"flex min-w-0 flex-col justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4 shadow-sm",
				className,
			)}
		>
			<div className='flex min-h-0 flex-1 flex-col gap-2'>
				<div className='flex min-h-8 flex-wrap items-center gap-x-2 gap-y-1'>
					{leading}
					<h2 id={headingId} className='min-w-0 flex-1 text-lg font-semibold text-foreground'>
						{title}
					</h2>
					{meta ? <p className='text-sm text-muted-foreground'>{meta}</p> : null}
					{actions ? <div className='-mr-1 flex items-center'>{actions}</div> : null}
				</div>
				{children}
			</div>
			{footer ? <div className='flex flex-col gap-1'>{footer}</div> : null}
		</section>
	);
}

/** A card's source line: the source icon, then where the data comes from and how old it is. */
function CardSource({ children }: { children: React.ReactNode }) {
	return (
		<p className='text-xs text-muted-foreground'>
			<SourceLabel>{children}</SourceLabel>
		</p>
	);
}

/** A card's link to where its whole list lives (another tab, the Pathway panel), with the ↗ that says it goes there. */
function CardLink({ children, ...props }: Omit<React.ComponentProps<typeof Button>, "variant" | "size">) {
	return (
		<Button variant='ghost' size='sm' className='text-link hover:text-link' {...props}>
			{children}
			<ArrowUpRightIcon aria-hidden='true' />
		</Button>
	);
}

/** A card's "View all" that shows the rest of the list in place, then "Show fewer". */
function CardToggle({ expanded, total, onToggle }: { expanded: boolean; total: number; onToggle: () => void }) {
	return (
		<Button variant='ghost' size='sm' aria-expanded={expanded} onClick={onToggle} className='text-link hover:text-link'>
			{expanded ? "Show fewer" : `View all · ${total}`}
			<ChevronDownIcon
				aria-hidden='true'
				className={cn("transition-transform duration-160 motion-reduce:transition-none", expanded && "rotate-180")}
			/>
		</Button>
	);
}

/**
 * A card's list: rows between rules, the first with one above it too. At most 400px tall, about Up next's five rows (one or two wrapped)
 * (Nov 13, 2026, user's call), and it never scrolls: a row that wouldn't fit whole is hidden, never cut, and the card's
 * View all leads to the rest. The footer (the source line) stays under it. `capped={false}` for a list shown in full
 * (the Care Plan tab, Up next expanded).
 */
function CardList({ capped = true, className, children, ...props }: React.ComponentProps<"ul"> & { capped?: boolean }) {
	const ref = React.useRef<HTMLUListElement>(null);
	React.useLayoutEffect(() => {
		const list = ref.current;
		if (!list) return;
		const rows = [...list.children] as HTMLElement[];
		const fit = () => {
			for (const row of rows) row.hidden = false;
			if (!capped) return;
			const limit = parseFloat(getComputedStyle(list).maxHeight);
			if (!Number.isFinite(limit)) return;
			// The first row always shows, so a card is never empty.
			for (const row of rows.slice(1)) row.hidden = row.offsetTop + row.offsetHeight > limit;
		};
		fit();
		const observer = new ResizeObserver(fit);
		observer.observe(list);
		return () => {
			observer.disconnect();
			for (const row of rows) row.hidden = false;
		};
	});
	return (
		<ul ref={ref} className={cn("relative flex flex-col", capped && "max-h-100 overflow-hidden", className)} {...props}>
			{children}
		</ul>
	);
}

/**
 * One row of a card's list: what it is (base semibold), then a line with its particulars (`detail` in `foreground`,
 * `extra` muted after it), and at the right a status Badge or a time (`aside`). `children` add lines under them.
 */
function CardRow({
	title,
	detail,
	extra,
	join = " · ",
	aside,
	children,
}: {
	title: React.ReactNode;
	detail?: React.ReactNode;
	extra?: React.ReactNode;
	/** What goes between `detail` and `extra`. */
	join?: string;
	aside?: React.ReactNode;
	children?: React.ReactNode;
}) {
	return (
		<li className='flex items-center justify-between gap-3 border-b border-border px-2 py-3 first:border-t'>
			<div className='flex min-w-0 flex-col gap-1'>
				<div className='flex flex-col'>
					<span className='text-base font-semibold text-foreground'>{title}</span>
					{detail || extra ? (
						<span className='text-sm text-muted-foreground'>
							{detail ? <span className='text-foreground'>{detail}</span> : null}
							{detail && extra ? join : null}
							{extra}
						</span>
					) : null}
				</div>
				{children}
			</div>
			{aside ? <div className='shrink-0'>{aside}</div> : null}
		</li>
	);
}

/** A time at the right of a row: "Given 2:53 PM", "Just now". */
function RowTime({ children }: { children: React.ReactNode }) {
	return <span className='text-xs text-muted-foreground'>{children}</span>;
}

/** When something is due, as a chip: overdue in red, within the hour in amber, later in grey. */
function dueChip(at: string, now: number): { label: string; variant: BadgeProps["variant"] } {
	const minutes = Math.round((Date.parse(at) - now) / 60_000);
	if (minutes < 0) return { label: `Overdue ${formatSpan(-minutes)}`, variant: "red" };
	if (minutes < 1) return { label: "Due now", variant: "amber" };
	if (minutes <= 60) return { label: `In ${formatSpan(minutes)}`, variant: "amber" };
	return { label: `In ${formatSpan(minutes)}`, variant: "secondary" };
}

export {
	CardLink,
	CardList,
	CardRow,
	CardSource,
	CardToggle,
	Detail,
	dueChip,
	formatDateTime,
	formatElapsed,
	formatSpan,
	formatTime,
	formatWhen,
	freshness,
	latest,
	NoData,
	OverviewCard,
	RowTime,
	SectionCard,
	SectionGroup,
};

