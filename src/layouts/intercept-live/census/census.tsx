import { alertModalRenderer, type AlertDetailData } from "../alert-detail/alert-detail";
import type { CarePathwayDecision } from "../alert-detail/care-pathway";
import type { KeepOrTransferDecision } from "../alert-detail/keep-or-transfer";
import { InterceptLive, type InterceptLivePage, type InterceptLiveProps, type OpenPatient } from "../intercept-live";
import { MonitoringPanel, type MonitoringPatient } from "../monitoring/monitoring-panel";
import { worstOpenSeverity } from "../monitoring/triage-queue";
import { patientDetailsView, type PatientAction, type PatientRecord } from "../patient-details/patient-details";
import { AlertToasts, useClosedResolutions } from "../shared/alert-toasts";
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
		/** A pathway accepted, declined or written in the alert modal, by alert. */
		onPathwayDecision?: (alertId: string, decision: CarePathwayDecision) => void;
		/** Keep or transfer decided in the alert modal, by alert (Scenario 1, step 5). */
		onTransferDecision?: (alertId: string, decision: KeepOrTransferDecision) => void;
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
	onPathwayDecision,
	onTransferDecision,
	...shell
}: CensusProps) {
	// Alert actions apply here, above the pages, so one taken on a patient's details shows on the Census and Monitoring.
	const { alerts, handleAlertAction } = useAddressedAlerts(alertsProp, onAlertAction);
	// Closing a Resolved toast resets that patient's Monitoring card to no alert.
	const { closedResolutions, closeResolved } = useClosedResolutions();

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
							alerts,
							escalationTargets,
							onAlertAction: handleAlertAction,
							onPathwayDecision,
							onTransferDecision,
						})
					: shell.renderAlert
			}
			renderPatientDetails={(patientId, stepper) =>
				patientDetailsView(patientId, stepper, {
					patients,
					monitoringPatients,
					records: patientRecords,
					alerts,
					escalationTargets,
					onAlertAction: handleAlertAction,
					onAction: onPatientDetailsAction,
				})
			}
			pages={{
				Census: (
					<CensusPanel
						hospitals={hospitals}
						patients={patients}
						onOpenPatient={onOpenPatient}
						alerts={alerts}
						escalationTargets={escalationTargets}
						onAlertAction={handleAlertAction}
						liveFeed={liveFeed}
						onOpenLiveFeed={onOpenLiveFeed}
						groupedView={groupedView}
					/>
				),
				Monitoring: monitoringPatients ? (
					<MonitoringPanel
						hospitals={hospitals}
						patients={monitoringPatients}
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
