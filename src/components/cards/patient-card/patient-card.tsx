"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";
import { BellRingIcon, EllipsisIcon, MapPinIcon, SquareActivityIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import { Badge, type BadgeProps } from "@/components/data-display/badge";
import { MessageCircleSolidIcon } from "@/components/icons/message-circle-solid-icon";
import { liftPattern, useMotionPreference } from "@/lib/motion";
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
	/** Abbreviation for the compact card's inline line, e.g. "HR" for Heart Rate. Defaults to `label`. */
	shortLabel?: string;
};

/** A vital's metric props, without the compact-only `shortLabel`, which isn't a DOM attribute. */
const toMetric = ({ shortLabel: _shortLabel, ...metric }: PatientCardVital) => metric;

const inlineValueClassNames: Record<NonNullable<PatientCardMetricProps["variant"]>, string> = {
	default: "text-foreground",
	destructive: "text-destructive",
	success: "text-success",
	missing: "text-muted-foreground",
};

/**
 * The compact card's vitals: "HR **77**  ·  MAP **83**  ·  …", labels and separators in `foreground`, values bold, with
 * the expanded card's colors and arrows. A label stays with its value (a non-breaking space); the line breaks between
 * readings.
 */
function InlineVitals({ vitals }: { vitals: PatientCardVital[] }) {
	return (
		<p data-slot='patient-card-vitals' className='flex items-start gap-1 text-sm font-medium text-foreground'>
			<SquareActivityIcon aria-hidden='true' className='mt-0.5 size-4 shrink-0 text-icon-muted' />
			{/* Wraps rather than truncates, like everything on the card but the hospital name. */}
			<span className='min-w-0'>
				{vitals.map(({ label, shortLabel, value, variant = "default", trend, range, trendVariant }, index) => (
					<React.Fragment key={label}>
						{/* Two spaces each side of the dot; the outer ones let the line break between readings. */}
						{index > 0 ? " \u00a0·\u00a0 " : null}
						<span title={shortLabel ? label : undefined}>{shortLabel ?? label}</span>
						{"\u00a0"}
						<span className={cn("whitespace-nowrap font-bold", inlineValueClassNames[variant ?? "default"])}>
							{variant === "missing" ? (
								<>
									<span aria-hidden='true'>--</span>
									<span className='sr-only'>Not monitored</span>
								</>
							) : (
								<>
									{trend ? (
										<MetricGlyph
											glyph={trendGlyphs[trend][0]}
											text={trendGlyphs[trend][1]}
											className={cn("text-sm", trendVariant ? trendVariantClassNames[trendVariant] : undefined)}
										/>
									) : null}
									{value}
									{range ? <MetricGlyph glyph={rangeGlyphs[range][0]} text={rangeGlyphs[range][1]} className='text-sm' /> : null}
								</>
							)}
						</span>
					</React.Fragment>
				))}
			</span>
		</p>
	);
}

// A card with an active alert takes a 2px border in the alert's severity color. The padding drops to 14px so the
// content stays 16px in, as with the 1px border.
type PatientCardAcuityLevel = "low" | "moderate" | "high" | "critical" | "unknown";

// Acuity always says "risk", so its labels never match an alert severity's (Critical / High / Medium / Low). Pale
// badge tones, unlike the alerts' solid pills. Low and Unknown share the grey and differ by their words.
const acuityLevels: Record<PatientCardAcuityLevel, { label: string; variant: BadgeProps["variant"]; className?: string }> =
	{
		unknown: { label: "Unknown", variant: "secondary", className: "text-muted-foreground" },
		low: { label: "Low risk", variant: "secondary" },
		moderate: { label: "Moderate risk", variant: "yellow" },
		high: { label: "High risk", variant: "amber" },
		critical: { label: "Critical risk", variant: "red" },
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
	 * `compact` (default) shows the vitals as one line under the location, for dense census views; `expanded` shows
	 * them as metrics in their own row (PRD §3.1). Both take the same data.
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
	/** Acuity score with its risk level, e.g. SOFA 7, Moderate risk. Without a score the level is Unknown. */
	acuity?: {
		label: string;
		score?: React.ReactNode;
		level?: PatientCardAcuityLevel;
	};
	/** Change beside the acuity score, e.g. "Change in last 24 h", ▲ +1. */
	trajectory?: PatientCardVital;
	vitals?: PatientCardVital[];
	/** Interventions and context, e.g. Ventilated, Contact isolation. */
	tags?: PatientCardTag[];
	/** Opens the patient. Makes the whole card one click target. */
	onOpen?: () => void;
	/** Opens the patient as a link. Use instead of `onOpen` when the app routes with URLs. */
	href?: string;
	/** Shows the "…" button, which opens the card's actions. */
	onMoreActions?: React.MouseEventHandler<HTMLButtonElement>;
};

