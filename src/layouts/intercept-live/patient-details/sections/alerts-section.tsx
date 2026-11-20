import * as React from "react";
import { BellIcon, ChevronDownIcon, GitBranchIcon } from "lucide-react";
import { AnimatePresence, motion, type Variants } from "motion/react";

import { Button } from "@/components/buttons/button";
import { AlertBar } from "@/components/cards/patient-monitoring-card";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import {
	reducedMotionTransition,
	reorderSpring,
	revealVariants,
	rowRemoveVariants,
	useMotionPreference,
} from "@/lib/motion";
import { formatDayLabel } from "@/lib/relative-date";
import { cn } from "@/lib/utils";

import { alertSourceLabels, useAlertLifecycle } from "../../alert-panel/alert-panel";
import {
	compareTriageAlerts,
	isOpenAlert,
	lastFiredAt,
	sortAddressedAlerts,
	type TriageAlert,
	type TriageAlertAction,
} from "../../monitoring/triage-queue";
import { usePatientNavigation } from "../../patient-navigation";
import type { PatientDetailsProps } from "../patient-details";
import { formatTime } from "../section-parts";

// The patient's alerts (PRD PD-020): the list in the page's Alerts panel, which the patient header's View alerts opens
// (`PatientAlertsPanel` in `../consult-panels.tsx`; `patient-details.tsx` renders this in it). Not a tab: it was the
// Overview's until Nov 9, 2026, and left `patient-overview.tsx` for its own file on Nov 20, 2026. Each alert is a card
// with the alert modal's own lifecycle (`useAlertLifecycle`), so an action here is the same action there.

const HOUR = 60 * 60_000;

/** The alert list's default id. */
const alertsSectionId = "patient-overview-alerts";

// The alert panel's tones (UCL AlertModal): a pale fill, the title in the darkest step, the source a step lighter.
const alertTones = {
	critical: { panel: "bg-severity-critical-subtle", title: "text-severity-critical-strong", source: "text-severity-critical-prominent" },
	high: { panel: "bg-severity-high-subtle", title: "text-severity-high-strong", source: "text-severity-high-prominent" },
	medium: { panel: "bg-severity-medium-subtle", title: "text-severity-medium-strong", source: "text-severity-medium-prominent" },
	low: { panel: "bg-severity-low-subtle", title: "text-severity-low-strong", source: "text-severity-low-prominent" },
	resolved: { panel: "bg-badge-green", title: "text-foreground", source: "text-muted-foreground" },
} as const;

// Cards Reveal in and fade out while the others glide, as the triage queue's rows do; a fade under reduced motion.
const cardVariants: Variants = { ...revealVariants, exit: rowRemoveVariants.exit };
const reducedCardVariants: Variants = {
	initial: { opacity: 0 },
	animate: { opacity: 1, transition: reducedMotionTransition },
	exit: { opacity: 0, transition: reducedMotionTransition },
};

/** The day an alert fired, for the Alerts panel's history: "Today", "Yesterday", or "Saturday, Nov 7". */
const alertDayLabel = (firedAt: string, now: number | null) => formatDayLabel(firedAt, now ?? Date.now());

/**
 * One alert as the alert panel shows it (PRD PD-020): its bar (which opens the alert, with the consult, the pathway and
 * the messages), the reason and title, the source with Feedback for an AI alert, who did what, and the lifecycle
 * buttons with their forms. The same hook as the alert panel, so an action here is the same action there.
 */
