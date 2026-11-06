import * as React from "react";

import {
	alertModalRenderer,
	withAlertFlags,
	type AlertConsultState,
	type AlertDetailData,
	type PatientConsultData,
} from "../alert-modal/alert-modal";
import type { CarePathwayDecision } from "../alert-modal/care-pathway";
import type { DischargeDecision } from "../alert-modal/discharge-plan";
import type { KeepOrTransferDecision } from "../alert-modal/keep-or-transfer";
import { CensusPanel, type CensusPatient } from "../census/census-panel";
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
		/** The census's patients. With them, the Sidebar's Census opens the Census page, with the same live feed. */
		censusPatients?: CensusPatient[];
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
		/** The alert modal's video consult rang, went live or ended, by alert. */
		onConsultChange?: (alertId: string, state: AlertConsultState, detail: AlertDetailData) => void;
		/** The AI Notetaker's draft of a consult, approved in the alert modal, by alert. */
		onConsultNote?: (alertId: string, note: string, detail: AlertDetailData) => void;
		/** Things to act on, each a toast unless its alert is open (Scenario 2's social needs; `AlertToasts`). */
		notices?: AlertNotice[];
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
	onConsultChange,
	onConsultNote,
	notices,
	...shell
}: MonitoringProps) {
	// Alert actions apply here, above the pages, so one taken on a patient's details shows on Monitoring and the Census.
	const { alerts, handleAlertAction } = useAddressedAlerts(alertsProp, onAlertAction);
	// Closing a Resolved toast resets that patient's Monitoring card to no alert.
	const { closedResolutions, closeResolved } = useClosedResolutions();
	// Each flag opens what it means and what's behind it now, from the patient's record.
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

	return (
		<InterceptLive
			{...shell}
			// The Sidebar's Monitoring shows the worst open alert, flashing, from any page.
			navAlerts={shell.navAlerts ?? { Monitoring: worstOpenSeverity(alerts) }}
			defaultPage={defaultPage}
			defaultPatient={defaultPatient}
			renderAlert={
				alertDetails
					? alertModalRenderer({
							details: alertDetails,
							consults: patientConsults,
							records: patientRecords,
							alerts,
							escalationTargets,
							onAlertAction: handleAlertAction,
							onPathwayDecision,
							onTransferDecision,
							onDischargeDecision,
							onConsultChange,
							onConsultNote,
						})
					: shell.renderAlert
			}
			renderPatientDetails={(patientId, stepper) =>
				patientDetailsView(patientId, stepper, {
					patients: flaggedCensusPatients,
					monitoringPatients: flaggedPatients,
					records: patientRecords,
					alerts,
					escalationTargets,
					onAlertAction: handleAlertAction,
					onAction: onPatientDetailsAction,
					onDischargeDecision,
					consults: patientConsults,
				})
			}
			pages={{
				Monitoring: (
					<MonitoringPanel
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
				Census: flaggedCensusPatients ? (
					<CensusPanel
						hospitals={hospitals}
						patients={flaggedCensusPatients}
						onOpenPatient={onOpenPatient}
						alerts={alerts}
						escalationTargets={escalationTargets}
						onAlertAction={handleAlertAction}
						liveFeed={liveFeed}
						onOpenLiveFeed={onOpenLiveFeed}
						groupedView={groupedView}
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
