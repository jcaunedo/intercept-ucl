import * as React from "react";
import { ChevronRightIcon } from "lucide-react";
import { AnimatePresence, motion, type Variants } from "motion/react";

import {
	enterTransition,
	exitTransition,
	motionDistance,
	reducedMotionTransition,
	standardTransition,
	useMotionPreference,
} from "@/lib/motion";

import {
	TriageQueue,
	type EscalationTarget,
	type TriageAlert,
	type TriageAlertAction,
	type TriageQueuePatient,
} from "../monitoring/triage-queue";
import { PagePanel, SidePanel, sidePanelWidth } from "../side-panel";

// The live feed, on the Census and Monitoring pages: the hospital bar's "Live feed: …" button, and the panel it opens
// right of the canvas, the triage queue of the page's alerts.

/* -------------------------------------------------------------------------- */
/* Alert actions                                                              */
/* -------------------------------------------------------------------------- */

const appliedAction = (action: TriageAlertAction): Pick<TriageAlert, "status" | "addressed"> => {
	const at = new Date().toISOString();
	switch (action.type) {
		case "acknowledge":
			return { status: "acknowledged", addressed: { at } };
		case "escalate":
			return { status: "escalated", addressed: { at, to: action.targetId, note: action.note || undefined } };
		case "resolve":
			return { status: "resolved", addressed: { at, reason: action.reason, note: action.note || undefined } };
		case "decline":
			return { status: "declined", addressed: { at, note: action.note || undefined } };
	}
};

/**
 * The page's alerts with the clinician's queue actions applied, so the prototype responds; an app gets the updated
 * alerts back from its API. Only the clinician's actions are kept here, over whatever alerts come in, so alerts that
 * change from outside (a live feed, the Live story) still flow through.
 */
function useAddressedAlerts(alertsProp: TriageAlert[], onAlertAction?: (alertId: string, action: TriageAlertAction) => void) {
	const [addressed, setAddressed] = React.useState<Record<string, Pick<TriageAlert, "status" | "addressed">>>({});
	const alerts = alertsProp.map((alert) => (addressed[alert.id] ? { ...alert, ...addressed[alert.id] } : alert));
	const handleAlertAction = (alertId: string, action: TriageAlertAction) => {
		setAddressed((current) => ({ ...current, [alertId]: appliedAction(action) }));
		onAlertAction?.(alertId, action);
	};
	return { alerts, handleAlertAction };
}

/* -------------------------------------------------------------------------- */
/* LiveFeed                                                                   */
/* -------------------------------------------------------------------------- */

// A ticker: the new change rises in from below while the last one rises out the top, both clipped to the line. The
// travel is more than the 20px line, so each clears it completely.
const feedVariants: Variants = {
	initial: { opacity: 0, y: motionDistance.medium },
	animate: { opacity: 1, y: 0, transition: enterTransition },
	exit: { opacity: 0, y: -motionDistance.medium, transition: exitTransition },
};

const reducedFeedVariants: Variants = {
	initial: { opacity: 0 },
	animate: { opacity: 1, transition: reducedMotionTransition },
	exit: { opacity: 0, transition: reducedMotionTransition },
};

/**
 * The hospital bar's live feed: "Live feed:" in `muted-foreground`, the latest change in medium `foreground`, then a
 * chevron (Intercept-Live Census `141:22191`); just "Live feed" before the first change. A button that opens and
 * closes the live feed panel, underlined on hover. Each new change rolls in like a ticker: it rises from below the
 * line as the last one rises out the top, at the same time. Both sit in one grid cell, right-aligned, so the leaving
 * one doesn't jump sideways; "Live feed:" glides to the new length. A near-instant cross-fade under reduced motion.
 * Truncates, with the full text in `title`.
 */
function LiveFeed({ change, open, onOpen }: { change?: string; open: boolean; onOpen: () => void }) {
	const { prefersReducedMotion, resolve } = useMotionPreference();

	return (
		<button
			type='button'
			onClick={onOpen}
			aria-expanded={open}
			aria-controls='live-feed'
			title={change ? `Live feed: ${change}` : undefined}
			className='group/feed flex min-w-0 cursor-pointer items-center gap-2 rounded-sm px-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'
		>
			<span className='flex min-w-0 items-center'>
				<motion.span
					layout='position'
					transition={resolve(standardTransition)}
					className='shrink-0 whitespace-pre text-muted-foreground group-hover/feed:underline'
				>
					{change ? "Live feed: " : "Live feed"}
				</motion.span>
				{change ? (
					<span className='grid min-w-0 grid-cols-[minmax(0,max-content)] overflow-hidden'>
						<AnimatePresence initial={false}>
							<motion.span
								key={change}
								variants={prefersReducedMotion ? reducedFeedVariants : feedVariants}
								initial='initial'
								animate='animate'
								exit='exit'
								className='col-start-1 row-start-1 min-w-0 max-w-full justify-self-end truncate font-medium group-hover/feed:underline'
							>
								{change}
							</motion.span>
						</AnimatePresence>
					</span>
				) : null}
			</span>
			<ChevronRightIcon aria-hidden='true' className='size-4 shrink-0 text-icon' />
		</button>
	);
}

/* -------------------------------------------------------------------------- */
/* LiveFeedPanel                                                              */
/* -------------------------------------------------------------------------- */

type LiveFeedPanelProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	alerts: TriageAlert[];
	patients: TriageQueuePatient[];
	escalationTargets: EscalationTarget[];
	onOpenPatient?: (patientId: string) => void;
	onAlertAction: (alertId: string, action: TriageAlertAction) => void;
};

/**
 * The live feed panel: the triage queue, right of the canvas in the shell's page panel slot, like the chat on the left.
 * Its width stays while the page is open.
 */
function LiveFeedPanel({
	open,
	onOpenChange,
	alerts,
	patients,
	escalationTargets,
	onOpenPatient,
	onAlertAction,
}: LiveFeedPanelProps) {
	const [width, setWidth] = React.useState<number>(sidePanelWidth.default);

	return (
		<PagePanel>
			<SidePanel
				id='live-feed'
				side='right'
				title='Live feed'
				open={open}
				onOpenChange={onOpenChange}
				width={width}
				onWidthChange={setWidth}
				className='border-l border-border bg-background-subtle'
			>
				<TriageQueue
					alerts={alerts}
					patients={patients}
					escalationTargets={escalationTargets}
					onOpenPatient={onOpenPatient}
					onAction={onAlertAction}
				/>
			</SidePanel>
		</PagePanel>
	);
}

export { LiveFeed, LiveFeedPanel, useAddressedAlerts, type LiveFeedPanelProps };