function OverviewAlertCard({
	alert,
	inLast24h,
	escalationTargets,
	onAlertAction,
	onOpen,
	onTogglePathway,
	pathwayShown = false,
}: {
	alert: TriageAlert;
	inLast24h: number;
	escalationTargets: NonNullable<PatientDetailsProps["escalationTargets"]>;
	onAlertAction?: (alertId: string, action: TriageAlertAction) => void;
	onOpen?: () => void;
	/** The alert comes with a pathway: a resolved alert's card opens it (or closes it) in the page's Pathway panel. */
	onTogglePathway?: () => void;
	/** Its pathway is the one the Pathway panel shows. */
	pathwayShown?: boolean;
}) {
	const resolved = !isOpenAlert(alert);
	// Acknowledge, Escalate and Resolve in the row, as on the alert panel; no View pathway link under it since Nov 10,
	// 2026 (user's call; intercept.ds `alert-modal`): an open alert's pathway opens from the Overview's Care plan. A
	// resolved alert's whole card opens its pathway (Nov 9, 2026, user's call): nothing left to act on but its record.
	const opensPathway = resolved && onTogglePathway !== undefined;
	const lifecycle = useAlertLifecycle({
		alert,
		escalationTargets,
		onAction: onAlertAction ? (action) => onAlertAction(alert.id, action) : undefined,
	});
	const tones = alertTones[resolved ? "resolved" : alert.severity];
	const headingId = React.useId();

	return (
		<div
			role='group'
			aria-labelledby={headingId}
			className={cn(
				"relative flex flex-col gap-2 overflow-hidden rounded-xl pb-1.5",
				tones.panel,
			)}
		>
			{opensPathway ? (
				// The whole card's click target, under its own controls (Feedback, a form).
				<button
					type='button'
					aria-expanded={pathwayShown}
					aria-controls={pathwayShown ? "patient-pathway" : undefined}
					aria-label={`${pathwayShown ? "Hide" : "Show"} pathway: ${alert.reason ?? alert.title}`}
					onClick={onTogglePathway}
					// On hover, and while its pathway is open, the whole card darkens (Nov 9, 2026, user's call: no outline).
					className={cn(
						"absolute inset-0 z-[1] cursor-pointer rounded-xl outline-none transition-colors duration-160 hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset motion-reduce:transition-none",
						pathwayShown && "bg-foreground/5",
					)}
				/>
			) : null}
			<AlertBar
				alert={{
					variant: resolved ? "resolved" : alert.severity,
					inLast24h,
					since: resolved ? (alert.addressed?.at ?? alert.firedAt) : alert.firedAt,
				}}
				size='md'
				// A card that opens its pathway is one click target: its bar no longer opens the alert, so no maximize icon
				// (Nov 9, 2026, user's call). A resolved alert's bar doesn't open it either: nothing is left to do there (Nov 11,
				// 2026, user's call: "remove maximize icon and action").
				onOpen={opensPathway || resolved ? undefined : onOpen}
				header
			/>
			<div className='flex flex-col gap-2 px-4 pb-2.5'>
				{/* The reason leads; the alert's own title follows it, as in the alert panel. */}
				<div className='min-w-0'>
					<h3 id={headingId} className={cn("text-lg font-bold", tones.title)}>
						{alert.reason ?? alert.title}
					</h3>
					{alert.reason ? <p className={cn("text-sm", tones.title)}>{alert.title}</p> : null}
				</div>
				<div className='flex flex-col gap-0.5'>
					<div className={cn("flex items-start justify-between gap-3 text-sm", tones.source)}>
						<p className='flex items-start gap-1.5'>
							<span className='flex h-[1lh] shrink-0 items-center'>
								<GitBranchIcon aria-hidden='true' className='size-3' />
							</span>
							<span>
								Source: {alertSourceLabels[alert.source.kind]} · {alert.source.name}
							</span>
						</p>
						{lifecycle.feedbackNode ? (
							<div className='relative z-[2] flex h-[1lh] shrink-0 items-center'>{lifecycle.feedbackNode}</div>
						) : null}
					</div>
					{lifecycle.statusNode}
				</div>
				{/* Over the card's click target, so its own controls stay theirs. Empty (a resolved alert has no buttons, and
				    no form is open), they take no room: the column's 8px gap would otherwise leave the card's bottom 16px
				    taller than its sides (Nov 11, 2026, user's call: "the same as x-padding"). */}
				{lifecycle.alertActionsNode ? (
					<div className='relative z-[2] flex gap-2 empty:hidden'>{lifecycle.alertActionsNode}</div>
				) : null}
				{lifecycle.formNode ? <div className='relative z-[2] empty:hidden'>{lifecycle.formNode}</div> : null}
			</div>
		</div>
	);
}

/**
 * The patient's alerts (PRD PD-020, mandatory, PRD §3.4): every open one, highest severity first, then the ones addressed
 * this shift behind "Show resolved". With none open: "No active alerts · Last alert 2:14 PM" (MON-051).
 */
