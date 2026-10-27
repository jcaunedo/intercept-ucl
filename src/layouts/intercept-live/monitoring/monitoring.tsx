import { CensusPanel, type CensusPatient } from "../census/census-panel";
import { InterceptLive, type InterceptLivePage, type InterceptLiveProps } from "../intercept-live";
import {
	MonitoringPanel,
	type EscalationTarget,
	type MonitoringHospital,
	type MonitoringPanelProps,
	type MonitoringPatient,
	type TriageAlert,
	type TriageAlertAction,
} from "./monitoring-panel";

type MonitoringProps = Omit<InterceptLiveProps, "pages" | "defaultPage"> &
	MonitoringPanelProps & {
		/** The census's patients. With them, the Sidebar's Census opens the Census page. */
		censusPatients?: CensusPatient[];
		/** The Census card's "…" button. */
		onPatientActions?: (patientId: string) => void;
		/** The page shown first. The Sidebar switches between Monitoring, the Census and the pages that aren't built. */
		defaultPage?: InterceptLivePage;
	};

/**
 * The Monitoring screen of Intercept Live (the Tele-Critical Care Clinical Surveillance module): the clinician's panel
 * as live bedside monitors, filtered and sorted as on the Census, beside the triage queue of its alerts. Draft from PRD
 * Monitoring; not in Intercept-Live yet.
 */
function Monitoring({
	hospitals,
	patients,
	alerts,
	escalationTargets,
	onAlertAction,
	censusPatients,
	onOpenPatient,
	onPatientActions,
	defaultPage = "Monitoring",
	...shell
}: MonitoringProps) {
	return (
		<InterceptLive
			{...shell}
			defaultPage={defaultPage}
			pages={{
				Monitoring: (
					<MonitoringPanel
						hospitals={hospitals}
						patients={patients}
						alerts={alerts}
						escalationTargets={escalationTargets}
						onOpenPatient={onOpenPatient}
						onAlertAction={onAlertAction}
					/>
				),
				Census: censusPatients ? (
					<CensusPanel
						hospitals={hospitals}
						patients={censusPatients}
						onOpenPatient={onOpenPatient}
						onPatientActions={onPatientActions}
					/>
				) : undefined,
			}}
		/>
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
