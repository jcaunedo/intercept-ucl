import * as React from "react";
import {
	CheckIcon,
	CircleCheckIcon,
	CircleSlashIcon,
	CircleXIcon,
	ClockIcon,
	HeartCrackIcon,
	MinusIcon,
	ShieldIcon,
	SparklesIcon,
	TriangleAlertIcon,
	XIcon,
	type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/buttons/button";
import { Badge, type BadgeProps } from "@/components/data-display/badge";
import { Label } from "@/components/forms/label";
import { RadioGroup, RadioGroupItem } from "@/components/forms/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/forms/select";
import { Textarea } from "@/components/forms/textarea";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { cn } from "@/lib/utils";

import { formatTime, freshness, NoData, SectionCard } from "../section-parts";

// The Sepsis section (PRD Patient details PD-080): one screening or tracked case. Its state and who decided it, the
// criteria with their values, the SEP-1 bundle's 3-hour and 6-hour elements counted from time zero, and the hospital's
// own protocol in a card of its own, never merged with SEP-1 (PD-AC-14). Sepsis Sniffer only flags: validating or
// rejecting is a clinician's call, intensivist or APP.

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

/** Candidate until a clinician decides; Tracking once validated (PRD PC-080–PC-083). */
type SepsisState = "candidate" | "tracking" | "rejected" | "excluded";

type SepsisCriterion = {
	id: string;
	label: string;
	status: "met" | "not-met" | "missing";
	/** Preformatted, e.g. "38.9 °C", "NE 0.22". */
	value?: string;
	at?: string;
	/** "Monitor", "Lab", "Pump", "Ventilator". */
	source?: string;
	/** Past its freshness window: still shown, marked "stale" (PRD PD-120). */
	stale?: boolean;
	/** What a missing value reads instead, e.g. "No result in 24 h". */
	missingLabel?: string;
};

/** A bundle or protocol element. Overdue isn't stored: it's an open element past `dueAt`. */
type SepsisElement = {
	id: string;
	label: string;
	status: "done" | "due" | "declined" | "elapsed";
	/** When it was done. */
	doneAt?: string;
	/** What was done or what's left, e.g. "2 sets", "1,000 of 1,920 mL given". */
	detail?: string;
	dueAt: string;
	/** Who declined it and why (PRD Spec §8.2: declined with rationale). */
	addressed?: { at: string; by: string; rationale?: string };
};

type SepsisBundleElement = SepsisElement & { window: "3h" | "6h" };

type SepsisCase = {
	state: SepsisState;
	/** The agent that flagged it. */
	agent: string;
	flaggedAt: string;
	/** SEP-1's time zero, and what set it. The bundle's windows count from it. */
	timeZero: string;
	timeZeroBasis?: string;
	sirs: SepsisCriterion[];
	organDysfunction: SepsisCriterion[];
	bundle: SepsisBundleElement[];
	/** The hospital's own elements, shown apart from SEP-1. */
	hospitalProtocol?: { name: string; elements: SepsisElement[] };
	/** Who validated, rejected or excluded the candidate. */
	decision?: { at: string; by: string; reason?: string; exclusion?: string; note?: string };
};

/** What the clinician did. The app sends it to Virtual Sepsis, which records who and when. */
type SepsisAction =
	| { type: "validate" }
	| { type: "reject"; reason: string; exclusion?: string; note: string }
	| { type: "decline-element"; elementId: string; rationale: string };

type SepsisSectionProps = {
	sepsis: SepsisCase;
	/** Who's signed in. An RN sees the case read-only (PRD PD-080 Validation: intensivist or APP). */
	role?: "intensivist" | "app" | "rn";
	onAction?: (action: SepsisAction) => void;
	/** Opens Virtual Sepsis on this patient (PRD PC-103). */
	onOpenVirtualSepsis?: () => void;
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

const stateLabels: Record<SepsisState, { label: string; variant: BadgeProps["variant"] }> = {
	candidate: { label: "Candidate", variant: "purple" },
	tracking: { label: "Validated · Tracking", variant: "red" },
	rejected: { label: "Rejected", variant: "secondary" },
	excluded: { label: "Excluded", variant: "secondary" },
};

const rejectReasons = [
	"Another cause explains the criteria",
	"Chronic, not a new finding",
	"Already treated for this episode",
	"Other",
];

const exclusions = [
	"Comfort measures only",
	"Transferred in from another acute care hospital",
	"Enrolled in a clinical trial",
	"Left against medical advice",
];

const noExclusion = "none";

/** "3 h 30 min", "45 min". */
function formatDuration(ms: number) {
	const minutes = Math.max(0, Math.round(ms / 60_000));
	const hours = Math.floor(minutes / 60);
	return hours ? `${hours} h${minutes % 60 ? ` ${minutes % 60} min` : ""}` : `${minutes} min`;
}

const isOpen = (element: SepsisElement) => element.status === "due";
const isOverdue = (element: SepsisElement, now: number | null) =>
	isOpen(element) && now !== null && now > Date.parse(element.dueAt);

/* -------------------------------------------------------------------------- */
/* Parts                                                                      */
/* -------------------------------------------------------------------------- */

/** An inline form under its trigger, like the triage queue's: Cancel and a submit that stays off until it's complete. */
function InlineForm({
	submitLabel,
	submitDisabled,
	onSubmit,
	onCancel,
	children,
}: {
	submitLabel: string;
	submitDisabled?: boolean;
	onSubmit: () => void;
	onCancel: () => void;
	children: React.ReactNode;
}) {
	return (
		<form
			className='flex flex-col gap-3 rounded-lg border border-border-muted bg-background-subtle p-3'
			onSubmit={(event) => {
				event.preventDefault();
				if (!submitDisabled) onSubmit();
			}}
		>
			{children}
			<div className='flex justify-end gap-2'>
				<Button type='button' variant='ghost' size='sm' onClick={onCancel}>
					Cancel
				</Button>
				<Button type='submit' size='sm' disabled={submitDisabled}>
					{submitLabel}
				</Button>
			</div>
		</form>
	);
}

// Met, not met and missing each have their own glyph and an sr-only word, so color is never the only signal.
const criterionGlyphs: Record<SepsisCriterion["status"], { icon?: LucideIcon; label: string; className: string }> = {
	met: { icon: CheckIcon, label: "Met", className: "bg-badge-red text-badge-red-foreground" },
	"not-met": { icon: MinusIcon, label: "Not met", className: "bg-neutral-muted text-muted-foreground" },
	missing: { label: "Missing", className: "border border-dashed border-border-defined text-muted-foreground" },
};

function CriterionRow({ criterion, now }: { criterion: SepsisCriterion; now: number | null }) {
	const glyph = criterionGlyphs[criterion.status];
	const Icon = glyph.icon;

	return (
		<li className='flex items-start gap-3 py-2'>
			<span
				aria-hidden='true'
				className={cn("mt-px flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold", glyph.className)}
			>
				{Icon ? <Icon className='size-3.5' strokeWidth={2.5} /> : "?"}
			</span>
			<div className='flex min-w-0 flex-1 flex-col'>
				<span className='text-sm text-foreground'>
					<span className='sr-only'>{glyph.label}: </span>
					{criterion.label}
				</span>
				{criterion.source && criterion.at ? (
					<span className='text-xs text-muted-foreground'>{freshness(criterion.source, criterion.at, now)}</span>
				) : null}
			</div>
			<span
				className={cn(
					"shrink-0 pt-px text-right font-mono text-sm tabular-nums",
					criterion.status === "missing" || criterion.stale ? "text-muted-foreground" : "text-foreground",
				)}
			>
				{criterion.status === "missing" ? (criterion.missingLabel ?? "--") : (criterion.value ?? "--")}
				{criterion.stale ? <span className='text-badge-amber-foreground'> · stale</span> : null}
			</span>
		</li>
	);
}

function CriteriaGroup({ title, criteria, now }: { title: string; criteria: SepsisCriterion[]; now: number | null }) {
	const met = criteria.filter((criterion) => criterion.status === "met").length;
	const missing = criteria.filter((criterion) => criterion.status === "missing").length;
	return (
		<div className='flex flex-col'>
			<div className='flex items-baseline justify-between gap-3 border-b border-border-muted pb-1.5'>
				<h3 className='text-sm font-semibold text-foreground'>{title}</h3>
				<p className='text-xs text-muted-foreground'>
					{met} of {criteria.length} met{missing ? ` · ${missing} missing` : ""}
				</p>
			</div>
			<ul className='flex flex-col divide-y divide-border-muted'>
				{criteria.map((criterion) => (
					<CriterionRow key={criterion.id} criterion={criterion} now={now} />
				))}
			</ul>
		</div>
	);
}

/** An element's status in words: done at, due in, overdue by, declined, elapsed. */
function elementStatus(element: SepsisElement, now: number | null): { icon: LucideIcon; text: string; className: string } {
	switch (element.status) {
		case "done":
			return {
				icon: CircleCheckIcon,
				text: element.doneAt ? `Done ${formatTime(element.doneAt)}` : "Done",
				className: "text-success",
			};
		case "declined":
			return { icon: CircleXIcon, text: "Declined", className: "text-muted-foreground" };
		case "elapsed":
			return { icon: CircleSlashIcon, text: "Elapsed", className: "text-muted-foreground" };
		default: {
			if (now === null) return { icon: ClockIcon, text: `Due ${formatTime(element.dueAt)}`, className: "text-icon" };
			const left = Date.parse(element.dueAt) - now;
			return left < 0
				? { icon: TriangleAlertIcon, text: `Overdue by ${formatDuration(-left)}`, className: "text-severity-critical" }
				: { icon: ClockIcon, text: `Due in ${formatDuration(left)}`, className: "text-icon" };
		}
	}
}

function ElementRow({
	element,
	now,
	canAct,
	onDecline,
}: {
	element: SepsisElement;
	now: number | null;
	canAct: boolean;
	onDecline: (rationale: string) => void;
}) {
	const id = React.useId();
	const [declining, setDeclining] = React.useState(false);
	const [rationale, setRationale] = React.useState("");
	const status = elementStatus(element, now);
	const overdue = isOverdue(element, now);

	return (
		<li data-status={overdue ? "overdue" : element.status} className='flex flex-col gap-2 py-2.5'>
			<div className='flex items-start gap-3'>
				<status.icon aria-hidden='true' className={cn("mt-0.5 size-4 shrink-0", status.className)} />
				<div className='flex min-w-0 flex-1 flex-col'>
					<span className='text-sm font-medium text-foreground'>{element.label}</span>
					{element.detail ? <span className='text-xs text-muted-foreground'>{element.detail}</span> : null}
					{element.status === "declined" && element.addressed ? (
						<span className='text-xs text-muted-foreground'>
							Declined by {element.addressed.by} · {formatTime(element.addressed.at)}
							{element.addressed.rationale ? ` · “${element.addressed.rationale}”` : null}
						</span>
					) : null}
				</div>
				<div className='flex shrink-0 flex-col items-end gap-0.5'>
					<span className={cn("text-xs font-medium", overdue ? "text-severity-critical" : "text-muted-foreground")}>
						{status.text}
					</span>
					{isOpen(element) && canAct && !declining ? (
						<Button
							variant='ghost'
							size='xs'
							className='-mr-2'
							aria-label={`Decline ${element.label}`}
							onClick={() => setDeclining(true)}
						>
							Decline
						</Button>
					) : null}
				</div>
			</div>
			{declining ? (
				<div className='pl-7'>
					<InlineForm
						submitLabel='Decline element'
						submitDisabled={!rationale.trim()}
						onCancel={() => setDeclining(false)}
						onSubmit={() => {
							onDecline(rationale.trim());
							setDeclining(false);
						}}
					>
						<div className='flex flex-col gap-1.5'>
							<Label htmlFor={`${id}-rationale`}>Why decline?</Label>
							<Textarea id={`${id}-rationale`} rows={2} value={rationale} onChange={(event) => setRationale(event.target.value)} />
						</div>
					</InlineForm>
				</div>
			) : null}
		</li>
	);
}

function ElementList({
	elements,
	now,
	canAct,
	onDecline,
	className,
}: {
	elements: SepsisElement[];
	now: number | null;
	canAct: boolean;
	onDecline: (elementId: string, rationale: string) => void;
	className?: string;
}) {
	return (
		<ul className={cn("flex flex-col divide-y divide-border-muted", className)}>
			{elements.map((element) => (
				<ElementRow
					key={element.id}
					element={element}
					now={now}
					canAct={canAct}
					onDecline={(rationale) => onDecline(element.id, rationale)}
				/>
			))}
		</ul>
	);
}

/** "3 of 4 addressed": done, declined and elapsed count; open elements don't. */
const addressedCount = (elements: SepsisElement[]) => elements.filter((element) => !isOpen(element)).length;

/** Reject needs a reason; an exclusion turns the rejection into an exclusion (PRD PD-080 Validation). */
function RejectForm({ onSubmit, onCancel }: { onSubmit: (action: Extract<SepsisAction, { type: "reject" }>) => void; onCancel: () => void }) {
	const id = React.useId();
	const [reason, setReason] = React.useState<string>();
	const [exclusion, setExclusion] = React.useState(noExclusion);
	const [note, setNote] = React.useState("");

	return (
		<InlineForm
			submitLabel={exclusion === noExclusion ? "Reject candidate" : "Exclude candidate"}
			submitDisabled={!reason}
			onCancel={onCancel}
			onSubmit={() =>
				reason && onSubmit({ type: "reject", reason, exclusion: exclusion === noExclusion ? undefined : exclusion, note })
			}
		>
			<fieldset className='flex flex-col gap-2'>
				<legend className='mb-2 text-xs font-semibold text-muted-foreground'>Reason</legend>
				<RadioGroup value={reason} onValueChange={setReason} className='grid gap-2'>
					{rejectReasons.map((option, index) => (
						<div key={option} className='flex items-center gap-2'>
							<RadioGroupItem id={`${id}-reason-${index}`} value={option} />
							<Label htmlFor={`${id}-reason-${index}`} className='font-normal'>
								{option}
							</Label>
						</div>
					))}
				</RadioGroup>
			</fieldset>
			<div className='flex flex-col gap-1.5'>
				<Label htmlFor={`${id}-exclusion`}>SEP-1 exclusion</Label>
				<Select value={exclusion} onValueChange={setExclusion}>
					<SelectTrigger id={`${id}-exclusion`} size='sm' className='w-full max-w-sm'>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={noExclusion}>No exclusion</SelectItem>
						{exclusions.map((option) => (
							<SelectItem key={option} value={option}>
								{option}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className='flex flex-col gap-1.5'>
				<Label htmlFor={`${id}-note`}>Note (optional)</Label>
				<Textarea id={`${id}-note`} rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
			</div>
		</InlineForm>
	);
}

/* -------------------------------------------------------------------------- */
/* SepsisSection                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The patient's sepsis screening or tracking (PRD PD-080): state with Validate and Reject, the criteria, the SEP-1
 * bundle and the hospital's protocol. Decisions are kept here for the prototype and reported through `onAction`.
 */
function SepsisSection({ sepsis, role = "intensivist", onAction, onOpenVirtualSepsis }: SepsisSectionProps) {
	const now = useCurrentMinute();
	const [state, setState] = React.useState(sepsis.state);
	const [decision, setDecision] = React.useState(sepsis.decision);
	const [rejecting, setRejecting] = React.useState(false);
	const [declined, setDeclined] = React.useState<Record<string, SepsisElement["addressed"]>>({});
	const canAct = role !== "rn";
	const stateLabel = stateLabels[state];
	const tracked = state === "candidate" || state === "tracking";

	// A declined element stays declined for the prototype, with "you" as who declined it.
	const withDeclines = <T extends SepsisElement>(elements: T[]): T[] =>
		elements.map((element) =>
			declined[element.id] ? { ...element, status: "declined" as const, addressed: declined[element.id] } : element,
		);
	const bundle = withDeclines(sepsis.bundle);
	const protocol = sepsis.hospitalProtocol
		? { ...sepsis.hospitalProtocol, elements: withDeclines(sepsis.hospitalProtocol.elements) }
		: undefined;
	const windows = (["3h", "6h"] as const).map((window) => ({
		window,
		title: window === "3h" ? "Within 3 hours" : "Within 6 hours",
		dueAt: new Date(Date.parse(sepsis.timeZero) + (window === "3h" ? 3 : 6) * 3_600_000).toISOString(),
		elements: bundle.filter((element) => element.window === window),
	}));
	const sirsMet = sepsis.sirs.filter((criterion) => criterion.status === "met").length;
	const organMet = sepsis.organDysfunction.filter((criterion) => criterion.status === "met").length;
	const overdue = [...bundle, ...(protocol?.elements ?? [])].filter((element) => isOverdue(element, now)).length;

	const decline = (elementId: string, rationale: string) => {
		setDeclined((current) => ({ ...current, [elementId]: { at: new Date().toISOString(), by: "you", rationale } }));
		onAction?.({ type: "decline-element", elementId, rationale });
	};

	return (
		<div className='@container'>
			<div className='grid gap-6 @min-[60rem]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]'>
				<SectionCard
					title='Sepsis screening'
					className='@min-[60rem]:col-span-2'
					action={
						<Button variant='outline' size='sm' onClick={onOpenVirtualSepsis}>
							<HeartCrackIcon aria-hidden='true' />
							Open in Virtual Sepsis
						</Button>
					}
				>
					<div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
						<Badge variant={stateLabel.variant} size='sm'>
							<span className='sr-only'>State: </span>
							{stateLabel.label}
						</Badge>
						<Badge variant='purple' size='xs'>
							<SparklesIcon aria-hidden='true' />
							AI · {sepsis.agent}
						</Badge>
						<span className='text-sm text-muted-foreground'>Flagged {formatTime(sepsis.flaggedAt)}</span>
						{overdue ? (
							<span className='inline-flex items-center gap-1 text-sm font-semibold text-severity-critical'>
								<TriangleAlertIcon aria-hidden='true' className='size-4' />
								{overdue} overdue
							</span>
						) : null}
					</div>

					<dl className='grid gap-x-6 gap-y-3 @min-[40rem]:grid-cols-3'>
						<div className='flex flex-col'>
							<dt className='text-xs text-muted-foreground'>Time zero{state === "candidate" ? " (proposed)" : ""}</dt>
							<dd className='text-sm text-foreground'>
								<span className='font-semibold tabular-nums'>{formatTime(sepsis.timeZero)}</span>
								{sepsis.timeZeroBasis ? <span className='block text-xs text-muted-foreground'>{sepsis.timeZeroBasis}</span> : null}
							</dd>
						</div>
						<div className='flex flex-col'>
							<dt className='text-xs text-muted-foreground'>SIRS</dt>
							<dd className='text-sm text-foreground'>
								<span className='font-semibold'>{sirsMet}</span> of {sepsis.sirs.length} met
							</dd>
						</div>
						<div className='flex flex-col'>
							<dt className='text-xs text-muted-foreground'>Organ dysfunction</dt>
							<dd className='text-sm text-foreground'>
								<span className='font-semibold'>{organMet}</span> of {sepsis.organDysfunction.length} met
							</dd>
						</div>
					</dl>

					{decision ? (
						<p className='flex items-start gap-1.5 text-sm text-muted-foreground'>
							{state === "tracking" ? (
								<CheckIcon aria-hidden='true' className='mt-0.5 size-4 shrink-0' />
							) : (
								<XIcon aria-hidden='true' className='mt-0.5 size-4 shrink-0' />
							)}
							<span>
								{state === "tracking" ? "Validated" : state === "excluded" ? "Excluded" : "Rejected"} by {decision.by} ·{" "}
								{formatTime(decision.at)}
								{decision.exclusion ? ` · ${decision.exclusion}` : decision.reason ? ` · ${decision.reason}` : null}
								{decision.note ? ` · “${decision.note}”` : null}
							</span>
						</p>
					) : null}

					{state === "candidate" ? (
						canAct ? (
							rejecting ? (
								<RejectForm
									onCancel={() => setRejecting(false)}
									onSubmit={(action) => {
										setState(action.exclusion ? "excluded" : "rejected");
										setDecision({
											at: new Date().toISOString(),
											by: "you",
											reason: action.reason,
											exclusion: action.exclusion,
											note: action.note || undefined,
										});
										setRejecting(false);
										onAction?.(action);
									}}
								/>
							) : (
								<div className='flex flex-wrap gap-2'>
									<Button
										size='sm'
										onClick={() => {
											setState("tracking");
											setDecision({ at: new Date().toISOString(), by: "you" });
											onAction?.({ type: "validate" });
										}}
									>
										<CheckIcon aria-hidden='true' />
										Validate
									</Button>
									<Button variant='outline' size='sm' onClick={() => setRejecting(true)}>
										<XIcon aria-hidden='true' />
										Reject
									</Button>
								</div>
							)
						) : (
							<p className='text-sm text-muted-foreground'>An intensivist or APP validates or rejects this candidate.</p>
						)
					) : null}

					<p className='flex items-center gap-1.5 text-xs text-muted-foreground'>
						<ShieldIcon aria-hidden='true' className='size-3.5' />
						{sepsis.agent} flags candidates. Clinicians decide.
					</p>
				</SectionCard>

				<SectionCard title='Criteria' meta='Updates as data arrives' className='self-start'>
					<CriteriaGroup title='SIRS' criteria={sepsis.sirs} now={now} />
					<CriteriaGroup title='Organ dysfunction' criteria={sepsis.organDysfunction} now={now} />
				</SectionCard>

				<SectionCard
					className='self-start'
					title='SEP-1 bundle'
					meta={tracked ? `From time zero ${formatTime(sepsis.timeZero)}` : undefined}
				>
					{tracked ? (
						<>
							{state === "candidate" ? (
								<p className='rounded-md bg-tone-accent-subtle px-3 py-2 text-xs text-tone-accent'>
									Provisional until the candidate is validated.
								</p>
							) : null}
							{windows.map(({ window, title, dueAt, elements }) => (
								<div key={window} className='flex flex-col'>
									<div className='flex items-baseline justify-between gap-3 border-b border-border-muted pb-1.5'>
										<h3 className='text-sm font-semibold text-foreground'>
											{title} <span className='font-normal text-muted-foreground'>· by {formatTime(dueAt)}</span>
										</h3>
										<p className='text-xs text-muted-foreground'>
											{addressedCount(elements)} of {elements.length} addressed
										</p>
									</div>
									<ElementList elements={elements} now={now} canAct={canAct} onDecline={decline} />
								</div>
							))}
						</>
					) : (
						<NoData>
							Bundle tracking stopped when the candidate was {state === "excluded" ? "excluded" : "rejected"}.
						</NoData>
					)}
				</SectionCard>

				{protocol ? (
					<SectionCard
						title={protocol.name}
						meta='Hospital protocol, apart from SEP-1'
						className='@min-[60rem]:col-span-2'
					>
						{tracked ? (
							<ElementList
								elements={protocol.elements}
								now={now}
								canAct={canAct}
								onDecline={decline}
								// Two columns of rows when there's room; each row keeps its own divider.
								className='@min-[60rem]:grid @min-[60rem]:grid-cols-2 @min-[60rem]:gap-x-8 @min-[60rem]:divide-y-0 @min-[60rem]:[&>li]:border-b @min-[60rem]:[&>li]:border-border-muted'
							/>
						) : (
							<NoData>Protocol tracking stopped with the candidate.</NoData>
						)}
					</SectionCard>
				) : null}
			</div>
		</div>
	);
}

export {
	SepsisSection,
	type SepsisAction,
	type SepsisBundleElement,
	type SepsisCase,
	type SepsisCriterion,
	type SepsisElement,
	type SepsisSectionProps,
	type SepsisState,
};
