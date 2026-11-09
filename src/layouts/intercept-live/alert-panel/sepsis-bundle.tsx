import * as React from "react";
import {
	CircleCheckIcon,
	CircleDashedIcon,
	ClockIcon,
	LoaderCircleIcon,
	MonitorSmartphoneIcon,
	TriangleAlertIcon,
	Undo2Icon,
	type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import { Badge, type BadgeProps } from "@/components/data-display/badge";
import { useCurrentSecond } from "@/lib/hooks/use-current-second";
import { confirmPattern, fadeVariants, iconSwapReducedVariants, iconSwapVariants, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { SourceLabel } from "../shared/source-label";
import { Expand } from "./care-pathway";

// Exploration (DESIGN.md "Alert panel" › "Hour-1 bundle"): Scenario 3, steps 1, 3 and 4. The sepsis screen starts an
// hour-1 bundle timer at time zero, on the hub's screen and the hospital's. Each element turns green as the bedside
// documents it: lactate, blood cultures before antibiotics, broad-spectrum antibiotics, fluids, repeat lactate. Checks
// driven by the patient's chronic conditions sit on the element they guard: a renal dose review on the antibiotic, a
// fluid-tolerance reassessment after each bolus. As everywhere, the platform assists and never acts (PRD PD-061): the
// bedside documents, the intensivist reviews the dose.
//
// The hour-1 timer is the scenario's (Demo Use Cases, Scenario 3). The patient's page keeps the SEP-1 3-hour and 6-hour
// deadlines in its Sepsis section; which one the demo leads with is still open (Requirements Q-15).

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

/**
 * An element's status, from the data contract's sepsis element status (design update spec §4): complete, in progress
 * (started, not done, e.g. fluids running), pending, not applicable. Overdue isn't stored: it's an open element past its
 * due time.
 */
type BundleElementStatus = "complete" | "in-progress" | "pending" | "not-applicable";

/** A check the patient's chronic conditions add to an element, e.g. a renal dose review for eGFR 22. */
type BundleCheck = {
	/** E.g. "Renal dose review". */
	label: string;
	/** Why it's there, e.g. "eGFR 22, CKD stage 4". */
	reason: string;
	/** What it suggests, e.g. "First dose 4.5 g in full, then 2.25 g every 6 h". */
	suggestion: string;
	/** The rule behind it, e.g. "Pharmacy rule, renal dosing (configurable per hospital)". */
	source: string;
	/** Whether the intensivist confirms it here (a dose review) or it's the bedside's to follow (a reassessment). */
	confirm?: boolean;
	/** Who confirmed it and when (ISO 8601). */
	reviewed?: { by: string; at: string };
};

/** A fluid bolus given, and the bedside's reassessment after it (the fluid-tolerance check). */
type FluidBolus = {
	id: string;
	/** mL. */
	volume: number;
	at: string;
	/** What the reassessment found, e.g. "Lungs clear, SpO₂ 95%, MAP 61". */
	reassessment?: string;
	/** Tolerated: the next bolus can go. Not tolerated: fluids stop. */
	tolerated?: boolean;
	by: string;
};

type BundleElement = {
	/** E.g. `lactate`, `cultures`, `antibiotics`, `fluids`, `repeat-lactate`. */
	id: string;
	/** E.g. "Blood cultures before antibiotics". */
	label: string;
	/** What it asks for, e.g. "2 sets, before the first antibiotic". */
	target: string;
	status: BundleElementStatus;
	/** Minutes after time zero it's due. 60 by default; a repeat lactate is due later. */
	dueAfter?: number;
	/** What was documented, e.g. "3.8 mmol/L", "Piperacillin-tazobactam 4.5 g IV". */
	result?: string;
	/** Who documented it and when (ISO 8601). */
	documented?: { by: string; at: string };
	check?: BundleCheck;
	/** Fluids: the target, worked out from the weight, and the boluses so far. */
	fluids?: { perKg: number; weight: number; boluses: FluidBolus[] };
};

type SepsisBundle = {
	/** E.g. "Surviving Sepsis Campaign hour-1 bundle (configurable per hospital)". */
	source: string;
	/** Time zero (ISO 8601): when the sepsis screen fired. The timer counts an hour from it. */
	startedAt: string;
	/** What started it, e.g. "Sepsis screen". */
	startedBy: string;
	/** Where else the timer shows, e.g. "Sidney ED": the hospital's screen. */
	sharedWith?: string;
	elements: BundleElement[];
};

/** What the intensivist did: confirmed an element's check (a dose review), or took it back. */
type BundleDecision = { type: "confirm-check"; elementId: string } | { type: "undo-check"; elementId: string };

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

const HOUR_MS = 60 * 60_000;
const MINUTE_MS = 60_000;

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const formatVolume = (mL: number) => `${mL.toLocaleString("en-US")} mL`;

/** "47:12": minutes and seconds. */
function formatClock(ms: number) {
	const seconds = Math.max(0, Math.floor(ms / 1000));
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** "4 min", "1 h 12 min". */
function formatMinutes(ms: number) {
	const minutes = Math.max(1, Math.round(ms / MINUTE_MS));
	const hours = Math.floor(minutes / 60);
	return hours ? `${hours} h${minutes % 60 ? ` ${minutes % 60} min` : ""}` : `${minutes} min`;
}

const isOpen = (element: BundleElement) => element.status === "pending" || element.status === "in-progress";
const dueAt = (bundle: SepsisBundle, element: BundleElement) =>
	Date.parse(bundle.startedAt) + (element.dueAfter ?? 60) * MINUTE_MS;
const isOverdue = (bundle: SepsisBundle, element: BundleElement, now: number | null) =>
	isOpen(element) && now !== null && now > dueAt(bundle, element);

/** The fluid target: per kg × weight, rounded to 10 mL. */
const fluidTarget = (fluids: NonNullable<BundleElement["fluids"]>) => Math.round((fluids.perKg * fluids.weight) / 10) * 10;
const fluidGiven = (fluids: NonNullable<BundleElement["fluids"]>) =>
	fluids.boluses.reduce((sum, bolus) => sum + bolus.volume, 0);

type ElementLook = { icon: LucideIcon; label: string; iconClassName: string; boxClassName: string };

// Each status has its own glyph and word, so color is never the only signal; a complete element turns green.
function elementLook(bundle: SepsisBundle, element: BundleElement, now: number | null): ElementLook {
	if (isOverdue(bundle, element, now))
		return {
			icon: TriangleAlertIcon,
			label: "Overdue",
			iconClassName: "text-severity-critical",
			boxClassName: "border-severity-critical-muted bg-severity-critical-subtle",
		};
	switch (element.status) {
		case "complete":
			return {
				icon: CircleCheckIcon,
				label: "Complete",
				iconClassName: "text-success",
				boxClassName: "border-success-muted bg-success-subtle",
			};
		case "in-progress":
			return {
				icon: LoaderCircleIcon,
				label: "In progress",
				iconClassName: "text-severity-medium-strong",
				boxClassName: "border-border bg-background",
			};
		case "not-applicable":
			return { icon: CircleDashedIcon, label: "Not applicable", iconClassName: "text-icon-muted", boxClassName: "border-border bg-background" };
		default:
			return { icon: ClockIcon, label: "Pending", iconClassName: "text-icon", boxClassName: "border-border bg-background" };
	}
}

/** The bundle's badge: complete once every element is, overdue when one is, otherwise in progress. */
function bundleBadge(bundle: SepsisBundle, now: number | null): { label: string; variant: BadgeProps["variant"] } {
	if (bundle.elements.every((element) => !isOpen(element))) return { label: "Complete", variant: "green" };
	if (bundle.elements.some((element) => isOverdue(bundle, element, now))) return { label: "Overdue", variant: "red" };
	return { label: "In progress", variant: "amber" };
}

/* -------------------------------------------------------------------------- */
/* Parts                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The hour-1 timer: the time left until time zero plus an hour, the hour's progress as a bar, and how many of the
 * hour's elements are done. Once they all are, it says how long they took; past the hour with one open, it counts
 * the overdue time in red.
 */
function BundleTimer({ bundle, now }: { bundle: SepsisBundle; now: number | null }) {
	const start = Date.parse(bundle.startedAt);
	const hourElements = bundle.elements.filter((element) => (element.dueAfter ?? 60) <= 60);
	const hourDone = hourElements.filter((element) => !isOpen(element));
	const allDone = hourDone.length === hourElements.length;
	// When the hour's last element was documented, for "Done in 38 min".
	const doneAt = allDone
		? Math.max(...hourElements.map((element) => (element.documented ? Date.parse(element.documented.at) : start)))
		: null;
	const elapsed = now === null ? 0 : (doneAt ?? now) - start;
	const left = HOUR_MS - elapsed;
	const overdue = !allDone && left < 0;
	const progress = Math.min(1, Math.max(0, elapsed / HOUR_MS));
	const done = bundle.elements.filter((element) => !isOpen(element)).length;

	return (
		<div className='flex flex-col gap-3 rounded-card border border-border bg-background p-4'>
			<div className='flex items-end justify-between gap-3'>
				<p className='flex flex-col'>
					<span
						className={cn(
							"font-mono text-3xl font-semibold tabular-nums",
							overdue ? "text-severity-critical" : allDone ? "text-success" : "text-foreground",
						)}
					>
						{/* Before the first client render the time isn't known: a placeholder, so the server's render matches. */}
						{now === null ? "--:--" : formatClock(allDone ? elapsed : Math.abs(left))}
					</span>
					<span className='text-sm text-muted-foreground'>
						{allDone ? "Hour-1 elements done in" : overdue ? "Over the hour" : "Left in hour 1"}
					</span>
				</p>
				<p className='text-right text-sm text-foreground'>
					<span className='font-semibold tabular-nums'>
						{done} of {bundle.elements.length}
					</span>{" "}
					done
				</p>
			</div>
			{/* The hour so far; a bar, so it reads at a glance. The numbers above say the same for screen readers. */}
			<div aria-hidden='true' className='h-1.5 overflow-hidden rounded-full bg-muted'>
				<div
					className={cn(
						"h-full rounded-full transition-[width] duration-1000 ease-linear",
						overdue ? "bg-severity-critical" : allDone ? "bg-success" : "bg-severity-medium",
					)}
					style={{ width: `${progress * 100}%` }}
				/>
			</div>
			<div className='flex flex-col gap-0.5 text-xs text-muted-foreground'>
				<span>
					Time zero {formatTime(bundle.startedAt)} · {bundle.startedBy}
				</span>
				{bundle.sharedWith ? (
					<span className='inline-flex items-center gap-1'>
						<MonitorSmartphoneIcon aria-hidden='true' className='size-3' />
						Same timer on {bundle.sharedWith}&rsquo;s screen
					</span>
				) : null}
			</div>
		</div>
	);
}

/** An element's check: why it's there, what it suggests, and Confirm (or who confirmed it) when it's the hub's to confirm. */
function CheckBox({
	element,
	check,
	onConfirm,
	onUndo,
}: {
	element: BundleElement;
	check: BundleCheck;
	onConfirm: () => void;
	onUndo: () => void;
}) {
	const { prefersReducedMotion } = useMotionPreference();
	const reviewed = Boolean(check.reviewed);
	return (
		<div
			className={cn(
				"flex flex-col gap-1.5 rounded-lg border p-3 transition-colors",
				reviewed ? "border-success-muted bg-background" : "border-severity-medium-muted bg-severity-medium-subtle",
			)}
		>
			<p className='flex items-start gap-1.5 text-sm text-foreground'>
				<AnimatePresence mode='wait' initial={false}>
					<motion.span
						key={reviewed ? "reviewed" : "open"}
						variants={prefersReducedMotion ? iconSwapReducedVariants : iconSwapVariants}
						initial='hidden'
						animate='shown'
						exit='hidden'
						className='flex h-[1lh] shrink-0 items-center'
					>
						{reviewed ? (
							<CircleCheckIcon aria-hidden='true' className='size-4 text-success' />
						) : (
							<TriangleAlertIcon aria-hidden='true' className='size-4 text-severity-medium-strong' />
						)}
					</motion.span>
				</AnimatePresence>
				<span>
					<span className='font-semibold'>{check.label}</span> · {check.reason}
				</span>
			</p>
			<p className='text-sm text-foreground'>{check.suggestion}</p>
			<SourceLabel className='text-xs text-muted-foreground'>{check.source}</SourceLabel>
			{check.confirm ? (
				<AnimatePresence mode='wait' initial={false}>
					{check.reviewed ? (
						<motion.div
							key='reviewed'
							variants={fadeVariants}
							initial='initial'
							animate='animate'
							exit='exit'
							className='flex items-center justify-between gap-2 pt-1'
						>
							<motion.span className='text-xs font-medium text-success' {...(prefersReducedMotion ? {} : confirmPattern)}>
								Reviewed by {check.reviewed.by} · {formatTime(check.reviewed.at)}
							</motion.span>
							<Button variant='ghost' size='xs' onClick={onUndo} aria-label={`Undo ${check.label.toLowerCase()}, ${element.label}`}>
								<Undo2Icon />
								Undo
							</Button>
						</motion.div>
					) : (
						<motion.div key='open' variants={fadeVariants} initial='initial' animate='animate' exit='exit' className='pt-1'>
							<Button variant='outline' size='sm' onClick={onConfirm}>
								Confirm dose
							</Button>
						</motion.div>
					)}
				</AnimatePresence>
			) : null}
		</div>
	);
}

/** Fluids: given against the target, and each bolus with the reassessment after it. */
function FluidProgress({ fluids }: { fluids: NonNullable<BundleElement["fluids"]> }) {
	const target = fluidTarget(fluids);
	const given = fluidGiven(fluids);
	return (
		<div className='flex flex-col gap-2'>
			<div className='flex items-baseline justify-between gap-2 text-sm'>
				<span className='text-foreground'>
					<span className='font-semibold tabular-nums'>{formatVolume(given)}</span> of {formatVolume(target)}
				</span>
				<span className='text-xs text-muted-foreground'>
					{fluids.perKg} mL/kg × {fluids.weight} kg
				</span>
			</div>
			<div
				role='progressbar'
				aria-label='Fluids given'
				aria-valuemin={0}
				aria-valuemax={target}
				aria-valuenow={given}
				aria-valuetext={`${formatVolume(given)} of ${formatVolume(target)}`}
				className='h-1.5 overflow-hidden rounded-full bg-muted'
			>
				<div
					className='h-full rounded-full bg-severity-low transition-[width] duration-500 ease-out'
					style={{ width: `${Math.min(100, (given / target) * 100)}%` }}
				/>
			</div>
			{fluids.boluses.length ? (
				<ol aria-label='Boluses' className='flex flex-col'>
					<AnimatePresence initial={false}>
						{fluids.boluses.map((bolus, index) => (
							<li key={bolus.id}>
								<Expand>
									<div className='flex flex-col gap-0.5 border-t border-border-muted py-2 text-xs'>
										<span className='text-foreground'>
											<span className='font-semibold'>
												Bolus {index + 1} · {formatVolume(bolus.volume)}
											</span>{" "}
											<span className='text-muted-foreground'>· {formatTime(bolus.at)}</span>
										</span>
										{bolus.reassessment ? (
											<span className={bolus.tolerated === false ? "text-severity-critical" : "text-foreground"}>
												{bolus.tolerated === false ? "Not tolerated: " : "Tolerated: "}
												{bolus.reassessment}
											</span>
										) : null}
										<span className='text-muted-foreground'>{bolus.by}</span>
									</div>
								</Expand>
							</li>
						))}
					</AnimatePresence>
				</ol>
			) : null}
		</div>
	);
}

/** One element: its status, what it asks for, what was documented and by whom, then its check and its fluids. */
function ElementRow({
	bundle,
	element,
	now,
	onDecision,
}: {
	bundle: SepsisBundle;
	element: BundleElement;
	now: number | null;
	onDecision: (decision: BundleDecision) => void;
}) {
	const { prefersReducedMotion } = useMotionPreference();
	const look = elementLook(bundle, element, now);
	const overdue = isOverdue(bundle, element, now);
	const due = dueAt(bundle, element);
	// A decision waits here (a dose to confirm): the card's edge is dashed until it's made, as a suggested pathway's
	// orders and a draft referral are (Nov 6, 2026, user's call). Its color stays the status's.
	const deciding = Boolean(element.check?.confirm && !element.check.reviewed);
	const statusText =
		element.status === "complete" && element.documented
			? `Done ${formatTime(element.documented.at)}`
			: overdue && now !== null
				? `Overdue by ${formatMinutes(now - due)}`
				: isOpen(element)
					? `Due by ${formatTime(new Date(due).toISOString())}`
					: look.label;

	return (
		<li
			data-status={overdue ? "overdue" : element.status}
			// The box's color changes as the element is documented: a CSS transition, so it doesn't snap (no Motion on it).
			className={cn(
				"flex flex-col gap-3 rounded-card border p-4 transition-colors duration-500",
				look.boxClassName,
				deciding && "border-dashed",
				deciding && element.status !== "complete" && !overdue && "border-muted-foreground",
			)}
		>
			<div className='flex items-start gap-3'>
				<AnimatePresence mode='wait' initial={false}>
					<motion.span
						key={look.label}
						variants={prefersReducedMotion ? iconSwapReducedVariants : iconSwapVariants}
						initial='hidden'
						animate='shown'
						exit='hidden'
						className='flex h-[1lh] shrink-0 items-center text-sm'
					>
						<motion.span
							className='flex'
							{...(element.status === "complete" && !prefersReducedMotion ? confirmPattern : {})}
						>
							<look.icon aria-hidden='true' className={cn("size-4", look.iconClassName)} />
						</motion.span>
					</motion.span>
				</AnimatePresence>
				<div className='flex min-w-0 flex-1 flex-col gap-0.5'>
					<span className='text-sm font-semibold text-foreground'>
						<span className='sr-only'>{look.label}: </span>
						{element.label}
					</span>
					<span className='text-xs text-muted-foreground'>{element.target}</span>
				</div>
				<span
					className={cn(
						"shrink-0 text-right text-xs font-medium",
						overdue ? "text-severity-critical" : element.status === "complete" ? "text-success" : "text-muted-foreground",
					)}
				>
					{/* Before the first client render the time isn't known; overdue then waits for it. */}
					{statusText}
				</span>
			</div>
			<AnimatePresence initial={false}>
				{element.result ? (
					<Expand key='result'>
						<p className='text-sm text-foreground'>
							<span className='font-medium'>{element.result}</span>
							{element.documented ? <span className='text-muted-foreground'> · {element.documented.by}</span> : null}
						</p>
					</Expand>
				) : null}
			</AnimatePresence>
			{element.fluids ? <FluidProgress fluids={element.fluids} /> : null}
			{element.check ? (
				<CheckBox
					element={element}
					check={element.check}
					onConfirm={() => onDecision({ type: "confirm-check", elementId: element.id })}
					onUndo={() => onDecision({ type: "undo-check", elementId: element.id })}
				/>
			) : null}
		</li>
	);
}

/* -------------------------------------------------------------------------- */
/* Hour-1 bundle                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The hour-1 sepsis bundle, tracked element by element (Scenario 3): the timer from time zero, then each element as the
 * bedside documents it, green once complete, with the checks the patient's chronic conditions add. The intensivist
 * confirms a dose review here (`onDecision`); everything else comes from the bedside's documentation. `reviewer` names
 * who confirms ("you").
 */
function SepsisBundlePanel({
	bundle,
	onDecision,
	reviewer = "you",
	headingLevel = "h3",
	className,
}: {
	bundle: SepsisBundle;
	onDecision?: (decision: BundleDecision) => void;
	reviewer?: string;
	headingLevel?: "h2" | "h3";
	className?: string;
}) {
	const now = useCurrentSecond();
	// Dose reviews confirmed here, by element id, until the app's data has them (`check.reviewed`); `null` is one undone.
	const [reviews, setReviews] = React.useState<Record<string, { by: string; at: string } | null>>({});
	const decide = (decision: BundleDecision) => {
		setReviews((current) => ({
			...current,
			[decision.elementId]: decision.type === "confirm-check" ? { by: reviewer, at: new Date().toISOString() } : null,
		}));
		onDecision?.(decision);
	};
	const elements = bundle.elements.map((element) => {
		if (!element.check || !(element.id in reviews)) return element;
		const reviewed = reviews[element.id] ?? undefined;
		return { ...element, check: { ...element.check, reviewed } };
	});
	const shown = { ...bundle, elements };
	const badge = bundleBadge(shown, now);
	const Heading = headingLevel;

	return (
		<section aria-label='Hour-1 bundle' className={cn("flex flex-col gap-4", className)}>
			<div className='flex flex-col gap-1'>
				<div className='flex flex-wrap items-center gap-2'>
					<Heading className='text-base font-bold text-foreground'>Hour-1 bundle</Heading>
					<AnimatePresence mode='wait' initial={false}>
						<motion.span key={badge.label} variants={fadeVariants} initial='initial' animate='animate' exit='exit'>
							<Badge variant={badge.variant} size='xs'>
								{badge.label}
							</Badge>
						</motion.span>
					</AnimatePresence>
				</div>
				<SourceLabel className='text-xs text-muted-foreground'>Source: {bundle.source}</SourceLabel>
			</div>
			<BundleTimer bundle={shown} now={now} />
			<ol aria-label='Bundle elements' className='flex flex-col gap-2'>
				{elements.map((element) => (
					<ElementRow key={element.id} bundle={shown} element={element} now={now} onDecision={decide} />
				))}
			</ol>
		</section>
	);
}

export {
	fluidGiven,
	fluidTarget,
	SepsisBundlePanel,
	type BundleCheck,
	type BundleDecision,
	type BundleElement,
	type BundleElementStatus,
	type FluidBolus,
	type SepsisBundle,
};
