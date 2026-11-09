import * as React from "react";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	BellRingIcon,
	CircleCheckIcon,
	ClockIcon,
	MonitorSmartphoneIcon,
	OctagonXIcon,
	SmartphoneIcon,
	TriangleAlertIcon,
	type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Badge, type BadgeProps } from "@/components/data-display/badge";
import { confirmPattern, fadeVariants, iconSwapReducedVariants, iconSwapVariants, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { SourceLabel } from "../shared/source-label";
import { Expand } from "./care-pathway";

// Exploration (DESIGN.md "Alert modal" › "DKA protocol"): Scenario 4, steps 1 to 4. The intensivist starts the DKA
// pathway from the hub, and the bedside nurse's screen becomes an hourly checklist: glucose, potassium, anion gap, fluids
// and the insulin rate. The platform does the arithmetic: each glucose entry sets the next rate, a potassium under 3.3
// holds insulin and prompts replacement (a hard stop), a glucose under 250 prompts dextrose. A check left open 10 min
// past its time nudges the nurse and the hub's tele-RN. Rate changes go to the intensivist for sign-off, on their phone
// (mock). Once the gap closes, it walks the move to subcutaneous insulin before the drip stops.
//
// The hub reads the same checklist the nurse fills in; it doesn't enter checks. As everywhere, the platform assists and
// never acts (PRD PD-061): the calculator suggests a rate, the nurse runs it, the intensivist signs it.
//
// The thresholds are typical DKA protocol values (Demo Use Cases, Scenario 4: "replace them with Intercept's protocol
// before the demo"); they live in the data (`DkaProtocol.rules`), so a hospital's protocol replaces them.

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

/** The protocol's thresholds and doses. Typical values until Intercept's protocol replaces them. */
type DkaRules = {
	/** Starting insulin rate, units/kg/h (0.1). */
	startPerKg: number;
	/** The hourly glucose fall the rate aims for, mg/dL ([50, 75]): less raises the rate 1 unit/h, over 100 lowers it. */
	targetFall: [number, number];
	/** Potassium under this holds insulin and prompts replacement, mEq/L (3.3). */
	holdInsulinBelow: number;
	/** Potassium over this needs no replacement in the fluids, mEq/L (5.2). */
	noPotassiumAbove: number;
	/** Glucose under this prompts dextrose and drops the rate, mg/dL (250). */
	dextroseBelow: number;
	/** The rate once dextrose is running, units/kg/h (0.05). */
	dextrosePerKg: number;
	/** The glucose range to hold once dextrose is running, mg/dL ([150, 200]). */
	dextroseRange: [number, number];
	/** The gap is closed at or under this (12), with bicarbonate at or over `closedBicarbonate` (15). */
	closedGap: number;
	closedBicarbonate: number;
};

/** One hourly check's readings, as the nurse enters them. */
type DkaReadings = {
	/** mg/dL. */
	glucose: number;
	/** mEq/L. */
	potassium?: number;
	/** Anion gap, mEq/L. */
	gap?: number;
	/** mEq/L. */
	bicarbonate?: number;
	/** What's running, e.g. "0.45% saline + KCl 20 mEq/L, 250 mL/h". */
	fluids?: string;
};

/** The insulin rate the calculator set from a check, and why. */
type DkaInsulin = {
	/** units/h. While held, the rate to resume at. */
	rate: number;
	/** Insulin is held (potassium under the threshold). */
	held?: boolean;
	/** Dextrose is running, so the rate holds the glucose in range instead of lowering it. */
	dextrose?: boolean;
	/** The calculator's working, e.g. "Glucose fell 30, under 50 an hour: up 1 unit/h". */
	reasoning: string;
};

/**
 * Something a check raised: a hard stop (insulin held for low potassium) or a prompt (replace potassium, add
 * dextrose). Done once the bedside documents it.
 */
type DkaPrompt = {
	id: string;
	kind: "hard-stop" | "prompt";
	/** E.g. "Insulin held". */
	title: string;
	/** E.g. "Potassium 3.1 is under 3.3. No insulin until it's 3.3 or more". */
	detail: string;
	done?: { by: string; at: string; result?: string };
};

/** A rate change and its sign-off: waiting, or signed by the intensivist (on their phone, a mock) and how fast. */
type DkaRateChange = {
	from: number;
	to: number;
	signOff?: { status: "pending"; sentTo: string; at: string } | { status: "signed"; by: string; at: string; via: "phone" | "hub"; seconds: number };
};

/**
 * One hourly check. Status from the data: done, due, overdue (open 10 min past its time; the app works it out, as a
 * bedside task's), or upcoming. `at` is its scheduled time.
 */
type DkaCheck = {
	id: string;
	/** Hours since the drip started; 0 is the first. */
	hour: number;
	at: string;
	status: "done" | "due" | "overdue" | "upcoming";
	readings?: DkaReadings;
	insulin?: DkaInsulin;
	rateChange?: DkaRateChange;
	prompts?: DkaPrompt[];
	/** Who entered it and when. */
	done?: { by: string; at: string };
	/** The overdue nudge: when it went and to whom ("Brittany Cole, RN", "Ava Brooks, tele-RN"). */
	nudge?: { at: string; to: string[] };
};

/** A step in the move to subcutaneous insulin once the gap closes. */
type DkaOverlapStep = { id: string; label: string; detail?: string; done?: { by: string; at: string } };

type DkaProtocol = {
	/** E.g. "DKA insulin infusion". */
	title: string;
	/** E.g. "Typical DKA protocol values (ADA), until Intercept's protocol replaces them". */
	source: string;
	/** When the drip started (ISO 8601), and who started the protocol. */
	startedAt: string;
	startedBy: string;
	/** Where the same checklist shows, e.g. "Bridgeport": the nurse's screen. */
	sharedWith?: string;
	/** kg, for the per-kg doses. */
	weight: number;
	rules: DkaRules;
	/** Oldest first: the checks done so far, then the one due. */
	checks: DkaCheck[];
	/** Once the gap closes: the steps to subcutaneous insulin before the drip stops. */
	overlap?: { title: string; steps: DkaOverlapStep[] };
	/** The gap closed: when, at which hour, and the readings then. */
	gapClosed?: { at: string; hour: number; gap: number; bicarbonate?: number };
	/** The drip stopped, after the overlap: when, and how long it ran. */
	stopped?: { at: string; hours: number };
};

/* -------------------------------------------------------------------------- */
/* The calculator                                                             */
/* -------------------------------------------------------------------------- */

/** Rounds a rate to half a unit. */
const roundRate = (rate: number) => Math.round(rate * 2) / 2;

const formatRate = (rate: number) => `${rate.toLocaleString("en-US", { maximumFractionDigits: 1 })} units/h`;

/**
 * The next insulin rate from a check's readings and the previous check's insulin, with the prompts it raises. The same
 * arithmetic the nurse's checklist shows; the app's protocol service replaces it.
 */
function dkaCalculate(
	protocol: Pick<DkaProtocol, "rules" | "weight">,
	readings: DkaReadings,
	previous?: { readings?: DkaReadings; insulin?: DkaInsulin },
): { insulin: DkaInsulin; prompts: Omit<DkaPrompt, "id">[] } {
	const { rules, weight } = protocol;
	const prompts: Omit<DkaPrompt, "id">[] = [];
	const k = readings.potassium;

	// The first check: the starting rate, per kg.
	if (!previous?.insulin) {
		const rate = roundRate(rules.startPerKg * weight);
		if (k !== undefined && k < rules.holdInsulinBelow) {
			prompts.push(holdPrompt(rules, k), replacePrompt(rules));
			return { insulin: { rate, held: true, reasoning: `Start ${formatRate(rate)} once potassium is ${rules.holdInsulinBelow} or more` }, prompts };
		}
		return {
			insulin: { rate, reasoning: `${rules.startPerKg} units/kg/h × ${weight} kg` },
			prompts,
		};
	}

	const before = previous.insulin;
	let dextrose = Boolean(before.dextrose);
	let rate = before.rate;
	let reasoning: string;

	if (!dextrose && readings.glucose < rules.dextroseBelow) {
		// Under 250: dextrose in, and the rate drops so the glucose holds instead of falling.
		dextrose = true;
		rate = roundRate(rules.dextrosePerKg * weight);
		reasoning = `Glucose under ${rules.dextroseBelow}: ${rules.dextrosePerKg} units/kg/h with dextrose`;
		prompts.push({
			kind: "prompt",
			title: "Add dextrose",
			detail: `Glucose ${readings.glucose} is under ${rules.dextroseBelow}. Change fluids to D5 0.45% saline, and keep glucose ${rules.dextroseRange[0]}–${rules.dextroseRange[1]} until the gap closes`,
		});
	} else if (dextrose) {
		const [low, high] = rules.dextroseRange;
		if (readings.glucose > high) {
			rate = roundRate(rate + 0.5);
			reasoning = `Glucose over ${high} on dextrose: up 0.5 units/h`;
		} else if (readings.glucose < low) {
			rate = Math.max(roundRate(rate - 0.5), roundRate(0.02 * weight));
			reasoning = `Glucose under ${low} on dextrose: down 0.5 units/h`;
		} else {
			reasoning = `Glucose in range on dextrose: rate stays`;
		}
	} else {
		const fall = (previous.readings?.glucose ?? readings.glucose) - readings.glucose;
		const [low] = rules.targetFall;
		if (before.held) {
			reasoning = `Insulin back on at ${formatRate(rate)}`;
		} else if (fall < low) {
			rate = roundRate(rate + 1);
			reasoning = `Glucose fell ${Math.max(fall, 0)}, under ${low} an hour: up 1 unit/h`;
		} else if (fall > 100) {
			rate = Math.max(roundRate(rate - 1), 1);
			reasoning = `Glucose fell ${fall}, over 100 an hour: down 1 unit/h`;
		} else {
			reasoning = `Glucose fell ${fall}, on target: rate stays`;
		}
	}

	if (k !== undefined && k < rules.holdInsulinBelow) {
		prompts.push(holdPrompt(rules, k), replacePrompt(rules));
		return { insulin: { rate, held: true, dextrose, reasoning: `Held. Resume at ${formatRate(rate)} once potassium is ${rules.holdInsulinBelow} or more` }, prompts };
	}
	return { insulin: { rate, dextrose, reasoning }, prompts };
}

const holdPrompt = (rules: DkaRules, k: number): Omit<DkaPrompt, "id"> => ({
	kind: "hard-stop",
	title: "Insulin held",
	detail: `Potassium ${k} is under ${rules.holdInsulinBelow}. No insulin until it's ${rules.holdInsulinBelow} or more`,
});

const replacePrompt = (rules: DkaRules): Omit<DkaPrompt, "id"> => ({
	kind: "prompt",
	title: "Replace potassium",
	detail: `KCl 20 mEq an hour IV, then recheck potassium in 1 h. Insulin resumes at ${rules.holdInsulinBelow} or more`,
});

/** Whether a check closes the gap. */
const gapClosedBy = (rules: DkaRules, readings?: DkaReadings) =>
	readings?.gap !== undefined &&
	readings.gap <= rules.closedGap &&
	(readings.bicarbonate === undefined || readings.bicarbonate >= rules.closedBicarbonate);

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const minutesBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 60_000);

