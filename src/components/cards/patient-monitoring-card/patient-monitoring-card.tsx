"use client";

import * as React from "react";
import { MapPinIcon, Maximize2Icon, Minimize2Icon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";

import { Button } from "@/components/buttons/button";
import {
	PatientCardAlert,
	patientCardInteractiveClassName,
	patientCardOpenTargetClassName,
	usePatientCardAlertRing,
	type PatientCardProps,
} from "@/components/cards/patient-card";
import {
	dismissVariants,
	fadeVariants,
	liftPattern,
	resolvedFadeTransition,
	standardTransition,
	useMotionPreference,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

import { MonitorWaveform, type WaveformKind } from "./monitor-waveform";

/** Live bedside values. A missing value shows "--", never zero (PRD PC-143). */
type MonitorVitals = {
	/** Heart rate, bpm. Also paces the ECG, pleth and arterial waveforms. */
	hr?: number;
	/** SpO₂, %. */
	spo2?: number;
	/** Arterial pressure, mmHg. */
	systolic?: number;
	diastolic?: number;
	/** Mean arterial pressure, mmHg. */
	map?: number;
	/** Respiratory rate, breaths/min. Also paces the respiration waveform. */
	rr?: number;
};

/**
 * The last hour of each primary numeric, oldest first, for the monitor's `trends` plot. Points are spread
 * evenly, so any interval works (one a minute is typical); a missing series shows no sparkline.
 */
type MonitorTrends = Partial<Record<"hr" | "spo2" | "systolic" | "rr", number[]>>;

/** Alarm limits as [low, high]. A value outside them is marked as an alarm. */
type MonitorLimits = {
	hr: [number, number];
	spo2: [number, number];
	systolic: [number, number];
	rr: [number, number];
};

// Common adult ICU defaults; an app passes the patient's own limits. Exported so a page can filter on the same limits.
const defaultMonitorLimits: MonitorLimits = { hr: [50, 120], spo2: [90, 100], systolic: [90, 160], rr: [8, 30] };

type ParameterKey = "hr" | "spo2" | "bp" | "rr";

// One color per parameter, everywhere (PRD Monitoring SV-072), with its waveform and its trend's lane label (ABP's
// trend is the systolic).
const parameters: Record<
	ParameterKey,
	{ label: string; wave: string; trend: string; unit: string; color: string; kind: WaveformKind }
> = {
	hr: { label: "HR", wave: "II", trend: "HR · 1 h", unit: "bpm", color: "text-monitor-ecg", kind: "ecg" },
	spo2: { label: "SpO₂", wave: "Pleth", trend: "SpO₂ · 1 h", unit: "%", color: "text-monitor-spo2", kind: "pleth" },
	bp: { label: "ABP", wave: "ABP", trend: "Sys · 1 h", unit: "mmHg", color: "text-monitor-abp", kind: "abp" },
	rr: { label: "RR", wave: "Resp", trend: "RR · 1 h", unit: "rpm", color: "text-monitor-resp", kind: "resp" },
};
const parameterOrder: ParameterKey[] = ["hr", "spo2", "bp", "rr"];

/** Which side of its alarm limits a value is on, if it's outside them. */
const alarmSide = (value: number | undefined, [low, high]: [number, number]) =>
	value === undefined ? undefined : value > high ? "above" : value < low ? "below" : undefined;

// `md` for the Comfortable panel; `sm` for Compact (PRD Monitoring SV-012): tighter padding, smaller type and a shorter
// condensed monitor, so four fit a row at 1728. Padding is 1px less than the step because the border adds it.
const patientMonitoringCardVariants = cva(
	"group/card relative isolate flex flex-col rounded-card border border-border bg-card text-card-foreground shadow-sm transition-[border-color,box-shadow] duration-160 ease-in-out",
	{
		variants: {
			size: {
				md: "gap-3 p-[15px]",
				sm: "gap-2 p-[11px]",
			},
		},
		defaultVariants: {
			size: "md",
		},
	},
);

type PatientMonitoringCardSize = NonNullable<VariantProps<typeof patientMonitoringCardVariants>["size"]>;

// The condensed monitor's height per size; the full monitor is 240px at both.
const condensedHeight: Record<PatientMonitoringCardSize, number> = { md: 120, sm: 104 };

// The condensed numerics' columns. The compact card gives ABP ("104/56") more room than the single numbers.
const condensedColumns: Record<PatientMonitoringCardSize, string> = {
	md: "grid-cols-4",
	sm: "grid-cols-[1fr_1fr_1.5fr_1fr]",
};

type PatientMonitoringCardProps = Omit<
	React.ComponentProps<"article">,
	"children" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd"
> &
	Pick<
		PatientCardProps,
		| "lastName"
		| "firstName"
		| "mrn"
		| "sex"
		| "age"
		| "hospital"
		| "unit"
		| "room"
		| "bed"
		| "alert"
		| "onOpen"
		| "href"
	> &
	VariantProps<typeof patientMonitoringCardVariants> & {
		vitals?: MonitorVitals;
		/** Alarm limits; defaults to common adult ICU limits. */
		limits?: Partial<MonitorLimits>;
		/**
		 * What the monitor plots, condensed or full: live waveforms (`waveform`, default) or each parameter's last hour
		 * (`trends`, from `trends`). Condensed, that's the ECG strip or a sparkline under each numeric; full, a waveform
		 * or a trend line in each lane.
		 */
		plot?: "waveform" | "trends";
		/** @deprecated Use `plot`, which now applies to the full monitor too. */
		condensedView?: "waveform" | "trends";
		/** The last hour of HR, SpO₂, systolic and RR, for the `trends` plot. */
		trends?: MonitorTrends;
		/** Controlled: the full monitor (all waveforms) instead of the condensed one. */
		expanded?: boolean;
		/** Uncontrolled starting state. Defaults to condensed. */
		defaultExpanded?: boolean;
		onExpandedChange?: (expanded: boolean) => void;
	};

/** One parameter's numbers: label, value, unit, and in the full monitor its alarm limits. */
function MonitorNumeric({
	parameter,
	vitals,
	limits,
	full,
	size,
}: {
	parameter: ParameterKey;
	vitals: MonitorVitals;
	limits: MonitorLimits;
	full: boolean;
	size: PatientMonitoringCardSize;
}) {
	const { label, unit, color } = parameters[parameter];
	const value =
		parameter === "bp"
			? vitals.systolic !== undefined && vitals.diastolic !== undefined
				? `${vitals.systolic}/${vitals.diastolic}`
				: "--"
			: (vitals[parameter] ?? "--");
	const limit = parameter === "bp" ? limits.systolic : limits[parameter];
	const alarm = alarmSide(parameter === "bp" ? vitals.systolic : vitals[parameter], limit);

	// A value outside its alarm limits gets a small ↑ / ↓ tag in the label row, in the monitor's neutral ink: drift shows
	// in place, before (or without) an alert, and the parameter keeps its color (PRD Monitoring SV-073). In the label row
	// rather than by the number, so the numerics keep their width.
	const alarmTag = alarm ? (
		<span
			aria-hidden='true'
			className='grid size-3.5 shrink-0 place-items-center rounded-sm bg-monitor-foreground text-[10px] leading-none font-bold text-monitor'
		>
			{alarm === "above" ? "↑" : "↓"}
		</span>
	) : null;

	return (
		<div
			data-alarm={alarm}
			className={cn(
				"flex min-w-0 flex-1 flex-col justify-center gap-0.5 rounded-sm py-0.5",
				size === "sm" ? "px-1.5" : "px-2",
			)}
		>
			<span className={cn("flex w-full items-center justify-between gap-1 text-xs/4 font-semibold", color)}>
				<span className='flex min-w-0 items-center gap-1'>
					{label}
					{/* The mean pressure sits by the label, as on a bedside monitor. */}
					{full && parameter === "bp" && vitals.map !== undefined ? (
						<span className='font-normal text-monitor-foreground tabular-nums'>({vitals.map})</span>
					) : null}
					{full ? alarmTag : null}
				</span>
				{/* Condensed cells are too narrow for both, so the tag takes the unit's place there; the compact card's are too
				    narrow for units at all (the full monitor shows them). */}
				{alarm && !full ? (
					alarmTag
				) : full || size === "md" ? (
					<span className='font-normal text-monitor-foreground'>{unit}</span>
				) : null}
			</span>
			<span className='flex w-full items-end justify-between gap-1'>
				{/* Alarm limits, high over low, small beside the value. */}
				{full ? (
					<span className='flex flex-col text-xs/3.5 text-monitor-foreground tabular-nums'>
						<span>{limit[1]}</span>
						<span>{limit[0]}</span>
					</span>
				) : null}
				<span
					className={cn(
						"font-semibold tabular-nums leading-none",
						full ? (size === "sm" ? "text-xl" : "text-2xl") : size === "sm" ? "text-lg" : "text-xl",
						color,
					)}
				>
					{value}
					{alarm ? <span className='sr-only'>, {alarm} alarm limits</span> : null}
				</span>
			</span>
		</div>
	);
}

/**
 * A waveform lane with its label in the parameter's color, top left. The trace fills the space below the label, sized
 * by the lane (a canvas's own 150px default height would otherwise push the lane open).
 */
function MonitorLane({ parameter, vitals, className }: { parameter: ParameterKey; vitals: MonitorVitals; className?: string }) {
	const { wave, color, kind } = parameters[parameter];
	const rate = kind === "resp" ? vitals.rr : vitals.hr;

	return (
		<div className={cn("relative min-h-0 min-w-0 flex-1", className)}>
			<span className={cn("absolute top-0.5 left-2 text-xs font-semibold", color)}>{wave}</span>
			<div className={cn("absolute inset-x-0 top-4 bottom-1", color)}>
				<MonitorWaveform kind={kind} rate={rate} />
			</div>
		</div>
	);
}

/**
 * A parameter's last hour as a line in its color, scaled to its own range (at least 4 units tall, so a steady value
 * stays flat instead of magnifying noise). Decorative: the number beside it carries the value.
 */
function MonitorSparkline({
	parameter,
	values,
	className,
}: {
	parameter: ParameterKey;
	values?: number[];
	className?: string;
}) {
	if (!values || values.length < 2) return <span className='h-6 shrink-0' />;
	const low = Math.min(...values);
	const high = Math.max(...values);
	const middle = (low + high) / 2;
	const [bottom, top] = high - low < 4 ? [middle - 2, middle + 2] : [low, high];
	const points = values
		.map((value, index) => {
			const x = (index / (values.length - 1)) * 100;
			const y = 22 - ((value - bottom) / (top - bottom)) * 20;
			return `${x.toFixed(1)},${y.toFixed(1)}`;
		})
		.join(" ");

	return (
		<svg
			aria-hidden='true'
			viewBox='0 0 100 24'
			preserveAspectRatio='none'
			className={cn("h-6 w-full shrink-0 px-2", parameters[parameter].color, className)}
		>
			<polyline
				points={points}
				fill='none'
				stroke='currentColor'
				strokeWidth={1.5}
				strokeLinejoin='round'
				vectorEffect='non-scaling-stroke'
			/>
		</svg>
	);
}

/** The full monitor's lane for the `trends` plot: the parameter's last hour across the lane, labeled like a waveform. */
function MonitorTrendLane({ parameter, values }: { parameter: ParameterKey; values?: number[] }) {
	const { trend, color } = parameters[parameter];

	return (
		<div className='relative min-h-0 min-w-0 flex-1'>
			<span className={cn("absolute top-0.5 left-2 text-xs font-semibold", color)}>{trend}</span>
			<div className='absolute inset-x-0 top-4 bottom-1'>
				<MonitorSparkline parameter={parameter} values={values} className='h-full' />
			</div>
		</div>
	);
}

type PatientMonitorProps = Omit<React.ComponentProps<"section">, "children"> &
	Pick<PatientMonitoringCardProps, "vitals" | "limits" | "plot" | "trends">;

/**
 * The full bedside monitor on its own, without the card: one lane per parameter (its waveform, or its last hour with
 * `plot="trends"`) beside its numbers and alarm limits, as in PatientMonitoringCard's full view. For a page that already
 * shows who the patient is, e.g. Patient details. 240px tall by default; a height in `className` stretches the lanes.
 * Pass an `aria-label` that names the patient.
 */
function PatientMonitor({ vitals = {}, limits: limitsProp, plot = "waveform", trends = {}, className, ...props }: PatientMonitorProps) {
	const limits = { ...defaultMonitorLimits, ...limitsProp };

	return (
		<section
			data-slot='patient-monitor'
			className={cn(
				"grid h-60 grid-rows-4 divide-y divide-monitor-grid overflow-hidden rounded-lg bg-monitor text-monitor-foreground",
				className,
			)}
			{...props}
		>
			{parameterOrder.map((parameter) => (
				<div key={parameter} className='flex min-h-0'>
					{plot === "trends" ? (
						<MonitorTrendLane parameter={parameter} values={trends[parameter === "bp" ? "systolic" : parameter]} />
					) : (
						<MonitorLane parameter={parameter} vitals={vitals} />
					)}
					<div className='flex w-32 shrink-0 border-l border-monitor-grid py-0.5'>
						<MonitorNumeric parameter={parameter} vitals={vitals} limits={limits} size='md' full />
					</div>
				</div>
			))}
		</section>
	);
}

/**
 * A patient's identity and location over a live bedside monitor. Condensed by default (an ECG strip and HR, SpO₂, BP and
 * RR, or 1-hour sparklines with `plot="trends"`); expands to the full monitor, one lane per parameter (its waveform, or
 * its last hour with `plot="trends"`) with its numbers and alarm limits. `size="sm"` is the compact card. An alert behaves
 * as on PatientCard (a ring that pulses until the card is clicked or the alert is addressed), and with `onOpen` or
 * `href` the whole card opens the patient. Draft: the monitor follows PRD Monitoring §3.3, not a Figma design yet.
 *
 * Figma: [intercept.ds › patient-monitoring-card](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1125-4328)
 */
function PatientMonitoringCard({
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
	size = "md",
	vitals = {},
	limits: limitsProp,
	plot: plotProp,
	condensedView,
	trends = {},
	expanded: expandedProp,
	defaultExpanded = false,
	onExpandedChange,
	onOpen,
	href,
	className,
	onClickCapture,
	...props
}: PatientMonitoringCardProps) {
	const { resolve, prefersReducedMotion } = useMotionPreference();
	const interactive = Boolean(onOpen || href);
	const alertRing = usePatientCardAlertRing({ alert, interactive });
	const [uncontrolledExpanded, setUncontrolledExpanded] = React.useState(defaultExpanded);
	const expanded = expandedProp ?? uncontrolledExpanded;
	const monitorId = React.useId();
	const limits = { ...defaultMonitorLimits, ...limitsProp };
	const cardSize = size ?? "md";
	const plot = plotProp ?? condensedView ?? "waveform";

	const name = `${lastName}, ${firstName}`;
	const demographics = [sex, age].filter((part) => part !== undefined && part !== "").join(", ");
	const identity = [mrn, demographics].filter(Boolean).join(" - ");
	const roomAndBed = room && bed ? `${room} - ${bed}` : (room ?? bed);
	const placeInHospital = [unit, roomAndBed].filter(Boolean).join(" · ");

	const nameContent = href ? (
		<a href={href} className={patientCardOpenTargetClassName}>
			{name}
		</a>
	) : onOpen ? (
		<button type='button' onClick={onOpen} className={cn("text-left", patientCardOpenTargetClassName)}>
			{name}
		</button>
	) : (
		name
	);

	const toggleExpanded = () => {
		setUncontrolledExpanded(!expanded);
		onExpandedChange?.(!expanded);
	};

	return (
		// Same card behavior as PatientCard: lift and hover border when it opens the patient, and the alert ring.
		<motion.article
			data-slot='patient-monitoring-card'
			data-size={cardSize}
			data-expanded={expanded ? "" : undefined}
			whileHover={interactive && !prefersReducedMotion ? liftPattern.whileHover : undefined}
			transition={liftPattern.transition}
			className={cn(
				patientMonitoringCardVariants({ size: cardSize }),
				interactive && patientCardInteractiveClassName,
				// The hover border is 2px, so the compact card's padding drops by 1px too.
				interactive && cardSize === "sm" && "hover:p-[10px]",
				className,
			)}
			// Capture, so any click on the card counts (the open target, the expand button, the monitor).
			onClickCapture={(event) => {
				alertRing.markSeen();
				onClickCapture?.(event);
			}}
			{...props}
		>
			{alertRing.ring}
			<div className='flex items-start gap-2'>
				<div className='flex min-w-0 flex-1 flex-col'>
					<h3
						className={cn(
							"-mb-0.5 font-bold break-words text-foreground",
							cardSize === "sm" ? "text-base" : "text-xl",
						)}
					>
						{nameContent}
					</h3>
					{identity ? (
						<p className={cn("break-words text-muted-foreground", cardSize === "sm" ? "text-xs" : "text-sm")}>
							{identity}
						</p>
					) : null}
				</div>
				{/* The pill fades in when an alert appears and out when it's removed, with the Dismiss pattern's exit; a
				    "Resolved" pill fades slowly (`resolvedFadeTransition`), so it's seen leaving. A
				    severity change recolors it in place. */}
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

			<div className='flex items-center gap-1'>
				<p
					className={cn(
						"flex min-w-0 flex-1 items-center gap-1 font-medium text-foreground",
						cardSize === "sm" ? "text-xs" : "text-sm",
					)}
				>
					<MapPinIcon aria-hidden='true' className='size-4 shrink-0 text-icon-muted' />
					{/* Only the hospital truncates; unit, room and bed always stay visible. */}
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
			</div>

			{/* Light in light mode, a dark screen in dark mode. The height animates between the two views (Expand pattern). */}
			<motion.section
				id={monitorId}
				aria-label={`Bedside monitor, ${name}`}
				initial={false}
				animate={{ height: expanded ? 240 : condensedHeight[cardSize] }}
				transition={resolve(standardTransition)}
				className='relative overflow-hidden rounded-lg bg-monitor text-monitor-foreground'
			>
				{/* Full / condensed monitor, top-right over the monitor (intercept.ds Hover variant): Button's `circle`
				    variant at 32px. It shows while the card is hovered or a keyboard user is inside it, and always on touch
				    screens, which can't hover. Raised above the card's open target, so it keeps its own click. */}
				<Button
					variant='circle'
					size='icon-sm'
					aria-expanded={expanded}
					aria-controls={monitorId}
					aria-label={expanded ? "Show condensed monitor" : "Show full monitor"}
					onClick={toggleExpanded}
					className='absolute top-2 right-2 z-10 opacity-0 transition-[opacity,background-color] duration-160 ease-out group-focus-within/card:opacity-100 group-hover/card:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-100'
				>
					{expanded ? <Minimize2Icon /> : <Maximize2Icon />}
				</Button>
				<AnimatePresence initial={false} mode='wait'>
					{expanded ? (
						<motion.div
							key='full'
							variants={fadeVariants}
							initial='initial'
							animate='animate'
							exit='exit'
							className='grid h-60 grid-rows-4 divide-y divide-monitor-grid'
						>
							{parameterOrder.map((parameter) => (
								<div key={parameter} className='flex min-h-0'>
									{plot === "trends" ? (
										<MonitorTrendLane
											parameter={parameter}
											values={trends[parameter === "bp" ? "systolic" : parameter]}
										/>
									) : (
										<MonitorLane parameter={parameter} vitals={vitals} />
									)}
									<div
										className={cn(
											"flex shrink-0 border-l border-monitor-grid py-0.5",
											cardSize === "sm" ? "w-28" : "w-32",
										)}
									>
										<MonitorNumeric parameter={parameter} vitals={vitals} limits={limits} size={cardSize} full />
									</div>
								</div>
							))}
						</motion.div>
					) : (
						<motion.div
							key='condensed'
							variants={fadeVariants}
							initial='initial'
							animate='animate'
							exit='exit'
							style={{ height: condensedHeight[cardSize] }}
							className='flex flex-col'
						>
							{plot === "trends" ? (
								// Each numeric over its last hour.
								<div className={cn("grid h-full divide-x divide-monitor-grid py-1.5", condensedColumns[cardSize])}>
									{parameterOrder.map((parameter) => (
										<div key={parameter} className='flex min-w-0 flex-col justify-between'>
											<MonitorNumeric
												parameter={parameter}
												vitals={vitals}
												limits={limits}
												size={cardSize}
												full={false}
											/>
											<MonitorSparkline
												parameter={parameter}
												values={trends[parameter === "bp" ? "systolic" : parameter]}
											/>
										</div>
									))}
								</div>
							) : (
								<>
									<MonitorLane parameter='hr' vitals={vitals} className='border-b border-monitor-grid' />
									<div
										className={cn(
											"grid h-[60px] shrink-0 divide-x divide-monitor-grid py-1",
											condensedColumns[cardSize],
										)}
									>
										{parameterOrder.map((parameter) => (
											<MonitorNumeric
												key={parameter}
												parameter={parameter}
												vitals={vitals}
												limits={limits}
												size={cardSize}
												full={false}
											/>
										))}
									</div>
								</>
							)}
						</motion.div>
					)}
				</AnimatePresence>
			</motion.section>
		</motion.article>
	);
}

export {
	defaultMonitorLimits,
	PatientMonitor,
	PatientMonitoringCard,
	patientMonitoringCardVariants,
	type MonitorLimits,
	type MonitorTrends,
	type MonitorVitals,
	type PatientMonitoringCardProps,
	type PatientMonitorProps,
	type PatientMonitoringCardSize,
};
