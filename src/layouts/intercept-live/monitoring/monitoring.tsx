import * as React from "react";

import {
	alertPanelRenderer,
	withAlertFlags,
	type AlertConsultState,
	type AlertDetailData,
	type PatientConsultData,
} from "../alert-panel/alert-panel";
import type { CarePathwayDecision } from "../alert-panel/care-pathway";
import type { DischargeDecision } from "../alert-panel/discharge-plan";
import type { BundleDecision } from "../alert-panel/sepsis-bundle";
import type { KeepOrTransferDecision } from "../alert-panel/keep-or-transfer";
import { PatientsPanel, type CensusPatient } from "../patients/patients-panel";
import { AnalyticsPanel, type AnalyticsPanelProps } from "../analytics/analytics-panel";
import { InboxPanel, type InboxPanelProps } from "../inbox/inbox-panel";
import { PatientTonesProvider, usePatientToneStore } from "../shared/patient-tones";
import type { TransitionDecision } from "../patient-details/sections/transition-section";
import { MessagesPanel, unreadMessageCount, type MessagesPanelProps } from "../messages/messages-panel";
import { SchedulePanel, type SchedulePanelProps } from "../schedule/schedule-panel";
import { InterceptLive, type InterceptLivePage, type InterceptLiveProps, type OpenPatient } from "../intercept-live";
import { patientDetailsView, type PatientAction, type PatientRecord } from "../patient-details/patient-details";
import { AlertToasts, useClosedResolutions, type AlertNotice } from "../shared/alert-toasts";
import { withFlagDetails } from "../shared/flag-details";
import { useAddressedAlerts } from "../shared/live-feed";
import {
	MonitoringPanel,
	type EscalationTarget,
	type MonitoringHospital,
	type MonitoringPanelProps,
	type MonitoringPatient,
	type TriageAlert,
	type TriageAlertAction,
} from "./monitoring-panel";
import { worstOpenSeverity } from "./triage-queue";

type MonitoringProps = Omit<InterceptLiveProps, "pages" | "defaultPage"> &
	MonitoringPanelProps & {
		/** The census's patients. With them, the Sidebar's Patients opens the Census page's list, with the same live feed. */
		censusPatients?: CensusPatient[];
		/**
		 * The page shown first, Monitoring by default (the app's default page). The Sidebar switches between Monitoring,
		 * Patients and the pages that aren't built.
		 */
		defaultPage?: InterceptLivePage;
		/** What's known about each patient beyond the card, for their details page. A patient without one shows the card's. */
		patientRecords?: PatientRecord[];
		/** A patient's details opened first, over the default page. */
		defaultPatient?: OpenPatient;
		/** An action in a patient's details header (Look in, Message, Escalate…). */
		onPatientDetailsAction?: (patientId: string, action: PatientAction) => void;
		/**
		 * What each alert's modal shows by alert id. With them, a monitoring card's alert bar and an alert
		 * toast's maximize button open the alert modal; an alert without one opens the patient.
		 */
		alertDetails?: AlertDetailData[];
		/**
		 * Each patient's video consult without an alert: a card's Video consult opens it when the patient has no active
		 * alert (Nov 4, 2026, user's call). A patient without one opens their details.
		 */
		patientConsults?: PatientConsultData[];
		/** A pathway accepted, declined or written in the alert modal, by alert, with the alert's detail as opened. */
		onPathwayDecision?: (alertId: string, decision: CarePathwayDecision, detail: AlertDetailData) => void;
		/** Keep or transfer decided in the alert modal, by alert (Scenario 1, step 5). */
		onTransferDecision?: (alertId: string, decision: KeepOrTransferDecision, detail: AlertDetailData) => void;
		/**
		 * A discharge referral sent or skipped (Scenario 2, step 6), by patient, from the alert modal or the patient's
		 * Discharge section.
		 */
		onDischargeDecision?: (patientId: string, decision: DischargeDecision) => void;
		/** A primary-care handoff sent from a patient's Discharge section, by patient (Scenario 6). */
		onTransitionDecision?: (patientId: string, decision: TransitionDecision) => void;
		/** A sepsis bundle check (Scenario 3's renal dose review) confirmed or undone in the alert modal, by alert. */
		onBundleDecision?: (alertId: string, decision: BundleDecision) => void;
		/** The alert modal's video consult rang, went live or ended, by alert. */
		onConsultChange?: (alertId: string, state: AlertConsultState, detail: AlertDetailData) => void;
		/** The AI Notetaker's draft of a consult, approved in the alert modal, by alert. */
		onConsultNote?: (alertId: string, note: string, detail: AlertDetailData) => void;
		/** Things to act on, each a toast unless its alert is open (Scenario 2's social needs; `AlertToasts`). */
		notices?: AlertNotice[];
		/** The clinician's schedule. With it, the Sidebar's Schedule opens the calendar of their shifts and open shifts. */
		schedule?: Omit<SchedulePanelProps, "hospitals">;
		/** Every conversation, one per person at the hospitals. With them, the Sidebar's Messages opens the inbox (PRD Messages MSG-018). */
		messages?: Omit<MessagesPanelProps, "hospitals">;
		/**
		 * Work besides alerts (drafts to sign, suggested orders, failed write-backs, handed-over items). With it, the
		 * Sidebar's Inbox opens the queue, with this layout's alerts in it.
		 */
		inbox?: Pick<InboxPanelProps, "items" | "onItemAction">;
		/** The outcomes dashboard (PRD Outcomes dashboard). With it, the Sidebar's Analytics opens it. */
		analytics?: AnalyticsPanelProps;
	};

