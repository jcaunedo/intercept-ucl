"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";
import { BellRingIcon, MapPinIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage, type AvatarFallbackProps } from "@/components/data-display/avatar";
import { Badge, type BadgeProps } from "@/components/data-display/badge";
import { MessageCircleSolidIcon } from "@/components/icons/message-circle-solid-icon";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/overlays/popover";
import {
	dismissVariants,
	liftPattern,
	pressPattern,
	resolvedFadeTransition,
	standardTransition,
	useMotionPreference,
} from "@/lib/motion";
import { formatRelativeDate } from "@/lib/relative-date";
import { cn } from "@/lib/utils";

import {
	PatientCardMoreActions,
	patientCardInteractiveClassName,
	patientCardOpenTargetClassName,
	usePatientCardActionsReveal,
	usePatientCardAlertRing,
	type PatientCardAction,
} from "./patient-census-card-parts";

/* -------------------------------------------------------------------------- */
/* PatientCardAlert                                                           */
/* -------------------------------------------------------------------------- */

const patientCardAlertVariants = cva(
	"inline-flex shrink-0 items-center gap-1.5 rounded-full py-1 pr-2.5 pl-2 text-sm font-medium whitespace-nowrap [&>svg]:size-3.5 [&>svg]:shrink-0",
	{
		variants: {
			variant: {
				critical: "bg-severity-critical text-severity-foreground",
				high: "bg-severity-high text-severity-foreground",
				medium: "bg-severity-medium text-severity-foreground",
				low: "bg-severity-low text-severity-foreground",
				resolved: "bg-success text-severity-foreground",
				// Unread messages, not an alert: a quiet fill so it never reads as a severity. Its icon is 16px, the bell 14px.
				message: "bg-neutral-muted text-neutral-prominent [&>svg]:size-4",
			},
		},
		defaultVariants: {
			variant: "critical",
		},
	},
);

type PatientCardAlertVariant = NonNullable<VariantProps<typeof patientCardAlertVariants>["variant"]>;

const alertLabels: Record<Exclude<PatientCardAlertVariant, "message">, string> = {
	critical: "Critical",
	high: "High",
	medium: "Medium",
	low: "Low",
	resolved: "Resolved",
};

type PatientCardAlertProps = React.ComponentProps<"span"> &
	VariantProps<typeof patientCardAlertVariants> & {
		/** Number of active alerts the pill stands for. Shown after the label ("Critical · 3") only when it's 2 or more. */
		count?: number;
		/**
		 * The icon and the count alone (the bell and "3"; the bell alone for one alert), the severity told by the fill. Screen readers
		 * still hear the label. 28px tall either way.
		 */
		iconOnly?: boolean;
	};

/**
 * The patient's highest-priority alert, or their unread messages. Severities show their name unless `children`
 * replaces it; `message` needs `children` (e.g. "1 message"). `iconOnly` drops the label from view.
 *
 * Figma: [intercept.ds › patient-card-alerts-badge](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1060-3605)
 */
function PatientCardAlert({
	className,
	variant = "critical",
	count,
	iconOnly = false,
	children,
	...props
}: PatientCardAlertProps) {
	const resolvedVariant = variant ?? "critical";
	const label = children ?? (resolvedVariant === "message" ? null : alertLabels[resolvedVariant]);
	const showCount = count !== undefined && count > 1;

	return (
		<span
			data-slot='patient-card-alert'
			data-variant={resolvedVariant}
			className={cn(
				patientCardAlertVariants({ variant: resolvedVariant }),
				// Without a text line the pill would shrink to the icon. With the icon alone, 8px on both sides, so it's centered.
				iconOnly && "h-7",
				iconOnly && !showCount && "pr-2",
				className,
			)}
			{...props}
		>
			{resolvedVariant === "message" ? <MessageCircleSolidIcon /> : <BellRingIcon aria-hidden='true' />}
			{iconOnly ? (
				<>
					<span className='sr-only'>{label}</span>
					{showCount ? (
						<span>
							{count}
							<span className='sr-only'> alerts</span>
						</span>
					) : null}
				</>
			) : (
				<span className='flex items-center gap-1'>
					<span>{label}</span>
					{showCount ? (
						<span>
							<span aria-hidden='true'>· </span>
							{count}
							<span className='sr-only'> alerts</span>
						</span>
					) : null}
				</span>
			)}
		</span>
	);
}

