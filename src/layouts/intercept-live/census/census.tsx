import { InterceptLive, type InterceptLivePage, type InterceptLiveProps, type OpenPatient } from "../intercept-live";
import { MonitoringPanel, type MonitoringPatient } from "../monitoring/monitoring-panel";
import { patientDetailsView, type PatientAction, type PatientRecord } from "../patient-details/patient-details";
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
		/** The page shown first. The Sidebar switches between the Census, Monitoring and the pages that aren't built. */
		defaultPage?: InterceptLivePage;
		/** What's known about each patient beyond the card, for their details page. A patient without one shows the card's. */
		patientRecords?: PatientRecord[];
		/** A patient's details opened first, over the default page. */
		defaultPatient?: OpenPatient;
		/** An action in a patient's details header (Look in, Message, Escalate…). */
		onPatientDetailsAction?: (patientId: string, action: PatientAction) => void;
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
	onOpenPatient,
	defaultPage = "Census",
	patientRecords,
	defaultPatient,
	onPatientDetailsAction,
	...shell
}: CensusProps) {
	// Alert actions apply here, above the pages, so one taken on a patient's details shows on the Census and Monitoring.
	const { alerts, handleAlertAction } = useAddressedAlerts(alertsProp, onAlertAction);

	return (
		<InterceptLive
			{...shell}
			defaultPage={defaultPage}
			defaultPatient={defaultPatient}
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
					/>
				) : undefined,
			}}
		/>
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
