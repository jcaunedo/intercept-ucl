"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";
import { BellRingIcon, MapPinIcon } from "lucide-react";

import { Badge, type BadgeProps } from "@/components/data-display/badge";
import { MessageCircleSolidIcon } from "@/components/icons/message-circle-solid-icon";
import {
	dismissVariants,
	liftPattern,
	resolvedFadeTransition,
	standardTransition,
	useMotionPreference,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

import {
	patientCardInteractiveClassName,
	patientCardOpenTargetClassName,
	usePatientCardAlertRing,
} from "./patient-card-parts";

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
	};

/**
 * The patient's highest-priority alert, or their unread messages. Severities show their name unless `children`
 * replaces it; `message` needs `children` (e.g. "1 message").
 *
 * Figma: [intercept.ds › patient-card-alerts-badge](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1060-3605)
 */
function PatientCardAlert({ className, variant = "critical", count, children, ...props }: PatientCardAlertProps) {
	const resolvedVariant = variant ?? "critical";
	const label = children ?? (resolvedVariant === "message" ? null : alertLabels[resolvedVariant]);

	return (
		<span
			data-slot='patient-card-alert'
			data-variant={resolvedVariant}
			className={cn(patientCardAlertVariants({ variant: resolvedVariant, className }))}
			{...props}
		>
			{resolvedVariant === "message" ? <MessageCircleSolidIcon /> : <BellRingIcon aria-hidden='true' />}
			<span className='flex items-center gap-1'>
				<span>{label}</span>
				{count !== undefined && count > 1 ? (
					<span>
						<span aria-hidden='true'>· </span>
						{count}
						<span className='sr-only'> alerts</span>
					</span>
				) : null}
			</span>
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
		/** Colors the trend arrow only, e.g. a rising acuity in `critical`, a falling one in `success`. */
		trendVariant?: "critical" | "success";
	};

const trendVariantClassNames = { critical: "text-severity-critical", success: "text-success" } as const;

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
	...props
}: PatientCardMetricProps) {
	const missing = variant === "missing";

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
						<span aria-hidden='true' className='text-xl'>
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
						<span className='text-xl'>{value}</span>
						{range ? <MetricGlyph glyph={rangeGlyphs[range][0]} text={rangeGlyphs[range][1]} /> : null}
					</>
				)}
			</span>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/* PatientCard                                                                */
/* -------------------------------------------------------------------------- */

/** A reading in the card's trajectory or vitals rows. */
type PatientCardVital = Pick<PatientCardMetricProps, "label" | "value" | "variant" | "trend" | "range" | "trendVariant"> & {
	/**
	 * Abbreviation, e.g. "HR" for Heart Rate. It was for the compact card's vitals line, which the compact card no longer
	 * has (Oct 27, 2026), so it has no effect on PatientCard now. Kept so apps that pass it still compile.
	 */
	shortLabel?: string;
};

/** A vital's metric props, without `shortLabel`, which isn't a DOM attribute. */
const toMetric = ({ shortLabel: _shortLabel, ...metric }: PatientCardVital) => metric;

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

type PatientCardTag = {
	label: string;
	/** Badge variant. Defaults to `outline`. */
	variant?: BadgeProps["variant"];
};

type PatientCardProps = Omit<
	React.ComponentProps<"article">,
	"children" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd"
> & {
	/**
	 * `compact` (default), for the Census: who the patient is, where, the top alert, acuity and tags, without vitals
	 * (live values belong on Monitoring). `expanded` adds the vitals as metrics in their own row (PRD §3.1). Both take
	 * the same data.
	 */
	variant?: "expanded" | "compact";
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
	/** Opens the patient. Makes the whole card one click target. */
	onOpen?: () => void;
	/** Opens the patient as a link. Use instead of `onOpen` when the app routes with URLs. */
	href?: string;
	/** @deprecated Ignored: the card has no "…" button since Oct 30, 2026 (intercept.ds `patient-card-compact`). */
	onMoreActions?: React.MouseEventHandler<HTMLButtonElement>;
};

/**
 * The tags on one line. When they're wider than the card, the row scrolls sideways (wheel, trackpad, touch, or the
 * arrow keys once focused) and its thin scrollbar shows there's more. It sits above the card's open target so it can
 * scroll; `onClick` passes a click through to that target, so the row still opens the patient.
 */
function PatientCardTags({
	tags,
	name,
	onClick,
}: {
	tags: PatientCardTag[];
	name: string;
	onClick?: React.MouseEventHandler<HTMLDivElement>;
}) {
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

	return (
		<div
			ref={rowRef}
			role={overflowing ? "group" : undefined}
			aria-label={overflowing ? `Tags for ${name}` : undefined}
			tabIndex={overflowing ? 0 : undefined}
			onClick={onClick}
			className={cn(
				"relative z-10 flex gap-1.5 overflow-x-auto rounded-md scrollbar-soft outline-none focus-visible:ring-2 focus-visible:ring-ring",
				onClick && "cursor-pointer",
			)}
		>
			{tags.map((tag) => (
				<Badge key={tag.label} variant={tag.variant ?? "outline"} size='sm' className='shrink-0'>
					{tag.label}
				</Badge>
			))}
		</div>
	);
}

/**
 * A patient's identity, location, top alert, acuity and vitals in a census or monitoring grid. With `onOpen` or
 * `href` the whole card opens the patient and lifts on hover.
 *
 * Figma: [intercept.ds › patient-card](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1058-2360)
 */
