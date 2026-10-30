import * as React from "react";
import {
	ActivityIcon,
	ArrowUpRightIcon,
	CheckCheckIcon,
	CheckIcon,
	ChevronDownIcon,
	CircleCheckIcon,
	ClockIcon,
	ListChecksIcon,
	RepeatIcon,
	ServerIcon,
	SparklesIcon,
	UserRoundIcon,
	XIcon,
	type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, type Variants } from "motion/react";

import { Button } from "@/components/buttons/button";
import { PatientCardAlert, type PatientCardAcuityLevel, type PatientCardAlertStatus } from "@/components/cards/patient-card";
import { Badge } from "@/components/data-display/badge";
import { Counter } from "@/components/data-display/counter";
import { EmptyState } from "@/components/feedback/empty-state";
import { Label } from "@/components/forms/label";
import { RadioGroup, RadioGroupItem } from "@/components/forms/radio-group";
import { Textarea } from "@/components/forms/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/navigation/tabs";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import {
	expandVariants,
	reorderSpring,
	reducedMotionTransition,
	revealVariants,
	rowRemoveVariants,
	useExpandClip,
	useMotionPreference,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

// The Monitoring page's triage queue (PRD Monitoring MON-020–MON-023): every active alert on the panel in one list,
// highest priority first, with the actions that address it. Draft, ahead of Figma: intercept.ds has no queue yet.

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

type TriageAlertSeverity = "critical" | "high" | "medium" | "low";

/** Where the alert is in its lifecycle (PRD PC-071). Resolved and declined alerts leave the queue for its history. */
type TriageAlertStatus = PatientCardAlertStatus | "resolved" | "declined";

type TriageAlertSource = {
	/** AI agent, device, threshold rule, a clinician's concern (Clinician Intuition Alert) or the platform. */
	kind: "ai" | "device" | "rule" | "manual" | "system";
	/** The agent, device or rule, e.g. "Sepsis Sniffer", "Monitor"; for a concern, the clinician who raised it. */
	name: string;
};

type TriageAlert = {
	id: string;
	patientId: string;
	severity: TriageAlertSeverity;
	title: string;
	/** Why it matters for this patient, in a few words, e.g. "Rising work of breathing, positive fluid balance, HFrEF". */
	reason?: string;
	source: TriageAlertSource;
	/** When it fired, ISO 8601. */
	firedAt: string;
	/** Its response target from Clinical Alerting, ISO 8601. Past it, an active alert shows Overdue (PRD OD-15). */
	respondBy?: string;
	/** Defaults to `active`. */
	status?: TriageAlertStatus;
	/** An AI agent's alert: what it recommends, and the evidence behind it (PRD MON-023). */
	recommendation?: string;
	evidence?: string[];
	/** A clinician concern's rationale. */
	rationale?: string;
	/** Raised on an earlier shift and handed over (PRD MON-UC-06). */
	carriedOver?: boolean;
	/** When the signed-in clinician addressed it, ISO 8601, and the details of what they did. */
	addressed?: { at: string; to?: string; reason?: string; note?: string };
};

/** Someone an alert can be escalated to (PRD MON-040). */
type EscalationTarget = { id: string; name: string; description: string };

/** What the clinician did to an alert. The app sends it to Clinical Alerting, which records who and when. */
type TriageAlertAction =
	| { type: "acknowledge" }
	| { type: "escalate"; targetId: string; note: string }
	| { type: "resolve"; reason: string; note: string }
	| { type: "decline"; note: string };

/** The patient details a row shows. */
type TriageQueuePatient = {
	id: string;
	lastName: string;
	firstName: string;
	hospital?: string;
	unit?: string;
	bed?: string;
	/** The patient's acuity band and its 4 h change, which rank alerts of the same severity (DU-09). */
	acuity?: { level?: PatientCardAcuityLevel };
	scoreChange4h?: number;
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

const severityOrder: TriageAlertSeverity[] = ["critical", "high", "medium", "low"];

const sources: Record<TriageAlertSource["kind"], { label: string; icon: LucideIcon }> = {
	ai: { label: "AI", icon: SparklesIcon },
	device: { label: "Device", icon: ActivityIcon },
	rule: { label: "Rule", icon: ListChecksIcon },
	manual: { label: "Clinician concern", icon: UserRoundIcon },
	system: { label: "System", icon: ServerIcon },
};

// Why an alert is resolved (PRD MON-022: resolving requires one).
const resolutionReasons = ["Treated", "Artifact or false alarm", "Expected for this patient", "Duplicate"];

/** Resolved and declined alerts leave the queue. */
const isOpenAlert = (alert: TriageAlert) => alert.status !== "resolved" && alert.status !== "declined";

/** Queue order (PRD MON-021): severity first, then oldest first within a severity. */
const compareTriageAlerts = (a: TriageAlert, b: TriageAlert) =>
	severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity) || a.firedAt.localeCompare(b.firedAt);

// Acuity bands, sickest first. Unknown and a patient without a score rank last.
const acuityBandOrder: PatientCardAcuityLevel[] = ["critical", "high", "medium", "moderate", "low"];
const bandRank = (patient?: TriageQueuePatient) => {
	const index = acuityBandOrder.indexOf(patient?.acuity?.level ?? "unknown");
	return index === -1 ? acuityBandOrder.length : index;
};

/**
 * The work list's order (DU-09): severity, then the patient's acuity band, then the larger rise in their score over
 * 4 h, then oldest first. A patient whose score jumps outranks one whose score is high but steady.
 */
const rankTriageAlerts = (patients: TriageQueuePatient[]) => {
	const byId = new Map(patients.map((patient) => [patient.id, patient]));
	return (a: TriageAlert, b: TriageAlert) => {
		const left = byId.get(a.patientId);
		const right = byId.get(b.patientId);
		return (
			severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity) ||
			bandRank(left) - bandRank(right) ||
			(right?.scoreChange4h ?? 0) - (left?.scoreChange4h ?? 0) ||
			a.firedAt.localeCompare(b.firedAt)
		);
	};
};

