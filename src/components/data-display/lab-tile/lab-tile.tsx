import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { formatRelativeDate } from "@/lib/relative-date";
import { cn } from "@/lib/utils";

// A flagged result tints the whole tile, so an abnormal lab stands out in a grid of them; the flag is also a letter and
// a screen-reader word, never color alone (PRD Patient details PD-040). Small text uses each severity's `prominent`
// step: the base severity colors are under 4.5:1 at 12px on the tinted fills (DESIGN.md "LabTile").
const labTileVariants = cva("flex min-w-0 flex-col gap-1 rounded-lg px-3 py-2.5", {
	variants: {
		flag: {
			none: "bg-background-subtle",
			high: "bg-severity-high-subtle",
			low: "bg-severity-low-subtle",
			critical: "bg-severity-critical-subtle",
		},
	},
	defaultVariants: { flag: "none" },
});

type LabTileFlag = NonNullable<VariantProps<typeof labTileVariants>["flag"]>;

/** Each flag's letter, its words for screen readers and its color: LabTile's, for any place that shows a lab result's flag. */
const flags: Record<Exclude<LabTileFlag, "none">, { letter: string; label: string; className: string }> = {
	high: { letter: "H", label: "High", className: "text-severity-high-prominent" },
	low: { letter: "L", label: "Low", className: "text-severity-low-prominent" },
	critical: { letter: "C", label: "Critical", className: "text-severity-critical-prominent" },
};

/** "8:10 AM" in the user's locale. */
const formatTime = (iso: string) => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/** Digits after the decimal point, so "+0.5" keeps the results' own precision. */
const decimals = (value: string) => value.match(/\.(\d+)/)?.[1].length ?? 0;

/**
 * The change since the previous result: an arrow, a word and the amount with its sign ("+0.5", "−12"), at the
 * results' precision. Nothing when either value isn't a number or they're equal.
 */
function direction(value: string, previous: string) {
	const delta = Number.parseFloat(value) - Number.parseFloat(previous);
	if (Number.isNaN(delta) || delta === 0) return undefined;
	const amount = Math.abs(delta).toFixed(Math.max(decimals(value), decimals(previous)));
	return delta > 0 ? { arrow: "▲", label: "Up", amount: `+${amount}` } : { arrow: "▼", label: "Down", amount: `−${amount}` };
}

type LabTileProps = Omit<React.ComponentProps<"div">, "children"> &
	VariantProps<typeof labTileVariants> & {
		/** The lab, e.g. "Lactate". */
		name: string;
		/** The result as written by the lab, e.g. "4.1". Without it the lab is pending: "--". */
		value?: string;
		/** e.g. "mmol/L". */
		unit?: string;
		/** When it resulted, ISO 8601: "43 min ago" at the top right, updated each minute. */
		resultedAt?: string;
		/** The result before this one: "▲ +0.5 · Was 2.2 at 2:43 AM". */
		previous?: { value: string; at: string };
		/** When a pending lab was collected, ISO 8601: "Collected 7:23 AM". */
		collectedAt?: string;
		/**
		 * The top right in place of the result's age, e.g. a vital's context: "Nitro stops < 110", "Since 8:03 AM", or a stale
		 * "2 h old" in red. Lets the tile show a finding that isn't a lab.
		 */
		meta?: React.ReactNode;
		/** The bottom line when there's no previous result, e.g. "Charted · Normal", "IPAP/EPAP · FiO₂". */
		note?: React.ReactNode;
		/**
		 * Makes the whole tile one button, e.g. to open the lab's trend (Nov 25, 2026): a 2px `foreground` ring on hover, the
		 * focus ring on keyboard focus. Named "{name}, {openLabel}".
		 */
		onOpen?: () => void;
		/** What `onOpen` does, read after the lab's name: "view trend" by default. */
		openLabel?: string;
		/**
		 * With `onOpen`, makes the tile a toggle (Nov 25, 2026): `aria-pressed`, and the 2px `foreground` ring stays while
		 * pressed. Patient details' Labs tab: pressed while Lab trends shows that lab alone.
		 */
		pressed?: boolean;
	};