/* -------------------------------------------------------------------------- */
/* PatientCardMetric                                                          */
/* -------------------------------------------------------------------------- */

const patientCardMetricVariants = cva("flex min-w-0 flex-col whitespace-nowrap", {
	variants: {
		variant: {
			default: "text-foreground",
			// Out of range. The label takes the color too, so the reading stands out in a row of vitals.
			destructive: "text-destructive",
			success: "text-success",
			// Not monitored: the value shows "--".
			missing: "text-muted-foreground",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

type PatientCardMetricProps = Omit<React.ComponentProps<"div">, "children"> &
	VariantProps<typeof patientCardMetricVariants> & {
		label: string;
		value?: React.ReactNode;
		/** Direction of change, shown before the value (▲ / ▼). */
		trend?: "up" | "down";
		/** Which side of the normal range the reading is on, shown after the value (↑ / ↓). */
		range?: "above" | "below";
		/**
		 * Colors the trend arrow only, e.g. a rising acuity in `critical`, a slight rise in `medium`, a falling one in
		 * `success`.
		 */
		trendVariant?: "critical" | "medium" | "success";
		/** `sm` sets the value at 16px instead of 20px, for the small card. */
		size?: "md" | "sm";
	};

const trendVariantClassNames = {
	critical: "text-severity-critical",
	medium: "text-severity-medium",
	success: "text-success",
} as const;

const trendGlyphs = { up: ["▲", "rising"], down: ["▼", "falling"] } as const;
const rangeGlyphs = { above: ["↑", "above range"], below: ["↓", "below range"] } as const;

/** Arrow glyphs are decorative; screen readers get the word instead. */
function MetricGlyph({ glyph, text, className }: { glyph: string; text: string; className?: string }) {
	return (
		<>
			<span aria-hidden='true' className={cn("text-base", className)}>
				{glyph}
			</span>
			<span className='sr-only'>{text}</span>
		</>
	);
}

/**
 * One reading on the Patient card: a vital sign, or a score such as the change in acuity.
 *
 * Figma: [intercept.ds › patient-card-metrics](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1053-4684)
 */
function PatientCardMetric({
	className,
	variant = "default",
	label,
	value,
	trend,
	range,
	trendVariant,
	size = "md",
	...props
}: PatientCardMetricProps) {
	const missing = variant === "missing";
	const valueSize = size === "sm" ? "text-base" : "text-xl";

	return (
		<div
			data-slot='patient-card-metric'
			data-variant={variant}
			className={cn(patientCardMetricVariants({ variant, className }))}
			{...props}
		>
			<span className={cn("text-xs font-medium", variant === "default" && "text-muted-foreground")}>{label}</span>
			<span className='flex items-center gap-0.5 font-semibold'>
				{missing ? (
					<>
						<span aria-hidden='true' className={valueSize}>
							--
						</span>
						<span className='sr-only'>Not monitored</span>
					</>
				) : (
					<>
						{trend ? (
							<MetricGlyph
								glyph={trendGlyphs[trend][0]}
								text={trendGlyphs[trend][1]}
								className={trendVariant ? trendVariantClassNames[trendVariant] : undefined}
							/>
						) : null}
						<span className={valueSize}>{value}</span>
						{range ? <MetricGlyph glyph={rangeGlyphs[range][0]} text={rangeGlyphs[range][1]} /> : null}
					</>
				)}
			</span>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/* PatientCensusCard                                                          */
/* -------------------------------------------------------------------------- */

/** A reading in the card's trajectory or vitals rows. */
type PatientCardVital = Pick<PatientCardMetricProps, "label" | "value" | "variant" | "trend" | "range" | "trendVariant"> & {
	/**
	 * Abbreviation, e.g. "HR" for Heart Rate. It was for the compact card's vitals line, which the compact card no longer
	 * has (Oct 27, 2026), so it has no effect on PatientCensusCard now. Kept so apps that pass it still compile.
	 */
	shortLabel?: string;
};

/** A vital's metric props, without `shortLabel`, which isn't a DOM attribute. */
const toMetric = ({ shortLabel: _shortLabel, ...metric }: PatientCardVital) => metric;

/**
 * The color of a score's change arrow, the same everywhere the app shows it (the cards, the patient header, the Census
 * List; Oct 31, 2026, user's call): by the change itself, since a rising early-warning score is worse. ▲ by 1 is
 * `medium` (the medium alert color), ▲ by more `critical` red, ▼ `success` green. Only a change that isn't a number
 * falls back to the data's `trendVariant`.
 */
function scoreTrendVariant(
	trajectory?: Pick<PatientCardVital, "trend" | "trendVariant" | "value">,
): "critical" | "medium" | "success" | undefined {
	if (!trajectory?.trend) return undefined;
	if (trajectory.trend === "down") return "success";
	// The change arrives preformatted ("+1", "−2"); an API would send the number.
	const change = Math.abs(Number(String(trajectory.value ?? "").replace(/[−–]/g, "-")));
	if (Number.isFinite(change) && String(trajectory.value ?? "").trim() !== "") return change <= 1 ? "medium" : "critical";
	return trajectory.trendVariant ?? "critical";
}

/** `scoreTrendVariant` as the arrow's text color class. */
const scoreTrendClassName = (trajectory?: Pick<PatientCardVital, "trend" | "trendVariant" | "value">) => {
	const variant = scoreTrendVariant(trajectory);
	return variant ? trendVariantClassNames[variant] : undefined;
};

// A card with an active alert takes a 2px border in the alert's severity color. The padding drops to 14px so the
// content stays 16px in, as with the 1px border.
// `medium` is NEWS2's band between Low and High; `moderate` stays for scores whose bands use that word.
type PatientCardAcuityLevel = "low" | "moderate" | "medium" | "high" | "critical" | "unknown";

// Acuity is the level's word alone, the same words as some alert severities; it stays apart from an alert as plain text
// after its score, with no fill or border, never competing with the alert's solid pill. Every level is neutral text for
// now: no color carries its meaning until acuity's design is settled. Unknown is muted, as a missing value. Exported for
// pages that show acuity outside the card (e.g. Patient details), so the words and colors stay the same.
const acuityLevels: Record<PatientCardAcuityLevel, { label: string; className: string }> = {
	unknown: { label: "Unknown", className: "text-muted-foreground" },
	low: { label: "Low", className: "text-foreground" },
	moderate: { label: "Moderate", className: "text-foreground" },
	medium: { label: "Medium", className: "text-foreground" },
	high: { label: "High", className: "text-foreground" },
	critical: { label: "Critical", className: "text-foreground" },
};

type PatientCardAlertStatus = "active" | "acknowledged" | "escalated";

/** What a tag's popover says: what it means, what's behind it now, and where that comes from. */
type PatientCardTagDetails = {
	/** What the tag means, e.g. "Drips that raise blood pressure, running now." */
	description?: string;
	/** What's behind it now, one line each, e.g. `{ label: "Norepinephrine", value: "0.22 mcg/kg/min" }`. */
	items?: { label: string; value?: string }[];
	/** Where the lines come from, e.g. "Pump". */
	source?: string;
	/** When the newest line was updated, ISO 8601; shown after the source as it opens ("Pump · 1 min ago"). */
	updatedAt?: string;
};

type PatientCardTag = {
	label: string;
	/** Badge variant. Defaults to `outline`. */
	variant?: BadgeProps["variant"];
	/** Makes the tag a button that opens these details in a popover, without opening the patient. */
	details?: PatientCardTagDetails;
};

type PatientCensusCardProps = Omit<
	React.ComponentProps<"article">,
	"children" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd"
> & {
	/**
	 * `compact` (default), for the Census: who the patient is, where, the top alert, acuity and tags, without vitals
	 * (live values belong on Monitoring). `expanded` adds the vitals as metrics in their own row (PRD §3.1). Both take
	 * the same data.
	 */
	variant?: "expanded" | "compact";
	/** `sm` is the small card, for denser grids (the Census's Compact): 12px padding, 16px name, 12px lines. */
	size?: "md" | "sm";
	lastName: string;
	firstName: string;
	mrn?: string;
	sex?: string;
	age?: number | string;
	hospital?: string;
	unit?: string;
	room?: string;
	bed?: string;
	/** The highest-priority unresolved alert, or unread messages. */
	alert?: {
		variant: PatientCardAlertVariant;
		count?: number;
		/** Replaces the severity's name; required for `message`. */
		label?: React.ReactNode;
		/**
		 * Where the alert is in its lifecycle (PRD PC-071). `active` (default) pulses the card's ring until the user clicks
		 * the card or the alert is addressed; `acknowledged` or `escalated` keep the ring steady. A resolved alert is the
		 * `resolved` variant.
		 */
		status?: PatientCardAlertStatus;
		/**
		 * When the alert started, ISO 8601; for `resolved`, when it resolved. PatientMonitoringCard's alert bar shows how
		 * long ago ("3:34 m ago"); PatientCensusCard doesn't show it.
		 */
		since?: string;
		/**
		 * How many alerts the patient had in the last 24 h, resolved ones included. PatientMonitoringCard's alert bar shows
		 * it ("Critical · 3 in the last 24 h") in place of `count`; PatientCensusCard doesn't show it.
		 */
		inLast24h?: number;
	};
	/** Acuity score with its level, e.g. NEWS2 10, High. `label` is the score's name ("NEWS2"), shown with it. Without a score the level is Unknown. */
	acuity?: {
		label: string;
		score?: React.ReactNode;
		level?: PatientCardAcuityLevel;
	};
	/** Change beside the acuity score, e.g. "Change in last 24 h", ▲ +1. */
	trajectory?: PatientCardVital;
	/** Shown on the `expanded` card only; `compact` doesn't show vitals. */
	vitals?: PatientCardVital[];
	/** Interventions and context, e.g. Ventilated, Contact isolation. */
	tags?: PatientCardTag[];
	/**
	 * The patient's photo URL. With it or `initials`, an avatar leads the name row (44px; 32px on the small card); without
	 * either, there's none.
	 */
	photo?: string;
	/** Shown in the avatar until the photo loads, or without one, e.g. "MS". */
	initials?: string;
	/** The initials' color (Avatar's tones, 1–10); neutral by default. */
	tone?: AvatarFallbackProps["tone"];
	/** Opens the patient. Makes the whole card one click target. */
	onOpen?: () => void;
	/** Opens the patient as a link. Use instead of `onOpen` when the app routes with URLs. */
	href?: string;
	/**
	 * Opens the alert (Intercept Live's alert modal). Makes the alert badge a button, raised above the card's open target,
	 * so a click on it opens the alert, not the patient. As on PatientMonitoringCard's alert bar.
	 */
	onOpenAlert?: () => void;
	/**
	 * Whether a severity alert rings the card in its color over a light tint, pulsing while it's active. `false` keeps the
	 * card's default border and fill, so the alert pill alone shows the alert: for pages where patients are managed rather
	 * than watched, e.g. the Census. Defaults to `true`.
	 */
	alertRing?: boolean;
	/**
	 * The "…" menu right of the name, shown on hover or keyboard focus in the card, as on PatientMonitoringCard (Nov 3,
	 * 2026). Without items there's no button.
	 */
	moreActions?: PatientCardAction[];
	/** @deprecated Ignored: use `moreActions`, the "…" menu's items (Nov 3, 2026). */
	onMoreActions?: React.MouseEventHandler<HTMLButtonElement>;
};

/**
 * The acuity score and its change, side by side between two rules: "NEWS2 7 High" and "Change in last 24 h ▲ +1".
 * Shared by PatientCensusCard and PatientMonitoringCard. 6px above and below on both variants.
 */
function PatientCardScore({
	acuity,
	trajectory,
	size = "md",
}: Pick<PatientCensusCardProps, "acuity" | "trajectory"> & { size?: "md" | "sm" }) {
	const small = size === "sm";
	const acuityLevel = acuity?.level ?? (acuity && acuity.score === undefined ? "unknown" : undefined);

	return (
		// 16px between the score and its change, so a long level ("Moderate") never runs into the change column.
		<div
			className={cn(
				"flex border-b border-border-muted px-2 py-1.5 first:border-t",
				small ? "gap-3" : "gap-4",
			)}
		>
			{acuity ? (
				<div className='flex min-w-0 flex-1 flex-col whitespace-nowrap'>
					<span className='text-xs font-medium text-muted-foreground'>{acuity.label}</span>
					<span className='flex items-center gap-2'>
						<span className={cn("font-semibold text-foreground", small ? "text-base" : "text-xl")}>
							{acuity.score ?? "--"}
						</span>
						{acuityLevel ? (
							<span className={cn("font-normal", small ? "text-base" : "text-xl", acuityLevels[acuityLevel].className)}>
								{acuityLevels[acuityLevel].label}
							</span>
						) : null}
					</span>
				</div>
			) : null}
			{trajectory ? (
				<PatientCardMetric
					{...toMetric(trajectory)}
					trendVariant={scoreTrendVariant(trajectory)}
					size={size}
					className='flex-1'
				/>
			) : null}
		</div>
	);
}

/**
 * A tag with details: a button that opens them in a popover above the card, and a mouse leaving the tag closes it, so
 * it's there only while the clinician points at it. Touch and keyboard close it with Escape or a click outside (a tap
 * also sends a leave). Its clicks, and the popover's, stop at the tag, so they never reach the card's open target
 * through the row.
 */
function PatientCardTagPopover({
	tag,
	details,
	size = "sm",
}: {
	tag: PatientCardTag;
	details: PatientCardTagDetails;
	/** The Badge's size. */
	size?: BadgeProps["size"];
}) {
	const [open, setOpen] = React.useState(false);
	const stop = (event: React.SyntheticEvent) => event.stopPropagation();

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				asChild
				onClick={stop}
				onPointerLeave={(event) => {
					if (event.pointerType === "mouse") setOpen(false);
				}}
			>
				{/* On hover, and while its popover is open: the hover fill and a `foreground` border. */}
				<Badge
					asChild
					variant={tag.variant ?? "outline"}
					size={size}
					className='shrink-0 transition-[color,background-color,border-color,box-shadow] hover:border-foreground hover:bg-accent data-[state=open]:border-foreground data-[state=open]:bg-accent'
				>
					<button type='button'>{tag.label}</button>
				</Badge>
			</PopoverTrigger>
			{/* React sends a portal's events up its component tree, so the popover's clicks stop here too. */}
			<PopoverContent align='start' aria-label={tag.label} onClick={stop}>
				{/* The meaning in `foreground`, set apart by a rule from what's behind it now. */}
				<PopoverHeader className={cn((details.items?.length || details.source) && "border-b border-border pb-3")}>
					<PopoverTitle>{tag.label}</PopoverTitle>
					{details.description ? (
						<PopoverDescription className='text-foreground'>{details.description}</PopoverDescription>
					) : null}
				</PopoverHeader>
				{details.items?.length ? (
					<dl className='flex flex-col gap-1.5'>
						{details.items.map((item) => (
							<div key={item.label} className='flex items-baseline justify-between gap-3'>
								<dt className='font-medium text-foreground'>{item.label}</dt>
								{item.value ? <dd className='text-right tabular-nums text-foreground'>{item.value}</dd> : null}
							</div>
						))}
					</dl>
				) : null}
				{details.source ? (
					<p className='text-xs text-muted-foreground'>
						{details.source}
						{details.updatedAt ? ` · ${formatRelativeDate(details.updatedAt).label}` : null}
					</p>
				) : null}
			</PopoverContent>
		</Popover>
	);
}

/**
 * The tags on one line. When they're wider than the card, the row scrolls sideways (wheel, trackpad, touch, or the
 * arrow keys once focused) and its thin scrollbar shows there's more. It sits above the card's open target so it can
 * scroll; `onClick` passes a click through to that target, so the row still opens the patient.
 */
function PatientCardTags({
	tags,
	name,
	size = "md",
	openRef,
}: {
	tags: PatientCardTag[];
	name: string;
	/** The card's size: `sm` (32px) tags on the card, `xs` (24px) on the small card. */
	size?: "md" | "sm";
	/** The card's open target. A click on the row is re-sent to it with its modifier keys, so ⌘/Ctrl-click still opens
	 * a link in a new tab. */
	openRef?: React.RefObject<HTMLElement | null>;
}) {
	const small = size === "sm";
	const rowRef = React.useRef<HTMLDivElement>(null);
	const [overflowing, setOverflowing] = React.useState(false);

	// A row that scrolls must be reachable by keyboard (a tab stop); one that fits stays out of the tab order.
	React.useLayoutEffect(() => {
		const row = rowRef.current;
		if (!row) return;
		const measure = () => setOverflowing(row.scrollWidth > row.clientWidth);
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(row);
		for (const child of row.children) observer.observe(child);
		return () => observer.disconnect();
	}, [tags]);

	if (!tags.length) {
		// No tags: a line of text the height of a tag, so cards with and without tags line up.
		return <p className={cn("flex items-center text-muted-foreground", small ? "h-6 text-xs" : "h-8 text-sm")}>No tags</p>;
	}

	return (
		<div
			ref={rowRef}
			role={overflowing ? "group" : undefined}
			aria-label={overflowing ? `Tags for ${name}` : undefined}
			tabIndex={overflowing ? 0 : undefined}
			onClick={
				openRef
					? (event) =>
							openRef.current?.dispatchEvent(
								new MouseEvent("click", {
									bubbles: true,
									cancelable: true,
									ctrlKey: event.ctrlKey,
									metaKey: event.metaKey,
									shiftKey: event.shiftKey,
									altKey: event.altKey,
								}),
							)
					: undefined
			}
			className={cn(
				"relative z-10 flex gap-1.5 overflow-x-auto rounded-md scrollbar-soft outline-none focus-visible:ring-2 focus-visible:ring-ring",
				openRef && "cursor-pointer",
			)}
		>
			{tags.map((tag) =>
				tag.details ? (
					<PatientCardTagPopover key={tag.label} tag={tag} details={tag.details} size={small ? "xs" : "sm"} />
				) : (
					<Badge key={tag.label} variant={tag.variant ?? "outline"} size={small ? "xs" : "sm"} className='shrink-0'>
						{tag.label}
					</Badge>
				),
			)}
		</div>
	);
}

/**
 * A patient's identity, location, top alert, acuity and vitals in a census or monitoring grid. With `onOpen` or
 * `href` the whole card opens the patient and lifts on hover.
 *
 * Figma: [intercept.ds › patient-card](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1058-2360)
 */
function PatientCensusCard({
	variant = "compact",
	size = "md",
	lastName,
	firstName,
	mrn,
	sex,
	age,
	hospital,
	unit,
	room,
	bed,
	alert,
	acuity,
	trajectory,
	vitals = [],
	tags = [],
	photo,
	initials,
	tone,
	onOpen,
	href,
	onOpenAlert,
	alertRing: showAlertRing = true,
	moreActions = [],
	onMoreActions: _onMoreActions,
	className,
	onClickCapture,
	onPointerEnter,
	onPointerLeave,
	onFocus,
	onBlur,
	...props
}: PatientCensusCardProps) {
	const { prefersReducedMotion, resolve } = useMotionPreference();
	const interactive = Boolean(onOpen || href);
	const small = size === "sm";
	const alertRing = usePatientCardAlertRing({ alert, interactive, show: showAlertRing });
	const compact = variant === "compact";
	const name = `${lastName}, ${firstName}`;
	const demographics = [sex, age].filter((part) => part !== undefined && part !== "").join(", ");
	const identity = [mrn, demographics].filter(Boolean).join(" - ");
	const roomAndBed = room && bed ? `${room} - ${bed}` : (room ?? bed);
	const placeInHospital = [unit, roomAndBed].filter(Boolean).join(" · ");
	// The "…" menu shows while the pointer is on the card, keyboard focus is in it or its menu is open.
	const actionsReveal = usePatientCardActionsReveal({ onPointerEnter, onPointerLeave, onFocus, onBlur });

	// The name is the card's one open control. Its ::after covers the card, so a click anywhere opens the patient.
	const openTargetClassName = patientCardOpenTargetClassName;
	const openRef = React.useRef<HTMLAnchorElement & HTMLButtonElement>(null);
	const nameContent = href ? (
		<a ref={openRef} href={href} className={openTargetClassName}>
			{name}
		</a>
	) : onOpen ? (
		<button ref={openRef} type='button' onClick={onOpen} className={cn("text-left", openTargetClassName)}>
			{name}
		</button>
	) : (
		name
	);

	return (
		<motion.article
			data-slot='patient-census-card'
			data-variant={variant}
			data-size={size}
			whileHover={interactive && !prefersReducedMotion ? liftPattern.whileHover : undefined}
			transition={liftPattern.transition}
			className={cn(
				// 15px padding + the 1px border: content sits 16px in, as in Figma, where the stroke is drawn inside. Sections
				// are 16px apart on the compact card, 12px on the expanded one; the name and the location are a section of their
				// own, 8px apart. `min-w-0`, so in a flex or grid cell the card can be narrower than its one-line location, and
				// the hospital truncates instead.
				"group/card relative isolate flex min-w-0 flex-col rounded-card border border-border-defined bg-card p-[15px] text-card-foreground shadow-sm transition-[border-color,box-shadow] duration-160 ease-in-out",
				compact ? "gap-4" : "gap-3",
				// The small card: 12px in (11px + the border) and 8px between sections, as PatientMonitoringCard `sm`.
				small && "gap-2 p-[11px]",
				// Hover (interactive cards only): a 2px `foreground` border (the alert ring hides meanwhile) and `shadow-lg`.
				// The padding drops by 1px so content stays put.
				interactive && patientCardInteractiveClassName,
				interactive && small && "hover:p-[10px]",
				className,
			)}
			// Capture, so any click on the card counts: the open target, the "…" button or the card itself.
			onClickCapture={(event) => {
				alertRing.markSeen();
				onClickCapture?.(event);
			}}
			{...actionsReveal.handlers}
			{...props}
		>
			{alertRing.ring}
			{/* Name and location, 8px apart: one section of the card. */}
			<div className='flex flex-col gap-2'>
				{/* 8px between its parts, as margins, not the row's gap, so the hidden "…" slot adds no space. */}
				<div className='flex items-start'>
					{/* Centered on the name and identity. Decorative: the name beside it says who it is. Above Avatar's sizes at
					    44px, so its size is set here; the initials keep Avatar's proportion (11px at 32px). Avatar is positioned,
					    so it would paint over the card's open target; clicks pass through it instead. */}
					{photo || initials ? (
						<Avatar aria-hidden='true' className={cn("pointer-events-none mr-2 self-center", small ? "size-8" : "size-11")}>
							{photo ? <AvatarImage src={photo} alt='' /> : null}
							<AvatarFallback tone={tone} className={small ? "text-[11px]" : "text-[15px]"}>
								{initials}
							</AvatarFallback>
						</Avatar>
					) : null}
					<div className='flex min-w-0 flex-1 flex-col'>
						{/* The name stays on one line and truncates, full name in `title` (screen readers get it whole); the identity
						    line wraps. The open target is a block, so it truncates too (`max-w-full`: a button shrinks to fit). */}
						<h3
							title={name}
							className={cn(
								"-mb-0.5 truncate font-bold text-foreground [&>*]:max-w-full [&>*]:truncate",
								small ? "text-base" : "text-xl",
							)}
						>
							{nameContent}
						</h3>
						{identity ? (
							<p className={cn("break-words text-muted-foreground", small ? "text-xs" : "text-sm")}>{identity}</p>
						) : null}
					</div>
					{/* The alert badge: the bell in the severity's color, with the count from 2 alerts. It fades in when an alert
					    appears and out when it's removed (Dismiss); a "Resolved" badge fades slowly (`resolvedFadeTransition`), so
					    it's seen leaving after its card has moved. A severity change recolors it in place. */}
					<AnimatePresence initial={false}>
						{alert ? (
							<motion.div
								key='alert'
								variants={{
									initial: { opacity: 0 },
									animate: { opacity: 1, transition: resolve(standardTransition) },
									exit:
										alert.variant === "resolved"
											? { opacity: 0, transition: resolve(resolvedFadeTransition) }
											: prefersReducedMotion
												? { opacity: 0 }
												: dismissVariants.exit,
								}}
								initial='initial'
								animate='animate'
								exit='exit'
								className='ml-2 flex'
							>
								{onOpenAlert ? (
									// Raised above the open target. On hover a 32% gray-700 layer darkens the fill under the icon and count
									// (the badge is isolated, so the layer's negative z-index stays inside it), as on the monitoring card's
									// alert bar.
									<motion.button
										type='button'
										onClick={onOpenAlert}
										className='group/alert relative z-10 flex cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
										{...(prefersReducedMotion ? {} : pressPattern)}
									>
										<span className='sr-only'>Open alert: </span>
										<PatientCardAlert
											variant={alert.variant}
											count={alert.count}
											iconOnly
											className='relative isolate before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-(--gray-700)/32 before:opacity-0 before:transition-opacity group-hover/alert:before:opacity-100'
										>
											{alert.label}
										</PatientCardAlert>
									</motion.button>
								) : (
									<PatientCardAlert variant={alert.variant} count={alert.count} iconOnly>
										{alert.label}
									</PatientCardAlert>
								)}
							</motion.div>
						) : null}
					</AnimatePresence>
					{moreActions.length ? (
						<PatientCardMoreActions
							actions={moreActions}
							name={name}
							shown={actionsReveal.shown}
							onMenuOpenChange={actionsReveal.onMenuOpenChange}
						/>
					) : null}
				</div>

				{hospital || placeInHospital ? (
					<p className={cn("flex items-center gap-1 font-medium text-foreground", small ? "text-xs" : "text-sm")}>
						<MapPinIcon aria-hidden='true' className='size-4 shrink-0 text-icon-muted' />
						{/* Only the hospital truncates; unit, room and bed always stay visible. The full name is in `title`. */}
						<span className='flex min-w-0 flex-1'>
							{hospital ? (
								<span title={hospital} className='min-w-0 truncate'>
									{hospital}
								</span>
							) : null}
							{placeInHospital ? (
								<span className='shrink-0 whitespace-pre'>{hospital ? ` · ${placeInHospital}` : placeInHospital}</span>
							) : null}
						</span>
					</p>
				) : null}
			</div>

			{acuity || trajectory || (!compact && vitals.length > 0) ? (
				<div className='flex flex-col'>
					{acuity || trajectory ? (
						<PatientCardScore acuity={acuity} trajectory={trajectory} size={size} />
					) : null}
					{!compact && vitals.length > 0 ? (
						<div className='flex gap-2 border-b border-border-muted px-2 py-1.5 first:border-t'>
							{vitals.map((vital) => (
								<PatientCardMetric key={vital.label} {...toMetric(vital)} size={size} className='flex-1' />
							))}
						</div>
					) : null}
				</div>
			) : null}

			{/* With no tags the row stays, so every card in a row or column is the same height (Oct 30, 2026, user's call). */}
			<PatientCardTags tags={tags} name={name} size={size} openRef={interactive ? openRef : undefined} />
		</motion.article>
	);
}

/** @deprecated Renamed to `PatientCensusCard` (Nov 2, 2026). */
const PatientCard = PatientCensusCard;
/** @deprecated Renamed to `PatientCensusCardProps` (Nov 2, 2026). */
type PatientCardProps = PatientCensusCardProps;

export {
	PatientCard,
	PatientCensusCard,
	PatientCardAlert,
	PatientCardMetric,
	PatientCardScore,
	PatientCardTagPopover,
	PatientCardTags,
	acuityLevels as patientCardAcuityLevels,
	patientCardAlertVariants,
	patientCardMetricVariants,
	scoreTrendClassName,
	scoreTrendVariant,
	type PatientCardAlertProps,
	type PatientCardAcuityLevel,
	type PatientCardAlertStatus,
	type PatientCardAlertVariant,
	type PatientCardMetricProps,
	type PatientCardProps,
	type PatientCensusCardProps,
	type PatientCardTag,
	type PatientCardTagDetails,
	type PatientCardVital,
};