/** Addressed alerts, most recently addressed first. */
const sortAddressedAlerts = (alerts: TriageAlert[]) =>
	[...alerts].sort((a, b) => (b.addressed?.at ?? "").localeCompare(a.addressed?.at ?? ""));

/** When the latest of the alerts fired, for "No active alerts · Last alert 14:22" (PRD SV-051). */
const lastFiredAt = (alerts: TriageAlert[]) =>
	alerts.reduce<string | undefined>((latest, alert) => (!latest || alert.firedAt > latest ? alert.firedAt : latest), undefined);

const formatTime = (iso: string) =>
	new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/** "just now", "4 min", "2 h 12 min". */
function formatAge(from: string, now: number) {
	const minutes = Math.max(0, Math.floor((now - Date.parse(from)) / 60_000));
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes} min`;
	return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

/** The line that says who did what, and when. */
function stateLine(alert: TriageAlert, targets: EscalationTarget[]) {
	const at = alert.addressed ? formatTime(alert.addressed.at) : "";
	switch (alert.status) {
		case "acknowledged":
			return { icon: CheckIcon, text: `Acknowledged by you · ${at}` };
		case "escalated": {
			const to = targets.find((target) => target.id === alert.addressed?.to)?.name ?? alert.addressed?.to;
			return { icon: ArrowUpRightIcon, text: `Escalated to ${to} by you · ${at}` };
		}
		case "resolved":
			return { icon: CheckCheckIcon, text: `Resolved by you · ${at} · ${alert.addressed?.reason}` };
		case "declined":
			return { icon: XIcon, text: `${alert.addressed?.note ? "Declined with rationale" : "Declined"} by you · ${at}` };
		default:
			return alert.source.kind === "manual"
				? { icon: UserRoundIcon, text: `Raised by ${alert.source.name} · ${formatTime(alert.firedAt)}` }
				: undefined;
	}
}

/* -------------------------------------------------------------------------- */
/* Forms                                                                      */
/* -------------------------------------------------------------------------- */

/** An inline form under a row's actions, opening in place (Expand pattern). */
function RowForm({
	onSubmit,
	submitLabel,
	submitDisabled,
	onCancel,
	children,
}: {
	onSubmit: () => void;
	submitLabel: string;
	submitDisabled?: boolean;
	onCancel: () => void;
	children: React.ReactNode;
}) {
	const { prefersReducedMotion } = useMotionPreference();
	const clip = useExpandClip<HTMLFormElement>();

	return (
		<motion.form
			{...clip}
			variants={prefersReducedMotion ? reducedRowVariants : expandVariants}
			initial='initial'
			animate='animate'
			exit='exit'
			onSubmit={(event) => {
				event.preventDefault();
				if (!submitDisabled) onSubmit();
			}}
		>
			<div className='flex flex-col gap-3 border-t border-border-muted pt-3'>
				{children}
				<div className='flex justify-end gap-2'>
					<Button type='button' variant='ghost' size='sm' onClick={onCancel}>
						Cancel
					</Button>
					<Button type='submit' size='sm' disabled={submitDisabled}>
						{submitLabel}
					</Button>
				</div>
			</div>
		</motion.form>
	);
}

function NoteField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
	return (
		<div className='flex flex-col gap-1.5'>
			<Label htmlFor={id}>{label}</Label>
			<Textarea id={id} rows={2} value={value} onChange={(event) => onChange(event.target.value)} />
		</div>
	);
}

/** Resolve needs a reason; declining an AI recommendation takes an optional rationale (PRD MON-022, MON-023). */
function ResolveForm({
	alert,
	onAction,
	onCancel,
}: {
	alert: TriageAlert;
	onAction: (action: TriageAlertAction) => void;
	onCancel: () => void;
}) {
	const id = React.useId();
	const [reason, setReason] = React.useState<string>();
	const [note, setNote] = React.useState("");
	const ai = alert.source.kind === "ai";

	if (ai) {
		return (
			<RowForm submitLabel='Decline recommendation' onCancel={onCancel} onSubmit={() => onAction({ type: "decline", note })}>
				<NoteField id={`${id}-note`} label='Why decline? (optional)' value={note} onChange={setNote} />
			</RowForm>
		);
	}

	return (
		<RowForm
			submitLabel='Resolve alert'
			submitDisabled={!reason}
			onCancel={onCancel}
			onSubmit={() => reason && onAction({ type: "resolve", reason, note })}
		>
			<fieldset className='flex flex-col gap-2'>
				<legend className='mb-2 text-xs font-semibold text-muted-foreground'>Resolution</legend>
				<RadioGroup value={reason} onValueChange={setReason} className='grid gap-2'>
					{resolutionReasons.map((option, index) => (
						<div key={option} className='flex items-center gap-2'>
							<RadioGroupItem id={`${id}-reason-${index}`} value={option} />
							<Label htmlFor={`${id}-reason-${index}`} className='font-normal'>
								{option}
							</Label>
						</div>
					))}
				</RadioGroup>
			</fieldset>
			<NoteField id={`${id}-note`} label='Note (optional)' value={note} onChange={setNote} />
		</RowForm>
	);
}

/** Who to escalate to, and a note. The alert travels with it (PRD MON-040). */
function EscalateForm({
	targets,
	onAction,
	onCancel,
}: {
	targets: EscalationTarget[];
	onAction: (action: TriageAlertAction) => void;
	onCancel: () => void;
}) {
	const id = React.useId();
	const [targetId, setTargetId] = React.useState(targets[0]?.id);
	const [note, setNote] = React.useState("");

	return (
		<RowForm
			submitLabel='Escalate'
			submitDisabled={!targetId}
			onCancel={onCancel}
			onSubmit={() => targetId && onAction({ type: "escalate", targetId, note })}
		>
			<fieldset className='flex flex-col gap-2'>
				<legend className='mb-2 text-xs font-semibold text-muted-foreground'>Send to</legend>
				<RadioGroup value={targetId} onValueChange={setTargetId} className='grid gap-3'>
					{targets.map((target) => (
						<div key={target.id} className='flex items-start gap-2'>
							<RadioGroupItem id={`${id}-${target.id}`} value={target.id} className='mt-0.5' />
							<Label htmlFor={`${id}-${target.id}`} className='flex flex-col items-start gap-0'>
								<span>{target.name}</span>
								<span className='text-xs font-normal text-muted-foreground'>{target.description}</span>
							</Label>
						</div>
					))}
				</RadioGroup>
			</fieldset>
			<NoteField id={`${id}-note`} label='Note (optional)' value={note} onChange={setNote} />
		</RowForm>
	);
}

/* -------------------------------------------------------------------------- */
/* Row                                                                        */
/* -------------------------------------------------------------------------- */

// Rows Reveal in at their place and fade out (Dismiss for list rows) while the others glide. Under reduced motion they
// still fade, at once.
const rowVariants: Variants = { ...revealVariants, exit: rowRemoveVariants.exit };
const reducedRowVariants: Variants = {
	initial: { opacity: 0 },
	animate: { opacity: 1, transition: reducedMotionTransition },
	exit: { opacity: 0, transition: reducedMotionTransition },
};

type OpenForm = { alertId: string; kind: "resolve" | "escalate" } | null;

function TriageQueueRow({
	alert,
	patient,
	now,
	targets,
	form,
	onFormChange,
	onOpenPatient,
	onAction,
	order,
	ref,
}: {
	alert: TriageAlert;
	patient?: TriageQueuePatient;
	now: number | null;
	targets: EscalationTarget[];
	form: OpenForm;
	onFormChange: (form: OpenForm) => void;
	onOpenPatient?: (patientId: string) => void;
	onAction: (alertId: string, action: TriageAlertAction) => void;
	/** The list's order (its alert ids). The row glides only when it changes, not when the panel is resized. */
	order: string;
	ref?: React.Ref<HTMLLIElement>;
}) {
	const { prefersReducedMotion, resolve } = useMotionPreference();
	const [evidenceOpen, setEvidenceOpen] = React.useState(false);
	const status = alert.status ?? "active";
	const open = isOpenAlert(alert);
	const ai = alert.source.kind === "ai";
	const source = sources[alert.source.kind];
	const SourceIcon = source.icon;
	const overdue = status === "active" && alert.respondBy && now !== null && now > Date.parse(alert.respondBy);
	const state = stateLine(alert, targets);
	const formKind = form?.alertId === alert.id ? form.kind : null;
	const act = (action: TriageAlertAction) => {
		onFormChange(null);
		onAction(alert.id, action);
	};
	const location = patient ? [patient.unit, patient.bed, patient.hospital].filter(Boolean).join(" · ") : "";

	return (
		<motion.li
			ref={ref}
			layout='position'
			layoutDependency={order}
			variants={prefersReducedMotion ? reducedRowVariants : rowVariants}
			initial='initial'
			animate='animate'
			exit='exit'
			transition={{ layout: resolve(reorderSpring) }}
			data-severity={alert.severity}
			data-status={status}
			// An AI agent's alert is a recommendation, never a fact (PRD MON-023): a dashed border sets it apart.
			className={cn(
				"flex flex-col gap-2 rounded-lg border bg-card px-3 py-2.5",
				ai ? "border-dashed border-badge-purple-foreground/50" : "border-border",
			)}
		>
			<div className='flex items-start gap-2'>
				<PatientCardAlert variant={alert.severity} className='py-1 text-xs' />
				<p className='min-w-0 flex-1 pt-0.5 text-sm font-semibold text-foreground'>{alert.title}</p>
				{now !== null ? (
					<span className='shrink-0 pt-1 text-xs text-muted-foreground tabular-nums'>
						<span className='sr-only'>Fired </span>
						{formatAge(alert.firedAt, now)}
						{formatAge(alert.firedAt, now) === "just now" ? null : <span className='sr-only'> ago</span>}
					</span>
				) : null}
			</div>
			{alert.reason ? (
				<p className='-mt-1 text-sm text-foreground'>
					<span className='sr-only'>Reason: </span>
					{alert.reason}
				</p>
			) : null}

			{patient ? (
				<p className='text-sm'>
					{onOpenPatient ? (
						<button
							type='button'
							onClick={() => onOpenPatient(patient.id)}
							className='rounded-sm text-left font-semibold text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring'
						>
							{patient.lastName}, {patient.firstName}
						</button>
					) : (
						<span className='font-semibold text-foreground'>
							{patient.lastName}, {patient.firstName}
						</span>
					)}
					{location ? <span className='text-muted-foreground'> · {location}</span> : null}
				</p>
			) : null}

			<div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
				<Badge variant={ai ? "purple" : "outline"} size='xs'>
					<SourceIcon aria-hidden='true' />
					<span className='sr-only'>Source: </span>
					{alert.source.kind === "manual" ? source.label : `${source.label} · ${alert.source.name}`}
				</Badge>
				{open && overdue ? (
					<span className='inline-flex items-center gap-1 text-xs font-semibold text-foreground'>
						<ClockIcon aria-hidden='true' className='size-3' />
						Overdue
					</span>
				) : null}
				{alert.carriedOver ? (
					<span className='inline-flex items-center gap-1 text-xs text-muted-foreground'>
						<RepeatIcon aria-hidden='true' className='size-3' />
						Carried over from last shift
					</span>
				) : null}
			</div>

			{alert.recommendation ? (
				<p className='text-sm text-badge-purple-foreground'>Recommendation: {alert.recommendation}</p>
			) : null}
			{alert.evidence?.length ? (
				<div className='flex flex-col items-start gap-1.5'>
					<Button
						variant='ghost'
						size='xs'
						aria-expanded={evidenceOpen}
						onClick={() => setEvidenceOpen(!evidenceOpen)}
						className='-ml-2 text-link'
					>
						<ChevronDownIcon
							aria-hidden='true'
							className={cn("transition-transform duration-160 motion-reduce:transition-none", evidenceOpen && "rotate-180")}
						/>
						{evidenceOpen ? "Hide evidence" : "Show evidence"}
					</Button>
					{evidenceOpen ? (
						<ul className='w-full list-disc rounded-sm bg-background-subtle py-2 pr-3 pl-7 text-sm'>
							{alert.evidence.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
					) : null}
				</div>
			) : null}
			{alert.rationale ? <p className='text-sm text-foreground'>“{alert.rationale}”</p> : null}
			{state ? (
				<p className='flex items-start gap-1 text-xs text-muted-foreground'>
					<state.icon aria-hidden='true' className='mt-0.5 size-3 shrink-0' />
					<span>
						{state.text}
						{alert.addressed?.note ? ` · “${alert.addressed.note}”` : null}
					</span>
				</p>
			) : null}

			{open ? (
				<>
					{formKind ? null : (
						<div className='flex flex-wrap gap-1'>
							{onOpenPatient ? (
								<Button variant='outline' size='xs' onClick={() => onOpenPatient(alert.patientId)}>
									Open
								</Button>
							) : null}
							{status === "active" ? (
								<Button variant='ghost' size='xs' onClick={() => act({ type: "acknowledge" })}>
									<CheckIcon aria-hidden='true' />
									Acknowledge
								</Button>
							) : null}
							{status !== "escalated" && targets.length ? (
								<Button variant='ghost' size='xs' onClick={() => onFormChange({ alertId: alert.id, kind: "escalate" })}>
									<ArrowUpRightIcon aria-hidden='true' />
									Escalate
								</Button>
							) : null}
							<Button variant='ghost' size='xs' onClick={() => onFormChange({ alertId: alert.id, kind: "resolve" })}>
								{ai ? <XIcon aria-hidden='true' /> : <CheckCheckIcon aria-hidden='true' />}
								{ai ? "Decline" : "Resolve"}
							</Button>
						</div>
					)}
					<AnimatePresence initial={false}>
						{formKind === "resolve" ? (
							<ResolveForm key='resolve' alert={alert} onAction={act} onCancel={() => onFormChange(null)} />
						) : formKind === "escalate" ? (
							<EscalateForm key='escalate' targets={targets} onAction={act} onCancel={() => onFormChange(null)} />
						) : null}
					</AnimatePresence>
				</>
			) : null}
		</motion.li>
	);
}

/* -------------------------------------------------------------------------- */
/* TriageAlertList                                                            */
/* -------------------------------------------------------------------------- */

type TriageQueueProps = {
	alerts: TriageAlert[];
	patients: TriageQueuePatient[];
	escalationTargets: EscalationTarget[];
	onOpenPatient?: (patientId: string) => void;
	onAction: (alertId: string, action: TriageAlertAction) => void;
};

/**
 * The panel's alerts, highest priority first (PRD Monitoring MON-020–MON-023): Active, and Resolved for the alerts
 * The queue's rows, in the order given, without its tabs: for a page that shows one patient's alerts in its own
 * container (Patient details). One row's form is open at a time.
 */
function TriageAlertList({ alerts, patients, escalationTargets, onOpenPatient, onAction }: TriageQueueProps) {
	const now = useCurrentMinute();
	const [form, setForm] = React.useState<OpenForm>(null);
	const order = alerts.map((alert) => alert.id).join();

	return (
		// popLayout takes a leaving row out of the flow at once (the list is `relative` for it), so the rest glide up.
		<ul className='relative flex flex-col gap-2'>
			<AnimatePresence initial={false} mode='popLayout'>
				{alerts.map((alert) => (
					<TriageQueueRow
						key={alert.id}
						order={order}
						alert={alert}
						patient={patients.find((patient) => patient.id === alert.patientId)}
						now={now}
						targets={escalationTargets}
						form={form}
						onFormChange={setForm}
						onOpenPatient={onOpenPatient}
						onAction={onAction}
					/>
				))}
			</AnimatePresence>
		</ul>
	);
}

/* -------------------------------------------------------------------------- */
/* TriageQueue                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The panel's alerts, highest priority first (PRD Monitoring SV-020–SV-023; ranked as `rankTriageAlerts`): Active, and Resolved for the alerts
 * addressed this shift. Each row opens the patient, and acknowledges, escalates and resolves (or declines an AI
 * recommendation) in place. Fills the side panel it sits in (the Monitoring live feed panel), each tab scrolling on
 * its own.
 */
function TriageQueue({ alerts, patients, escalationTargets, onOpenPatient, onAction }: TriageQueueProps) {
	const [tab, setTab] = React.useState("active");
	const active = alerts.filter(isOpenAlert).sort(rankTriageAlerts(patients));
	const history = sortAddressedAlerts(alerts.filter((alert) => !isOpenAlert(alert)));
	const lastFired = lastFiredAt(alerts);

	const list = (items: TriageAlert[]) => (
		<TriageAlertList
			alerts={items}
			patients={patients}
			escalationTargets={escalationTargets}
			onOpenPatient={onOpenPatient}
			onAction={onAction}
		/>
	);

	return (
		<Tabs value={tab} onValueChange={setTab} className='flex min-h-0 flex-1 flex-col gap-0'>
			<div className='border-b border-border px-4 pb-3'>
				<TabsList className='w-full' aria-label='Alerts'>
					<TabsTrigger value='active' className='flex-1'>
						Active
						<Counter variant='neutral' count={active.length} />
					</TabsTrigger>
					<TabsTrigger value='resolved' className='flex-1'>
						Resolved
						<Counter variant='neutral' count={history.length} />
					</TabsTrigger>
				</TabsList>
			</div>
			<TabsContent value='active' className='scrollbar-soft min-h-0 flex-1 overflow-y-auto p-3'>
				{active.length ? (
					list(active)
				) : (
					<EmptyState
						className='py-12'
						headingLevel='h3'
						icon={<CircleCheckIcon aria-hidden='true' />}
						title='No active alerts'
						description={lastFired ? `Last alert at ${formatTime(lastFired)}.` : "New alerts for your panel will appear here."}
					/>
				)}
			</TabsContent>
			<TabsContent value='resolved' className='scrollbar-soft min-h-0 flex-1 overflow-y-auto p-3'>
				{history.length ? (
					list(history)
				) : (
					<EmptyState
						className='py-12'
						headingLevel='h3'
						title='Nothing resolved yet'
						description='Alerts you resolve or decline stay here for the shift.'
					/>
				)}
			</TabsContent>
		</Tabs>
	);
}

export {
	compareTriageAlerts,
	isOpenAlert,
	lastFiredAt,
	rankTriageAlerts,
	sortAddressedAlerts,
	TriageAlertList,
	TriageQueue,
	type EscalationTarget,
	type TriageAlert,
	type TriageAlertAction,
	type TriageAlertSeverity,
	type TriageAlertSource,
	type TriageAlertStatus,
	type TriageQueuePatient,
	type TriageQueueProps,
};