type CheckLook = { icon: LucideIcon; label: string; className: string };

// Each status has its own glyph and word, so color is never the only signal.
function checkLook(check: DkaCheck): CheckLook {
	switch (check.status) {
		case "done":
			return { icon: CircleCheckIcon, label: "Done", className: "text-success" };
		case "overdue":
			return { icon: TriangleAlertIcon, label: "Overdue", className: "text-severity-critical" };
		case "due":
			return { icon: ClockIcon, label: "Due", className: "text-severity-medium-strong" };
		default:
			return { icon: ClockIcon, label: "Upcoming", className: "text-icon-muted" };
	}
}

const latestDone = (protocol: DkaProtocol) => [...protocol.checks].reverse().find((check) => check.status === "done");
const openPrompt = (protocol: DkaProtocol, kind: DkaPrompt["kind"]) =>
	latestDone(protocol)?.prompts?.some((prompt) => prompt.kind === kind && !prompt.done) ?? false;

/** The panel's badge: stopped, gap closed, a check overdue, insulin held, or running. */
function protocolBadge(protocol: DkaProtocol): { label: string; variant: BadgeProps["variant"] } {
	if (protocol.stopped) return { label: "Drip stopped", variant: "green" };
	if (protocol.gapClosed) return { label: "Gap closed", variant: "green" };
	if (protocol.checks.some((check) => check.status === "overdue")) return { label: "Check overdue", variant: "red" };
	if (latestDone(protocol)?.insulin?.held) return { label: "Insulin held", variant: "red" };
	return { label: "Running", variant: "amber" };
}