/**
 * A patient's identity, location, top alert, acuity and vitals in a census or monitoring grid. With `onOpen` or
 * `href` the whole card opens the patient and lifts on hover; the "…" button stays a separate target.
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
	onMoreActions,
	className,
	onClickCapture,
	...props
}: PatientCardProps) {
	const { prefersReducedMotion } = useMotionPreference();
	const interactive = Boolean(onOpen || href);
	const alertRing = usePatientCardAlertRing({ alert, interactive });
	const compact = variant === "compact";
	const acuityLevel = acuity?.level ?? (acuity && acuity.score === undefined ? "unknown" : undefined);
	const name = `${lastName}, ${firstName}`;
	const demographics = [sex, age].filter((part) => part !== undefined && part !== "").join(", ");
	const identity = [mrn, demographics].filter(Boolean).join(" - ");
	const roomAndBed = room && bed ? `${room} - ${bed}` : (room ?? bed);
	const placeInHospital = [unit, roomAndBed].filter(Boolean).join(" · ");

	// The name is the card's one open control. Its ::after covers the card, so a click anywhere opens the patient
	// while the "…" button (raised above it) keeps its own target.
	const openTargetClassName = patientCardOpenTargetClassName;
	const nameContent = href ? (
		<a href={href} className={openTargetClassName}>
			{name}
		</a>
	) : onOpen ? (
		<button type='button' onClick={onOpen} className={cn("text-left", openTargetClassName)}>
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
				// compact card's sections sit closer (10px; 12px on the expanded card).
				"group/card relative isolate flex flex-col rounded-card border border-border bg-card p-[15px] text-card-foreground shadow-sm transition-[border-color,box-shadow] duration-160 ease-in-out",
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
					{/* Name and identity wrap rather than truncate: a clinician must always see who the patient is. */}
					<h3 className='-mb-0.5 text-xl font-bold break-words text-foreground'>{nameContent}</h3>
					{identity ? <p className='text-sm break-words text-muted-foreground'>{identity}</p> : null}
				</div>
				{alert ? <PatientCardAlert variant={alert.variant} count={alert.count}>{alert.label}</PatientCardAlert> : null}
			</div>

			{hospital || placeInHospital || (compact && vitals.length > 0) ? (
				<div className='flex flex-col gap-1.5'>
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
					{compact && vitals.length > 0 ? <InlineVitals vitals={vitals} /> : null}
				</div>
			) : null}

			{acuity || trajectory || (!compact && vitals.length > 0) ? (
				<div className='flex flex-col'>
					{acuity || trajectory ? (
						<div className={cn("flex border-b border-border-muted px-2 first:border-t", compact ? "py-1.5" : "py-3")}>
							{acuity ? (
								<div className='flex min-w-0 flex-1 flex-col whitespace-nowrap'>
									<span className='text-xs font-medium text-muted-foreground'>{acuity.label}</span>
									<span className='flex items-center gap-1.5'>
										<span className='text-xl font-semibold text-foreground'>{acuity.score ?? "--"}</span>
										{acuityLevel ? (
											<Badge
												variant={acuityLevels[acuityLevel].variant}
												size='xs-alt'
												className={acuityLevels[acuityLevel].className}
											>
												{acuityLevels[acuityLevel].label}
											</Badge>
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

			{tags.length > 0 || onMoreActions ? (
				<div className='flex items-center justify-between gap-2'>
					<div className='flex min-w-0 flex-wrap items-center gap-1.5'>
						{tags.map((tag) => (
							<Badge key={tag.label} variant={tag.variant ?? "outline"} size='sm'>
								{tag.label}
							</Badge>
						))}
					</div>
					{onMoreActions ? (
						<Button
							variant='ghost'
							size='icon-sm'
							aria-label={`More actions for ${name}`}
							onClick={onMoreActions}
							className='relative z-10 shrink-0'
						>
							<EllipsisIcon />
						</Button>
					) : null}
				</div>
			) : null}
		</motion.article>
	);
}

export {
	PatientCard,
	PatientCardAlert,
	PatientCardMetric,
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
