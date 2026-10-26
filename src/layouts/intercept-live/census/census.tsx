import { InterceptLive, type InterceptLivePage, type InterceptLiveProps } from "../intercept-live";
import { MonitoringPanel, type MonitoringPatient } from "../monitoring/monitoring-panel";
import {
	CensusPanel,
	type CensusHospital,
	type CensusPanelProps,
	type CensusPatient,
	type CensusUser,
} from "./census-panel";

type CensusProps = Omit<InterceptLiveProps, "pages" | "defaultPage"> &
	CensusPanelProps & {
		/** The panel's patients with their live values. With them, the Sidebar's Monitoring opens the Monitoring page. */
		monitoringPatients?: MonitoringPatient[];
		/** The page shown first. The Sidebar switches between the Census, Monitoring and the pages that aren't built. */
		defaultPage?: InterceptLivePage;
	};

/**
 * The Census screen of Intercept Live: every patient across the user's hospitals as cards, filtered by hospital,
 * assignment and quick view. Figma origin: Intercept-Live › Census (1:350).
 */
function Census({
	hospitals,
	patients,
	monitoringPatients,
	onOpenPatient,
	onPatientActions,
	defaultPage = "Census",
	...shell
}: CensusProps) {
	return (
		<InterceptLive
			{...shell}
			defaultPage={defaultPage}
			pages={{
				Census: (
					<CensusPanel
						hospitals={hospitals}
						patients={patients}
						onOpenPatient={onOpenPatient}
						onPatientActions={onPatientActions}
					/>
				),
				Monitoring: monitoringPatients ? (
					<MonitoringPanel hospitals={hospitals} patients={monitoringPatients} onOpenPatient={onOpenPatient} />
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