/* -------------------------------------------------------------------------- */
/* Parts                                                                      */
/* -------------------------------------------------------------------------- */

/** One reading in the summary: its label, value and unit, and the change from the check before. */
function Stat({
	label,
	value,
	unit,
	previous,
	warn,
}: {
	label: string;
	value?: number;
	unit?: string;
	previous?: number;
	warn?: boolean;
}) {
	const change = value !== undefined && previous !== undefined ? value - previous : undefined;
	return (
		<div className='flex min-w-0 flex-col gap-0.5'>
			<dt className='text-xs text-muted-foreground'>{label}</dt>
			<dd className='flex flex-col'>
				<span className={cn("text-lg font-semibold tabular-nums", warn ? "text-severity-critical" : "text-foreground")}>
					{value ?? "--"}
					{unit ? <span className='ml-0.5 text-xs font-normal text-muted-foreground'>{unit}</span> : null}
				</span>
				{change !== undefined && change !== 0 ? (
					<span className='text-xs text-muted-foreground tabular-nums'>
						{change > 0 ? "▲" : "▼"} {Math.abs(Math.round(change * 10) / 10)} from {previous}
					</span>
				) : null}
			</dd>
		</div>
	);
}

/**
 * Where the drip is: the rate running now (Held in red), the latest glucose, potassium, gap and bicarbonate against the
 * check before, the gap's way down to closed as a bar, and the next check.
 */