/**
 * One lab result: its name and age, the value with its unit and flag, and the change since the previous result
 * ("▲ +0.5 · Was 2.2 at 2:43 AM"). A pending lab shows "--" and when it was collected. Put it in a list item; a grid of them makes a key
 * labs panel.
 *
 * Figma: [intercept.ds › lab-tile](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1405-43)
 */
function LabTile({
	className,
	flag = "none",
	name,
	value,
	unit,
	resultedAt,
	previous,
	collectedAt,
	meta,
	note,
	onOpen,
	openLabel = "view trend",
	pressed,
	...props
}: LabTileProps) {
	const now = useCurrentMinute();
	const pending = value === undefined;
	const tone = !pending && flag && flag !== "none" ? flags[flag] : undefined;
	const change = !pending && previous ? direction(value, previous.value) : undefined;
	const resulted = !pending && resultedAt && now !== null ? formatRelativeDate(resultedAt, now) : undefined;

	return (
		<div
			data-slot='lab-tile'
			data-flag={pending ? "none" : flag}
			data-state={pending ? "pending" : "resulted"}
			className={cn(labTileVariants({ flag: pending ? "none" : flag }), onOpen && "relative", className)}
			{...props}
		>
			{onOpen ? (
				// Over the whole tile, so every part of it is the click target; the tile's text stays readable as text.
				<button
					type='button'
					aria-label={`${name}, ${openLabel}`}
					aria-pressed={pressed}
					onClick={onOpen}
					className={cn(
						"absolute inset-0 cursor-pointer rounded-[inherit] transition-shadow duration-160 ease-out outline-none hover:ring-2 hover:ring-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none",
						pressed && "ring-2 ring-foreground",
					)}
				/>
			) : null}
			<div className='flex flex-col'>
				<div className='flex items-baseline gap-2'>
					<span className='min-w-0 flex-1 truncate text-base font-semibold text-foreground'>{name}</span>
					{meta ? (
						<span className='shrink-0 text-xs text-muted-foreground'>{meta}</span>
					) : resulted ? (
						<time dateTime={resultedAt} title={resulted.title} className='shrink-0 text-xs text-muted-foreground'>
							{resulted.label}
						</time>
					) : null}
				</div>
				{pending ? (
					<span className='font-display text-2xl font-semibold text-muted-foreground'>
						<span aria-hidden='true'>--</span>
						<span className='sr-only'>Pending</span>
					</span>
				) : (
					<div className='flex items-baseline gap-1'>
						<span
							className={cn(
								"font-display text-2xl font-semibold tabular-nums",
								flag === "critical" ? "text-severity-critical" : "text-foreground",
							)}
						>
							{value}
						</span>
						<span className='min-w-0 flex-1 truncate text-xs text-muted-foreground'>{unit}</span>
						{tone ? (
							<span className={cn("shrink-0 text-xs font-bold", tone.className)}>
								<span aria-hidden='true'>{tone.letter}</span>
								<span className='sr-only'>{tone.label}</span>
							</span>
						) : null}
					</div>
				)}
			</div>
			{pending ? (
				<span className='text-xs text-foreground'>
					{collectedAt ? `Collected ${formatTime(collectedAt)}` : "Not resulted yet"}
				</span>
			) : previous ? (
				<span className='text-xs text-muted-foreground'>
					{/* The arrow and the amount take the flag's color; an in-range lab's change stays muted, so color always
					    means out of range. */}
					{change ? (
						<>
							<span className={tone?.className}>
								<span aria-hidden='true'>{change.arrow} </span>
								<span className='sr-only'>{change.label} </span>
								<span className='font-bold'>{change.amount}</span>
							</span>
							<span className='text-foreground'> · </span>
						</>
					) : null}
					<span className='text-foreground'>Was {previous.value}</span> at {formatTime(previous.at)}
				</span>
			) : note ? (
				<span className='text-xs text-foreground'>{note}</span>
			) : null}
		</div>
	);
}

export { LabTile, flags as labTileFlags, labTileVariants, type LabTileFlag, type LabTileProps };
