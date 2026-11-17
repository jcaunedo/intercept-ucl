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
import { InterceptLive, type InterceptLivePage, type InterceptLiveProps, type OpenPatient } from "../intercept-live";
import { MonitoringPanel, type MonitoringPanelProps, type MonitoringPatient } from "../monitoring/monitoring-panel";
import { worstOpenSeverity } from "../monitoring/triage-queue";
import { InboxPanel, type InboxPanelProps } from "../inbox/inbox-panel";
import { MessagesPanel, type MessagesPanelProps } from "../messages/messages-panel";
import { SchedulePanel, type SchedulePanelProps } from "../schedule/schedule-panel";
import { patientDetailsView, type PatientAction, type PatientRecord } from "../patient-details/patient-details";
import { AlertToasts, useClosedResolutions, type AlertNotice } from "../shared/alert-toasts";
import { withFlagDetails } from "../shared/flag-details";
import { useAddressedAlerts } from "../shared/live-feed";
import {
	PatientsPanel,
	type CensusHospital,
	type PatientsPanelProps,
	type CensusPatient,
	type CensusUser,
} from "./patients-panel";

type PatientsProps = Omit<InterceptLiveProps, "pages" | "defaultPage"> &
	Omit<PatientsPanelProps, "records"> &
	// Monitoring's and the shell's: every alert (the triage queue, the cards' alerts, the toasts) and the live feed.
	Pick<MonitoringPanelProps, "alerts" | "escalationTargets" | "onAlertAction" | "liveFeed" | "onOpenLiveFeed" | "groupedView"> & {
		/**
		 * The panel's patients with their live values. With them, the Sidebar's Monitoring opens the Monitoring page, which
		 * takes the same `alerts` for its triage queue and its cards' alert pills.
		 */
		monitoringPatients?: MonitoringPatient[];
		/**
		 * The page shown first, Monitoring by default (the app's default page). The Sidebar switches between Monitoring, the
		 * Census and the pages that aren't built.
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
	};

/**
 * The Patients screen of Intercept Live (PRD Patients): the directory of every patient the clinician is authorized to
 * see, in hospital or not, as a table (default) or cards, to find a patient and open their record. The shell's other
 * pages (Monitoring, Inbox, Messages, Schedule) come with it. Figma origin: Intercept-Live › Census (1:350), redesigned
 * in code as a directory on Nov 17, 2026.
 */
function Patients({
	hospitals,
	patients,
	monitoringPatients,
	alerts: alertsProp = [],
	escalationTargets,
	onAlertAction,
	liveFeed,
	onOpenLiveFeed,
	groupedView,
	onOpenPatient,
	defaultPage,
	patientRecords,
	defaultPatient,
	onPatientDetailsAction,
	alertDetails,
	patientConsults,
	loading,
	loadError,
	onRetry,
	patientHref,
	onPathwayDecision,
	onTransferDecision,
	onDischargeDecision,
	onBundleDecision,
	onConsultChange,
	onConsultNote,
	notices,
	schedule,
	messages,
	inbox,
	...shell
}: PatientsProps) {
	// Alert actions apply here, above the pages, so one taken on a patient's details shows on the Census and Monitoring.
	const { alerts, handleAlertAction } = useAddressedAlerts(alertsProp, onAlertAction);
	// Closing a Resolved toast resets that patient's Monitoring card to no alert.
	const { closedResolutions, closeResolved } = useClosedResolutions();
	// Each flag opens what it means and what's behind it now, from the patient's record.
	const flaggedPatients = React.useMemo(() => withFlagDetails(patients, patientRecords), [patients, patientRecords]);
	const flaggedMonitoringPatients = React.useMemo(
		() => monitoringPatients && withFlagDetails(monitoringPatients, patientRecords),
		[monitoringPatients, patientRecords],
	);
	// Monitoring's cards show each open alert's flag first, as its alert panel does. The Census shows no alerts.
	const monitoringCards = React.useMemo(
		() => flaggedMonitoringPatients && withAlertFlags(flaggedMonitoringPatients, alerts, alertDetails),
		[flaggedMonitoringPatients, alerts, alertDetails],
	);

	return (
		<InterceptLive
			{...shell}
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
					patients: flaggedPatients,
					monitoringPatients: flaggedMonitoringPatients,
					records: patientRecords,
					alerts,
					escalationTargets,
					onAlertAction: handleAlertAction,
					onAction: onPatientDetailsAction,
					onDischargeDecision,
					consults: patientConsults,
					// The alerts' pathways, on the patient's page too (its Pathway panel and Care plan).
					alertDetails,
					onPathwayDecision,
					onTransferDecision,
					onBundleDecision,
				})
			}
			pages={{
				Patients: (
					<PatientsPanel
						records={patientRecords}
						hospitals={hospitals}
						patients={flaggedPatients}
						onOpenPatient={onOpenPatient}
						loading={loading}
						loadError={loadError}
						onRetry={onRetry}
						patientHref={patientHref}
					/>
				),
				Schedule: schedule ? <SchedulePanel hospitals={hospitals} {...schedule} /> : undefined,
				Messages: messages ? <MessagesPanel hospitals={hospitals} {...messages} /> : undefined,
				// The same alerts as Monitoring's, so acknowledging one in the Inbox acknowledges it everywhere.
				Inbox: inbox ? (
					<InboxPanel
						{...inbox}
						alerts={alerts}
						patients={[...patients, ...(monitoringPatients ?? [])]}
						onAlertAction={handleAlertAction}
					/>
				) : undefined,
				Monitoring: monitoringCards ? (
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
				) : undefined,
			}}
		>
			{/* The feed's alerts, so the clinician's own actions don't toast. */}
			<AlertToasts
				alerts={alertsProp}
				patients={patients}
				onCloseResolved={closeResolved}
				notices={notices}
			/>
		</InterceptLive>
	);
}

export {
	Patients,
	PatientsPanel,
	type CensusHospital,
	type PatientsPanelProps,
	type CensusPatient,
	type PatientsProps,
	type CensusUser,
};