function ProtocolSummary({ protocol }: { protocol: DkaProtocol }) {
	const done = protocol.checks.filter((check) => check.status === "done");
	const last = done.at(-1);
	const before = done.at(-2);
	const next = protocol.checks.find((check) => check.status !== "done");
	const held = Boolean(last?.insulin?.held) && !protocol.stopped;
	// Until the intensivist signs a rate change, the bedside runs the rate before it.
	const pending = last?.rateChange?.signOff?.status === "pending" ? last.rateChange : undefined;
	const running = pending ? pending.from : last?.insulin?.rate;
	const firstGap = done.find((check) => check.readings?.gap !== undefined)?.readings?.gap;
	const gap = last?.readings?.gap;
	const { closedGap } = protocol.rules;
	// The gap's way from where it started to closed, 0 to 1.
	const progress =
		firstGap !== undefined && gap !== undefined && firstGap > closedGap
			? Math.min(1, Math.max(0, (firstGap - gap) / (firstGap - closedGap)))
			: 0;

	return (
		<div className='flex flex-col gap-4 rounded-card border border-border bg-background p-4'>
			<div className='flex items-end justify-between gap-3'>
				<p className='flex flex-col'>
					<span
						className={cn(
							"font-mono text-3xl font-semibold tabular-nums",
							held ? "text-severity-critical" : protocol.stopped ? "text-success" : "text-foreground",
						)}
					>
						{protocol.stopped ? "Off" : held ? "Held" : running !== undefined ? running.toLocaleString("en-US") : "--"}
					</span>
					<span className='text-sm text-muted-foreground'>
						{protocol.stopped
							? `Drip stopped after ${protocol.stopped.hours} h`
							: held
								? `Insulin held · resumes at ${formatRate(last!.insulin!.rate)}`
								: pending
									? `Insulin, units/h · ${formatRate(pending.to)} waiting for sign-off`
									: "Insulin, units/h"}
					</span>
				</p>
				{next && !protocol.stopped ? (
					<p className='flex flex-col text-right text-sm'>
						<span className={cn("font-semibold", next.status === "overdue" ? "text-severity-critical" : "text-foreground")}>
							{next.status === "overdue" ? "Overdue" : "Next check"} · <span className='whitespace-nowrap'>{formatTime(next.at)}</span>
						</span>
						<span className='text-xs text-muted-foreground'>Hour {next.hour}</span>
					</p>
				) : null}
			</div>
			<dl className='grid grid-cols-4 gap-3'>
				<Stat label='Glucose' value={last?.readings?.glucose} unit='mg/dL' previous={before?.readings?.glucose} />
				<Stat
					label='Potassium'
					value={last?.readings?.potassium}
					previous={before?.readings?.potassium}
					warn={last?.readings?.potassium !== undefined && last.readings.potassium < protocol.rules.holdInsulinBelow}
				/>
				<Stat label='Gap' value={gap} previous={before?.readings?.gap} />
				<Stat label='HCO₃' value={last?.readings?.bicarbonate} previous={before?.readings?.bicarbonate} />
			</dl>
			<div className='flex flex-col gap-1.5'>
				<div
					role='progressbar'
					aria-label='Anion gap closing'
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={Math.round(progress * 100)}
					aria-valuetext={
						protocol.gapClosed
							? `Gap closed at ${protocol.gapClosed.gap}`
							: gap !== undefined
								? `Gap ${gap}, closes at ${closedGap} or under`
								: "No gap yet"
					}
					className='h-1.5 overflow-hidden rounded-full bg-muted'
				>
					<div
						className={cn(
							"h-full rounded-full transition-[width] duration-700 ease-out",
							protocol.gapClosed ? "bg-success" : "bg-severity-medium",
						)}
						style={{ width: `${progress * 100}%` }}
					/>
				</div>
				<div className='flex flex-col gap-0.5 text-xs text-muted-foreground'>
					<span>
						{protocol.gapClosed
							? `Gap closed at hour ${protocol.gapClosed.hour}: ${protocol.gapClosed.gap}${protocol.gapClosed.bicarbonate !== undefined ? `, HCO₃ ${protocol.gapClosed.bicarbonate}` : ""}`
							: `Gap ${firstGap ?? "--"} at the start · closes at ${closedGap} or under, HCO₃ ${protocol.rules.closedBicarbonate} or more`}
					</span>
					<span>
						Drip started {formatTime(protocol.startedAt)} · {protocol.startedBy}
					</span>
					{protocol.sharedWith ? (
						<span className='inline-flex items-center gap-1'>
							<MonitorSmartphoneIcon aria-hidden='true' className='size-3' />
							Same checklist on {protocol.sharedWith}&rsquo;s screen
						</span>
					) : null}
				</div>
			</div>
		</div>
	);
}

