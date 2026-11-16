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
import { MonitoringPanel, type MonitoringPatient } from "../monitoring/monitoring-panel";
import { worstOpenSeverity } from "../monitoring/triage-queue";
import { patientDetailsView, type PatientAction, type PatientRecord } from "../patient-details/patient-details";
import { AlertToasts, useClosedResolutions, type AlertNotice } from "../shared/alert-toasts";
import { withFlagDetails } from "../shared/flag-details";
import { useAddressedAlerts } from "../shared/live-feed";
import {
	CensusPanel,
	type CensusHospital,
	type CensusPanelProps,
	type CensusPatient,
	type CensusUser,
} from "./census-panel";

type CensusProps = Omit<InterceptLiveProps, "pages" | "defaultPage"> &
	CensusPanelProps & {
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
	};

/**
 * The Census screen of Intercept Live: every patient across the user's hospitals as cards, filtered by hospital,
 * assignment and quick view, with the live feed panel of their alerts. A card opens the patient's details over the
 * page. Figma origin: Intercept-Live › Census (1:350).
 */
function Census({
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
	onPathwayDecision,
	onTransferDecision,
	onDischargeDecision,
	onBundleDecision,
	onConsultChange,
	onConsultNote,
	notices,
	...shell
}: CensusProps) {
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
				Census: (
					<CensusPanel
						records={patientRecords}
						hospitals={hospitals}
						patients={flaggedPatients}
						onOpenPatient={onOpenPatient}
						alerts={alerts}
						escalationTargets={escalationTargets}
						onAlertAction={handleAlertAction}
						liveFeed={liveFeed}
						onOpenLiveFeed={onOpenLiveFeed}
						groupedView={groupedView}
					/>
				),
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
	Census,
	CensusPanel,
	type CensusHospital,
	type CensusPanelProps,
	type CensusPatient,
	type CensusProps,
	type CensusUser,
};