function AlertsSection({
	id = alertsSectionId,
	patientId,
	alerts: currentAlerts,
	history = [],
	escalationTargets,
	onAlertAction,
	allResolved = false,
	pathwayAlertIds = [],
	pathwayShownId,
	onTogglePathway,
	onAlertOpened,
}: {
	id?: string;
	patientId: string;
	alerts: TriageAlert[];
	/**
	 * Earlier alerts, all resolved (the record's history, and ones the feed resolved), listed with the resolved ones;
	 * one already in `alerts` shows once, as `alerts` has it.
	 */
	history?: TriageAlert[];
	escalationTargets: NonNullable<PatientDetailsProps["escalationTargets"]>;
	onAlertAction?: (alertId: string, action: TriageAlertAction) => void;
	/**
	 * Every alert at once, the unresolved first and the resolved under them, with no Show resolved (the page's Alerts
	 * panel, Nov 9, 2026, user's call: "unresolved at the top").
	 */
	allResolved?: boolean;
	/** Alerts that come with a pathway: their cards get Pathway, which calls `onTogglePathway` with the alert's id. */
	pathwayAlertIds?: string[];
	/** The alert whose pathway the Pathway panel shows. */
	pathwayShownId?: string;
	onTogglePathway?: (alertId: string) => void;
	/** Called after an alert's bar opens the alert modal (the page's Alerts panel closes then). */
	onAlertOpened?: (alertId: string) => void;
}) {
	const navigation = usePatientNavigation();
	const { prefersReducedMotion, resolve } = useMotionPreference();
	const [resolvedToggled, setShowResolved] = React.useState(false);
	const showResolved = allResolved || resolvedToggled;
	const now = useCurrentMinute();
	// Every alert the patient had: the current ones, then the history they don't already hold.
	const alerts = [...currentAlerts, ...history.filter((alert) => !currentAlerts.some((item) => item.id === alert.id))];
	const active = alerts.filter(isOpenAlert).sort(compareTriageAlerts);
	// In the Alerts panel, newest fired first, so they fall into their days; elsewhere, newest addressed first.
	const resolved = allResolved
		? alerts.filter((alert) => !isOpenAlert(alert)).sort((a, b) => b.firedAt.localeCompare(a.firedAt))
		: sortAddressedAlerts(alerts.filter((alert) => !isOpenAlert(alert)));
	const lastFired = lastFiredAt(alerts);
	const inLast24h = now === null ? alerts.length : alerts.filter((alert) => now - Date.parse(alert.firedAt) < 24 * HOUR).length;
	const shown = showResolved ? [...active, ...resolved] : active;
	const order = shown.map((alert) => alert.id).join();
	// With every alert listed (the Alerts panel), the resolved ones are grouped by the day they fired: "Today",
	// "Yesterday", "Saturday, Nov 7" (Nov 10, 2026, user's call: the history stays). A label goes before the first alert of
	// each day; the open alerts lead without one. The labels are LiveFeed's day headings: 14/20 semibold `foreground`.
	const dayLabels = new Map<string, string>();
	if (allResolved) {
		let previous: string | undefined;
		for (const alert of resolved) {
			const label = alertDayLabel(alert.firedAt, now);
			if (label !== previous) dayLabels.set(alert.id, label);
			previous = label;
		}
	}

	return (
		<section
			id={id}
			aria-label='Alerts'
			tabIndex={-1}
			className='flex scroll-mt-20 flex-col gap-3 outline-none'
		>
			{active.length ? null : (
				<p className='flex items-center gap-2 rounded-xl bg-background-subtle px-4 py-2.5 text-sm text-muted-foreground'>
					<BellIcon aria-hidden='true' className='size-4 shrink-0' />
					{lastFired ? `No active alerts · Last alert ${formatTime(lastFired)}` : "No active alerts"}
				</p>
			)}
			<AnimatePresence initial={false}>
				{shown.map((alert) => (
					<motion.div
						key={alert.id}
						className={cn(dayLabels.has(alert.id) && "flex flex-col gap-2")}
						layout='position'
						layoutDependency={order}
						variants={prefersReducedMotion ? reducedCardVariants : cardVariants}
						initial='initial'
						animate='animate'
						exit='exit'
						transition={{ layout: resolve(reorderSpring) }}
					>
						{dayLabels.has(alert.id) ? (
							<h3 className={cn("text-sm font-semibold text-foreground", alert !== shown[0] && "pt-2")}>
								{dayLabels.get(alert.id)}
							</h3>
						) : null}
						<OverviewAlertCard
							alert={alert}
							inLast24h={inLast24h}
							escalationTargets={escalationTargets}
							onAlertAction={onAlertAction}
							onOpen={
								navigation
									? () => {
											navigation.openAlert(patientId, alert.id);
											onAlertOpened?.(alert.id);
										}
									: undefined
							}
							onTogglePathway={
								onTogglePathway && pathwayAlertIds.includes(alert.id) ? () => onTogglePathway(alert.id) : undefined
							}
							pathwayShown={pathwayShownId === alert.id}
						/>
					</motion.div>
				))}
			</AnimatePresence>
			{resolved.length && !allResolved ? (
				<Button
					variant='ghost'
					size='xs'
					aria-expanded={showResolved}
					onClick={() => setShowResolved(!showResolved)}
					className='self-start text-link'
				>
					<ChevronDownIcon
						aria-hidden='true'
						className={cn("transition-transform duration-160 motion-reduce:transition-none", showResolved && "rotate-180")}
					/>
					{showResolved ? "Hide resolved" : `Show resolved (${resolved.length})`}
				</Button>
			) : null}
		</section>
	);
}

export { AlertsSection };