/** A hard stop or a prompt a check raised, and what the bedside did about it. */
function PromptBox({ prompt }: { prompt: DkaPrompt }) {
	const { prefersReducedMotion } = useMotionPreference();
	const done = Boolean(prompt.done);
	const hardStop = prompt.kind === "hard-stop";
	const Icon = done ? CircleCheckIcon : hardStop ? OctagonXIcon : TriangleAlertIcon;
	return (
		<div
			data-kind={prompt.kind}
			className={cn(
				"flex flex-col gap-1 rounded-lg border p-3 transition-colors duration-500",
				done
					? "border-success-muted bg-background"
					: hardStop
						? "border-severity-critical-muted bg-severity-critical-subtle"
						: "border-severity-medium-muted bg-severity-medium-subtle",
			)}
		>
			<p className='flex items-start gap-1.5 text-sm text-foreground'>
				<AnimatePresence mode='wait' initial={false}>
					<motion.span
						key={done ? "done" : "open"}
						variants={prefersReducedMotion ? iconSwapReducedVariants : iconSwapVariants}
						initial='hidden'
						animate='shown'
						exit='hidden'
						className='flex h-[1lh] shrink-0 items-center'
					>
						<Icon
							aria-hidden='true'
							className={cn(
								"size-4",
								done ? "text-success" : hardStop ? "text-severity-critical" : "text-severity-medium-strong",
							)}
						/>
					</motion.span>
				</AnimatePresence>
				<span>
					<span className='sr-only'>{hardStop ? "Hard stop" : "Prompt"}: </span>
					<span className='font-semibold'>{prompt.title}</span>
				</span>
			</p>
			<p className='text-sm text-foreground'>{prompt.detail}</p>
			<AnimatePresence initial={false}>
				{prompt.done ? (
					<Expand key='done'>
						<motion.p className='text-xs font-medium text-success' {...(prefersReducedMotion ? {} : confirmPattern)}>
							Done {formatTime(prompt.done.at)} by {prompt.done.by}
							{prompt.done.result ? `: ${prompt.done.result}` : ""}
						</motion.p>
					</Expand>
				) : null}
			</AnimatePresence>
		</div>
	);
}