function PatientCard({
	variant = "compact",
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
	onOpen,
	href,
	onMoreActions: _onMoreActions,
	className,
	onClickCapture,
	...props
}: PatientCardProps) {
	const { prefersReducedMotion, resolve } = useMotionPreference();
	const interactive = Boolean(onOpen || href);
	const alertRing = usePatientCardAlertRing({ alert, interactive });
	const compact = variant === "compact";
	const acuityLevel = acuity?.level ?? (acuity && acuity.score === undefined ? "unknown" : undefined);
	const name = `${lastName}, ${firstName}`;
	const demographics = [sex, age].filter((part) => part !== undefined && part !== "").join(", ");
	const identity = [mrn, demographics].filter(Boolean).join(" - ");
	const roomAndBed = room && bed ? `${room} - ${bed}` : (room ?? bed);
	const placeInHospital = [unit, roomAndBed].filter(Boolean).join(" · ");

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
			data-slot='patient-card'
			data-variant={variant}
			whileHover={interactive && !prefersReducedMotion ? liftPattern.whileHover : undefined}
			transition={liftPattern.transition}
			className={cn(
				// 15px padding + the 1px border: content sits 16px in, as in Figma, where the stroke is drawn inside. The
				// compact card's sections sit closer (10px; 12px on the expanded card). `min-w-0`, so in a flex or grid cell the
				// card can be narrower than its one-line location, and the hospital truncates instead.
				"group/card relative isolate flex min-w-0 flex-col rounded-card border border-border-defined bg-card p-[15px] text-card-foreground shadow-sm transition-[border-color,box-shadow] duration-160 ease-in-out",
				compact ? "gap-2.5" : "gap-3",
				// Hover (interactive cards only): a 2px `foreground` border (the alert ring hides meanwhile) and `shadow-lg`.
				// The padding drops to 14px so content stays put.
				interactive && patientCardInteractiveClassName,
				className,
			)}
			// Capture, so any click on the card counts: the open target, the "…" button or the card itself.
			onClickCapture={(event) => {
				alertRing.markSeen();
				onClickCapture?.(event);
			}}
			{...props}
		>
			{alertRing.ring}
			<div className='flex items-start gap-2'>
				<div className='flex min-w-0 flex-1 flex-col'>
					{/* The name stays on one line and truncates, full name in `title` (screen readers get it whole); the identity
					    line wraps. The open target is a block, so it truncates too (`max-w-full`: a button shrinks to fit). */}
					<h3 title={name} className='-mb-0.5 truncate text-xl font-bold text-foreground [&>*]:max-w-full [&>*]:truncate'>
						{nameContent}
					</h3>
					{identity ? <p className='text-sm break-words text-muted-foreground'>{identity}</p> : null}
				</div>
				{/* The pill fades in when an alert appears and out when it's removed (Dismiss); a "Resolved" pill fades slowly
				    (`resolvedFadeTransition`), so it's seen leaving after its card has moved. A severity change recolors it in
				    place. As on PatientMonitoringCard. */}
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
							className='flex'
						>
							<PatientCardAlert variant={alert.variant} count={alert.count}>
								{alert.label}
							</PatientCardAlert>
						</motion.div>
					) : null}
				</AnimatePresence>
			</div>

			{hospital || placeInHospital ? (
				<p className='flex items-center gap-1 text-sm font-medium text-foreground'>
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

			{acuity || trajectory || (!compact && vitals.length > 0) ? (
				<div className='flex flex-col'>
					{acuity || trajectory ? (
						// 16px between the score and its change, so a long level ("Moderate") never runs into the change column.
						<div className={cn("flex gap-4 border-b border-border-muted px-2 first:border-t", compact ? "py-1.5" : "py-3")}>
							{acuity ? (
								<div className='flex min-w-0 flex-1 flex-col whitespace-nowrap'>
									<span className='text-xs font-medium text-muted-foreground'>{acuity.label}</span>
									<span className='flex items-center gap-2'>
										<span className='text-xl font-semibold text-foreground'>{acuity.score ?? "--"}</span>
										{acuityLevel ? (
											<span className={cn("text-xl font-normal", acuityLevels[acuityLevel].className)}>
												{acuityLevels[acuityLevel].label}
											</span>
										) : null}
									</span>
								</div>
							) : null}
							{trajectory ? (
								<PatientCardMetric {...toMetric(trajectory)} className='flex-1' />
							) : null}
						</div>
					) : null}
					{!compact && vitals.length > 0 ? (
						<div className='flex gap-2 border-b border-border-muted px-2 py-3 first:border-t'>
							{vitals.map((vital) => (
								<PatientCardMetric key={vital.label} {...toMetric(vital)} className='flex-1' />
							))}
						</div>
					) : null}
				</div>
			) : null}

			{tags.length > 0 ? (
				<PatientCardTags
					tags={tags}
					name={name}
					// Re-sent to the open target with its modifier keys, so ⌘/Ctrl-click still opens a link in a new tab.
					onClick={
						interactive
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
				/>
			) : null}
		</motion.article>
	);
}

export {
	PatientCard,
	PatientCardAlert,
	PatientCardMetric,
	acuityLevels as patientCardAcuityLevels,
	patientCardAlertVariants,
	patientCardMetricVariants,
	type PatientCardAlertProps,
	type PatientCardAcuityLevel,
	type PatientCardAlertStatus,
	type PatientCardAlertVariant,
	type PatientCardMetricProps,
	type PatientCardProps,
	type PatientCardTag,
	type PatientCardVital,
};
