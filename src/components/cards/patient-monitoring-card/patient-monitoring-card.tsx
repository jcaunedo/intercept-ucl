"use client";

import * as React from "react";
import { MapPinIcon, Maximize2Icon, Minimize2Icon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import {
	PatientCardAlert,
	patientCardInteractiveClassName,
	patientCardOpenTargetClassName,
	usePatientCardAlertRing,
	type PatientCardProps,
} from "@/components/cards/patient-card";
import { fadeVariants, liftPattern, standardTransition, useMotionPreference } from "@/lib/motion";
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

// One color per parameter, everywhere (PRD Monitoring SV-072), with its waveform.
const parameters: Record<ParameterKey, { label: string; wave: string; unit: string; color: string; kind: WaveformKind }> =
	{
		hr: { label: "HR", wave: "II", unit: "bpm", color: "text-monitor-ecg", kind: "ecg" },
		spo2: { label: "SpO₂", wave: "Pleth", unit: "%", color: "text-monitor-spo2", kind: "pleth" },
		bp: { label: "ABP", wave: "ABP", unit: "mmHg", color: "text-monitor-abp", kind: "abp" },
		rr: { label: "RR", wave: "Resp", unit: "rpm", color: "text-monitor-resp", kind: "resp" },
	};
const parameterOrder: ParameterKey[] = ["hr", "spo2", "bp", "rr"];

const outside = (value: number | undefined, [low, high]: [number, number]) =>
	value !== undefined && (value < low || value > high);

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
	> & {
		vitals?: MonitorVitals;
		/** Alarm limits; defaults to common adult ICU limits. */
		limits?: Partial<MonitorLimits>;
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
}: {
	parameter: ParameterKey;
	vitals: MonitorVitals;
	limits: MonitorLimits;
	full: boolean;
}) {
	const { label, unit, color } = parameters[parameter];
	const value =
		parameter === "bp"
			? vitals.systolic !== undefined && vitals.diastolic !== undefined
				? `${vitals.systolic}/${vitals.diastolic}`
				: "--"
			: (vitals[parameter] ?? "--");
	const limit = parameter === "bp" ? limits.systolic : limits[parameter];
	const alarm = outside(parameter === "bp" ? vitals.systolic : vitals[parameter], limit);

	return (
		// No visual highlight for a value outside its limits (removed by design, Oct 26, 2026): the limits sit beside the
		// value and the card's alert pill carries the alarm. `data-alarm` and the screen-reader note keep it known.
		<div
			data-alarm={alarm ? "" : undefined}
			className='flex min-w-0 flex-1 flex-col justify-center gap-0.5 rounded-sm px-2 py-0.5'
		>
			<span className={cn("flex w-full items-baseline justify-between gap-1 text-xs/4 font-semibold", color)}>
				<span>
					{label}
					{/* The mean pressure sits by the label, as on a bedside monitor. */}
					{full && parameter === "bp" && vitals.map !== undefined ? (
						<span className='font-normal text-monitor-foreground tabular-nums'> ({vitals.map})</span>
					) : null}
				</span>
				<span className='font-normal text-monitor-foreground'>{unit}</span>
			</span>
			<span className='flex w-full items-end justify-between gap-1'>
				{/* Alarm limits, high over low, small beside the value. */}
				{full ? (
					<span className='flex flex-col text-xs/3.5 text-monitor-foreground tabular-nums'>
						<span>{limit[1]}</span>
						<span>{limit[0]}</span>
					</span>
				) : null}
				<span className={cn("font-semibold tabular-nums leading-none", full ? "text-2xl" : "text-xl", color)}>
					{value}
					{alarm ? <span className='sr-only'>, outside alarm limits</span> : null}
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
 * A patient's identity and location over a live bedside monitor. Condensed by default (an ECG strip and HR, SpO₂, BP and
 * RR); expands to the full monitor, one waveform lane per parameter with its numbers and alarm limits. An alert behaves
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
	vitals = {},
	limits: limitsProp,
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
			data-expanded={expanded ? "" : undefined}
			whileHover={interactive && !prefersReducedMotion ? liftPattern.whileHover : undefined}
			transition={liftPattern.transition}
			className={cn(
				"group/card relative isolate flex flex-col gap-3 rounded-card border border-border bg-card p-[15px] text-card-foreground shadow-sm transition-[border-color,box-shadow] duration-160 ease-in-out",
				interactive && patientCardInteractiveClassName,
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
					<h3 className='-mb-0.5 text-xl font-bold break-words text-foreground'>{nameContent}</h3>
					{identity ? <p className='text-sm break-words text-muted-foreground'>{identity}</p> : null}
				</div>
				{alert ? (
					<PatientCardAlert variant={alert.variant} count={alert.count}>
						{alert.label}
					</PatientCardAlert>
				) : null}
			</div>

			<div className='flex items-center gap-1'>
				<p className='flex min-w-0 flex-1 items-center gap-1 text-sm font-medium text-foreground'>
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
				<Button
					variant='ghost'
					size='icon-xs'
					aria-expanded={expanded}
					aria-controls={monitorId}
					aria-label={expanded ? "Show condensed monitor" : "Show full monitor"}
					onClick={toggleExpanded}
					// Raised above the card's open target, so it keeps its own click.
					className='relative z-10 text-icon-muted'
				>
					{expanded ? <Minimize2Icon /> : <Maximize2Icon />}
				</Button>
			</div>

			{/* Always dark, like a bedside monitor. The height animates between the two views (Expand pattern). */}
			<motion.section
				id={monitorId}
				aria-label={`Bedside monitor, ${name}`}
				initial={false}
				animate={{ height: expanded ? 240 : 120 }}
				transition={resolve(standardTransition)}
				className='overflow-hidden rounded-lg bg-monitor text-monitor-foreground'
			>
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
									<MonitorLane parameter={parameter} vitals={vitals} />
									<div className='flex w-32 shrink-0 border-l border-monitor-grid py-0.5'>
										<MonitorNumeric parameter={parameter} vitals={vitals} limits={limits} full />
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
							className='flex h-30 flex-col'
						>
							<MonitorLane parameter='hr' vitals={vitals} className='border-b border-monitor-grid' />
							<div className='grid h-[60px] shrink-0 grid-cols-4 divide-x divide-monitor-grid py-1'>
								{parameterOrder.map((parameter) => (
									<MonitorNumeric key={parameter} parameter={parameter} vitals={vitals} limits={limits} full={false} />
								))}
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</motion.section>
		</motion.article>
	);
}

export {
	defaultMonitorLimits,
	PatientMonitoringCard,
	type MonitorLimits,
	type MonitorVitals,
	type PatientMonitoringCardProps,
};