/** A rate change and its sign-off: sent to the intensivist's phone, then signed, with how long it took. */
function RateChangeLine({ change }: { change: DkaRateChange }) {
	const up = change.to > change.from;
	const Arrow = up ? ArrowUpIcon : ArrowDownIcon;
	const signOff = change.signOff;
	return (
		<div className='flex flex-col gap-0.5 text-xs'>
			<span className='inline-flex items-center gap-1 font-medium text-foreground'>
				<Arrow aria-hidden='true' className='size-3' />
				Rate {formatRate(change.from)} → {formatRate(change.to)}
			</span>
			<AnimatePresence mode='wait' initial={false}>
				{signOff?.status === "pending" ? (
					<motion.span
						key='pending'
						variants={fadeVariants}
						initial='initial'
						animate='animate'
						exit='exit'
						className='inline-flex items-center gap-1 text-severity-medium-strong'
					>
						<SmartphoneIcon aria-hidden='true' className='size-3' />
						Waiting for sign-off · sent to {signOff.sentTo}&rsquo;s phone {formatTime(signOff.at)}
					</motion.span>
				) : signOff?.status === "signed" ? (
					<motion.span
						key='signed'
						variants={fadeVariants}
						initial='initial'
						animate='animate'
						exit='exit'
						className='inline-flex items-center gap-1 text-success'
					>
						{signOff.via === "phone" ? <SmartphoneIcon aria-hidden='true' className='size-3' /> : null}
						Signed by {signOff.by}
						{signOff.via === "phone" ? " on their phone" : ""} · {signOff.seconds} s after the request
					</motion.span>
				) : null}
			</AnimatePresence>
		</div>
	);
}

/** A check's readings, in a row of small cells. */
function ReadingsRow({ readings, rules }: { readings: DkaReadings; rules: DkaRules }) {
	const cells: [string, string | undefined, boolean?][] = [
		["Glucose", `${readings.glucose}`],
		["K", readings.potassium?.toString(), readings.potassium !== undefined && readings.potassium < rules.holdInsulinBelow],
		["Gap", readings.gap?.toString()],
		["HCO₃", readings.bicarbonate?.toString()],
	];
	return (
		<dl className='grid grid-cols-4 gap-2'>
			{cells.map(([label, value, warn]) => (
				<div key={label} className='flex flex-col'>
					<dt className='text-xs text-muted-foreground'>{label}</dt>
					<dd className={cn("text-sm font-semibold tabular-nums", warn ? "text-severity-critical" : "text-foreground")}>{value ?? "--"}</dd>
				</div>
			))}
		</dl>
	);
}

/**
 * One hourly check. The latest done and the one due show in full: the readings, fluids, the calculator's rate and why,
 * its prompts, the rate change's sign-off and any overdue nudge. Earlier checks fold to one line, with a word for what
 * happened at them.
 */