/**
 * The Monitoring screen of Intercept Live (the Tele-Critical Care Clinical Surveillance module): the clinician's panel
 * as live bedside monitors, filtered and sorted as on the Census, beside the triage queue of its alerts. Draft from PRD
 * Monitoring; not in Intercept-Live yet.
 */
function Monitoring({
	hospitals,
	patients,
	alerts: alertsProp = [],
	escalationTargets,
	onAlertAction,
	liveFeed,
	onOpenLiveFeed,
	groupedView,
	censusPatients,
	onOpenPatient,
	defaultPage,
	patientRecords,
	defaultPatient,
	onPatientDetailsAction,
	alertDetails,
	patientConsults,
	onPathwayDecision,
	onTransferDecision,
	onDischargeDecision,
	onTransitionDecision,
	onBundleDecision,
	onConsultChange,
	onConsultNote,
	notices,
	schedule,
	messages,
	inbox,
	analytics,
	...shell
}: MonitoringProps) {
	// Alert actions apply here, above the pages, so one taken on a patient's details shows on Monitoring and the Census.
	const { alerts, handleAlertAction } = useAddressedAlerts(alertsProp, onAlertAction);
	// Closing a Resolved toast resets that patient's Monitoring card to no alert.
	const { closedResolutions, closeResolved } = useClosedResolutions();
	// Each flag opens what it means and what's behind it now, from the patient's record.
	// One avatar color per patient on every page, toast and alert (`shared/patient-tones.tsx`): dealt over everyone the
	// layout knows, the directory and the monitors, and kept as patients come and go.
	const toneStore = usePatientToneStore(React.useMemo(() => [...(censusPatients ?? []), ...patients], [censusPatients, patients]));
	const flaggedPatients = React.useMemo(() => withFlagDetails(patients, patientRecords), [patients, patientRecords]);
	const flaggedCensusPatients = React.useMemo(
		() => censusPatients && withFlagDetails(censusPatients, patientRecords),
		[censusPatients, patientRecords],
	);
	// The cards show each open alert's flag first, as its alert panel does.
	const monitoringCards = React.useMemo(
		() => withAlertFlags(flaggedPatients, alerts, alertDetails),
		[flaggedPatients, alerts, alertDetails],
	);

	// Virtual Sepsis (Nov 13, 2026, user's calls: "identify the patients we have with sepsis", "use the monitoring card"):
	// Monitoring's cards, for the patients on sepsis watch (the census's flag) or with a sepsis case in their record,
	// with their alerts and only the hospitals they're at.
	const sepsis = React.useMemo(() => {
		const ids = new Set([
			...(censusPatients ?? []).filter((patient) => patient.sepsisWatch).map((patient) => patient.id),
			...(patientRecords ?? []).filter((record) => record.sepsis).map((record) => record.id),
		]);
		const cards = monitoringCards.filter((patient) => ids.has(patient.id));
		return {
			cards,
			alerts: alerts.filter((alert) => ids.has(alert.patientId)),
			hospitals: hospitals.filter((hospital) => cards.some((patient) => patient.hospitalId === hospital.id)),
		};
	}, [censusPatients, patientRecords, monitoringCards, alerts, hospitals]);

	// The conversations read, kept here above the pages, so the Sidebar's Messages dot follows them: it leaves once
	// nothing is unread (Nov 18, 2026, user's call), and reading survives leaving the Messages page.
	const [ownReadConversations, setReadConversations] = React.useState<ReadonlySet<string>>(() => new Set());
	const readConversations = messages?.readIds ?? ownReadConversations;
	const onReadConversation = messages?.onRead;
	const readConversation = React.useCallback(
		(id: string) => {
			setReadConversations((ids) => (ids.has(id) ? ids : new Set(ids).add(id)));
			onReadConversation?.(id);
		},
		[onReadConversation],
	);

	return (
		<PatientTonesProvider value={toneStore}>
			<InterceptLive
				{...shell}
				// With the conversations, the Sidebar's dot counts what's still unread in them; without, the app's number.
				unreadMessages={messages ? unreadMessageCount(messages.conversations, readConversations) : shell.unreadMessages}
				// For the flags whose popover leads to an alert's pathway (Fall risk's fall prevention pathway).
				alerts={alerts}
				// The Sidebar's Monitoring shows the worst open alert, flashing, from any page.
				navAlerts={shell.navAlerts ?? { Monitoring: worstOpenSeverity(alerts) }}
				defaultPage={defaultPage}
				defaultPatient={defaultPatient}
				renderAlert={
					alertDetails
						? alertPanelRenderer({
								details: alertDetails,
								consults: patientConsults,
								records: patientRecords,
								alerts,
								escalationTargets,
								onAlertAction: handleAlertAction,
								onPathwayDecision,
								onTransferDecision,
								onDischargeDecision,
								onBundleDecision,
								onConsultChange,
								onConsultNote,
							})
						: shell.renderAlert
				}
				renderPatientDetails={(patientId, stepper) =>
					patientDetailsView(patientId, stepper, {
						tones: toneStore.tones,
						patients: flaggedCensusPatients,
						monitoringPatients: flaggedPatients,
						records: patientRecords,
						alerts,
						escalationTargets,
						onAlertAction: handleAlertAction,
						onAction: onPatientDetailsAction,
						onDischargeDecision,
						onTransitionDecision,
						consults: patientConsults,
						// The alerts' pathways, on the patient's page too (its Pathway panel and Care plan).
						alertDetails,
						onPathwayDecision,
						onTransferDecision,
						onBundleDecision,
					})
				}
				pages={{
					Monitoring: (
						<MonitoringPanel
							records={patientRecords}
							hospitals={hospitals}
							patients={monitoringCards}
							alerts={alerts}
							escalationTargets={escalationTargets}
							onOpenPatient={onOpenPatient}
							onAlertAction={handleAlertAction}
							liveFeed={liveFeed}
							onOpenLiveFeed={onOpenLiveFeed}
							groupedView={groupedView}
							closedResolutions={closedResolutions}
						/>
					),
					"Virtual Sepsis": sepsis.cards.length ? (
						<MonitoringPanel
							records={patientRecords}
							hospitals={sepsis.hospitals}
							patients={sepsis.cards}
							alerts={sepsis.alerts}
							escalationTargets={escalationTargets}
							onOpenPatient={onOpenPatient}
							onAlertAction={handleAlertAction}
							liveFeed={liveFeed}
							onOpenLiveFeed={onOpenLiveFeed}
							groupedView={groupedView}
							closedResolutions={closedResolutions}
						/>
					) : undefined,
					Schedule: schedule ? <SchedulePanel hospitals={hospitals} {...schedule} /> : undefined,
					Messages: messages ? (
						<MessagesPanel hospitals={hospitals} {...messages} readIds={readConversations} onRead={readConversation} />
					) : undefined,
					// The same alerts as Monitoring's, so acknowledging one in the Inbox acknowledges it everywhere.
					Analytics: analytics ? <AnalyticsPanel {...analytics} /> : undefined,
					Inbox: inbox ? (
						<InboxPanel
							{...inbox}
							alerts={alerts}
							patients={[...(censusPatients ?? []), ...patients]}
							onAlertAction={handleAlertAction}
						/>
					) : undefined,
					Patients: flaggedCensusPatients ? (
						<PatientsPanel
							records={patientRecords}
							hospitals={hospitals}
							patients={flaggedCensusPatients}
							onOpenPatient={onOpenPatient}
						/>
					) : undefined,
				}}
			>
				{/* The feed's alerts, so the clinician's own actions don't toast. */}
				<AlertToasts
					alerts={alertsProp}
					patients={patients}
					onCloseResolved={closeResolved}
					notices={notices}
					// A discharged patient has left Monitoring; a notice about them names them from the directory (Scenario 6).
					noticePatients={censusPatients}
				/>
			</InterceptLive>
		</PatientTonesProvider>
	);
}

export {
	Monitoring,
	MonitoringPanel,
	type EscalationTarget,
	type MonitoringHospital,
	type MonitoringPanelProps,
	type MonitoringPatient,
	type MonitoringProps,
	type TriageAlert,
	type TriageAlertAction,
};
