import { alertModalRenderer, type AlertDetailData } from "../alert-detail/alert-detail";
import { CensusPanel, type CensusPatient } from "../census/census-panel";
import { InterceptLive, type InterceptLivePage, type InterceptLiveProps, type OpenPatient } from "../intercept-live";
import { patientDetailsView, type PatientAction, type PatientRecord } from "../patient-details/patient-details";
import { AlertToasts, useClosedResolutions } from "../shared/alert-toasts";
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
	...shell
}: MonitoringProps) {
	// Alert actions apply here, above the pages, so one taken on a patient's details shows on Monitoring and the Census.
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
					? alertModalRenderer({ details: alertDetails, alerts, escalationTargets, onAlertAction: handleAlertAction })
					: shell.renderAlert
			}
			renderPatientDetails={(patientId, stepper) =>
				patientDetailsView(patientId, stepper, {
					patients: censusPatients,
					monitoringPatients: patients,
					records: patientRecords,
					alerts,
					escalationTargets,
					onAlertAction: handleAlertAction,
					onAction: onPatientDetailsAction,
				})
			}
			pages={{
				Monitoring: (
					<MonitoringPanel
						hospitals={hospitals}
						patients={patients}
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
				Census: censusPatients ? (
					<CensusPanel
						hospitals={hospitals}
						patients={censusPatients}
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
				onAlertAction={handleAlertAction}
				onCloseResolved={closeResolved}
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