function CheckRow({ check, rules, full }: { check: DkaCheck; rules: DkaRules; full: boolean }) {
	const { prefersReducedMotion } = useMotionPreference();
	const look = checkLook(check);
	const late = check.done ? minutesBetween(check.at, check.done.at) : 0;
	const statusText =
		check.status === "done" && check.done
			? `Done ${formatTime(check.done.at)}${late > 10 ? `, ${late} min late` : ""}`
			: check.status === "overdue"
				? "Overdue"
				: check.status === "due"
					? "Due"
					: "Upcoming";
	// A decision waits on this check (a rate change to sign off): its edge is dashed until it's signed, as a suggested
	// pathway's orders are (Nov 6, 2026, user's call).
	const deciding = check.rateChange?.signOff?.status === "pending";
	const marks = [
		check.prompts?.some((prompt) => prompt.kind === "hard-stop") ? "Insulin held" : undefined,
		check.prompts?.some((prompt) => prompt.title === "Add dextrose") ? "Dextrose" : undefined,
		check.rateChange ? `Rate ${check.rateChange.to > check.rateChange.from ? "up" : "down"}` : undefined,
		check.nudge ? "Nudged" : undefined,
	].filter(Boolean);

	return (
		<div
			data-status={check.status}
			className={cn(
				"flex flex-col gap-3 rounded-card border p-4 transition-colors duration-500",
				check.status === "overdue"
					? "border-severity-critical-muted bg-severity-critical-subtle"
					: check.status === "due"
						? "border-severity-medium-muted bg-background"
						: deciding
							? "border-dashed border-muted-foreground bg-background"
							: "border-border bg-background",
				!full && "gap-1 py-3",
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
						<motion.span className='flex' {...(check.status === "done" && !prefersReducedMotion ? confirmPattern : {})}>
							<look.icon aria-hidden='true' className={cn("size-4", look.className)} />
						</motion.span>
					</motion.span>
				</AnimatePresence>
				<div className='flex min-w-0 flex-1 flex-col gap-0.5'>
					<span className='text-sm font-semibold text-foreground'>
						<span className='sr-only'>{look.label}: </span>
						Hour {check.hour} · {formatTime(check.at)}
					</span>
					{!full && check.readings ? (
						<span className='text-xs text-muted-foreground tabular-nums'>
							{[
								`Glucose ${check.readings.glucose}`,
								check.readings.potassium !== undefined ? `K ${check.readings.potassium}` : undefined,
								check.readings.gap !== undefined ? `Gap ${check.readings.gap}` : undefined,
								check.insulin ? (check.insulin.held ? "Insulin held" : formatRate(check.insulin.rate)) : undefined,
							]
								.filter(Boolean)
								.join(" · ")}
						</span>
					) : null}
				</div>
				<span className='flex shrink-0 flex-col items-end gap-1'>
					<span
						className={cn(
							"text-right text-xs font-medium",
							check.status === "overdue" || late > 10
								? "text-severity-critical"
								: check.status === "done"
									? "text-success"
									: "text-muted-foreground",
						)}
					>
						{statusText}
					</span>
					{!full && marks.length ? (
						<span className='flex flex-wrap justify-end gap-1'>
							{marks.map((mark) => (
								<Badge key={mark} variant='secondary' size='xs'>
									{mark}
								</Badge>
							))}
						</span>
					) : null}
				</span>
			</div>
			{full ? (
				<>
					{check.readings ? (
						<>
							<ReadingsRow readings={check.readings} rules={rules} />
							{check.readings.fluids ? <p className='text-xs text-muted-foreground'>Fluids: {check.readings.fluids}</p> : null}
						</>
					) : (
						<p className='text-sm text-muted-foreground'>Glucose, potassium, gap, fluids and the insulin rate, entered at the bedside.</p>
					)}
					{check.insulin ? (
						<div className='flex flex-col gap-0.5 rounded-lg bg-muted px-3 py-2'>
							<span className='text-sm font-semibold text-foreground'>
								{/* Held: the hard stop below says so; this says what happens next. */}
								{check.insulin.held ? `Resumes at ${formatRate(check.insulin.rate)}` : `Insulin ${formatRate(check.insulin.rate)}`}
								{check.insulin.dextrose && !check.insulin.held ? <span className='font-normal text-muted-foreground'> · with dextrose</span> : null}
							</span>
							<span className='text-xs text-muted-foreground'>Calculator: {check.insulin.reasoning}</span>
						</div>
					) : null}
					{check.prompts?.map((prompt) => <PromptBox key={prompt.id} prompt={prompt} />)}
					{check.rateChange ? <RateChangeLine change={check.rateChange} /> : null}
					{check.nudge ? (
						<p className='inline-flex items-start gap-1 text-xs text-severity-critical'>
							<BellRingIcon aria-hidden='true' className='mt-0.5 size-3 shrink-0' />
							<span>
								10 min overdue at {formatTime(check.nudge.at)}: nudged {check.nudge.to.join(" and ")}
							</span>
						</p>
					) : null}
					{check.done ? <p className='text-xs text-muted-foreground'>Entered by {check.done.by}</p> : null}
				</>
			) : null}
		</div>
	);
}

/** The move to subcutaneous insulin once the gap closes, step by step, each checked off as the bedside documents it. */
function OverlapSteps({ overlap }: { overlap: NonNullable<DkaProtocol["overlap"]> }) {
	const { prefersReducedMotion } = useMotionPreference();
	return (
		<div className='flex flex-col gap-3 rounded-card border border-border bg-background p-4'>
			<p className='text-sm font-semibold text-foreground'>{overlap.title}</p>
			<ol aria-label={overlap.title} className='flex flex-col gap-3'>
				{overlap.steps.map((step, index) => {
					const Icon = step.done ? CircleCheckIcon : ClockIcon;
					return (
						<li key={step.id} className='flex items-start gap-3'>
							<AnimatePresence mode='wait' initial={false}>
								<motion.span
									key={step.done ? "done" : "open"}
									variants={prefersReducedMotion ? iconSwapReducedVariants : iconSwapVariants}
									initial='hidden'
									animate='shown'
									exit='hidden'
									className='flex h-[1lh] shrink-0 items-center text-sm'
								>
									<Icon aria-hidden='true' className={cn("size-4", step.done ? "text-success" : "text-icon")} />
								</motion.span>
							</AnimatePresence>
							<div className='flex min-w-0 flex-col gap-0.5'>
								<span className='text-sm text-foreground'>
									<span className='sr-only'>{step.done ? "Done" : "To do"}: </span>
									<span className='font-semibold'>
										{index + 1}. {step.label}
									</span>
								</span>
								{step.detail ? <span className='text-xs text-muted-foreground'>{step.detail}</span> : null}
								{step.done ? (
									<motion.span key={step.done.at} variants={fadeVariants} initial='initial' animate='animate' className='text-xs text-success'>
										Done {formatTime(step.done.at)} by {step.done.by}
									</motion.span>
								) : null}
							</div>
						</li>
					);
				})}
			</ol>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/* DKA protocol                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The DKA insulin protocol the intensivist started (Scenario 4): where the drip is, then the bedside's hourly checklist
 * as the nurse fills it in, the calculator's rate at each check with the hard stops and prompts it raised, rate changes
 * signed off by the intensivist and overdue nudges, then the move to subcutaneous insulin once the gap closes. Read-only:
 * the nurse enters checks at the bedside.
 */
function DkaProtocolPanel({
	protocol,
	headingLevel = "h3",
	className,
}: {
	protocol: DkaProtocol;
	headingLevel?: "h2" | "h3";
	className?: string;
}) {
	const badge = protocolBadge(protocol);
	const Heading = headingLevel;
	const last = latestDone(protocol);
	// Newest first, so the check that matters is at the top; the latest done and the open one in full.
	const checks = [...protocol.checks].reverse();
	const held = openPrompt(protocol, "hard-stop");

	return (
		<section aria-label={protocol.title} className={cn("flex flex-col gap-4", className)}>
			<div className='flex flex-col gap-1'>
				<div className='flex flex-wrap items-center gap-2'>
					<Heading className='text-base font-bold text-foreground'>{protocol.title}</Heading>
					<AnimatePresence mode='wait' initial={false}>
						<motion.span key={badge.label} variants={fadeVariants} initial='initial' animate='animate' exit='exit'>
							<Badge variant={badge.variant} size='xs'>
								{badge.label}
							</Badge>
						</motion.span>
					</AnimatePresence>
				</div>
				<SourceLabel className='text-xs text-muted-foreground'>Source: {protocol.source}</SourceLabel>
				{/* Read out when insulin is held, so a screen reader hears the hard stop without hunting for it. */}
				<p className='sr-only' aria-live='polite'>
					{held ? "Insulin held for low potassium." : ""}
				</p>
			</div>
			<ProtocolSummary protocol={protocol} />
			<AnimatePresence initial={false}>
				{protocol.overlap ? (
					<Expand key='overlap'>
						<OverlapSteps overlap={protocol.overlap} />
					</Expand>
				) : null}
			</AnimatePresence>
			<div className='flex flex-col gap-2'>
				<p className='text-sm font-semibold text-foreground'>Hourly checks</p>
				<ol aria-label='Hourly checks' className='flex flex-col gap-2'>
					{/* A new check slides in at the top (Expand); checks are only ever added. */}
					<AnimatePresence initial={false}>
						{checks.map((check) => (
							<li key={check.id}>
								<Expand>
									<CheckRow check={check} rules={protocol.rules} full={check.status !== "done" || check.id === last?.id} />
								</Expand>
							</li>
						))}
					</AnimatePresence>
				</ol>
			</div>
		</section>
	);
}

export {
	dkaCalculate,
	DkaProtocolPanel,
	gapClosedBy,
	type DkaCheck,
	type DkaInsulin,
	type DkaOverlapStep,
	type DkaPrompt,
	type DkaProtocol,
	type DkaRateChange,
	type DkaReadings,
	type DkaRules,
};
