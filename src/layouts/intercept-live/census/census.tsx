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
		/**
		 * The panel's patients with their live values. With them, the Sidebar's Monitoring opens the Monitoring page, which
		 * takes the same `alerts` for its triage queue and its cards' alert pills.
		 */
		monitoringPatients?: MonitoringPatient[];
		/** The page shown first. The Sidebar switches between the Census, Monitoring and the pages that aren't built. */
		defaultPage?: InterceptLivePage;
	};

/**
 * The Census screen of Intercept Live: every patient across the user's hospitals as cards, filtered by hospital,
 * assignment and quick view, with the live feed panel of their alerts. Figma origin: Intercept-Live › Census (1:350).
 */
function Census({
	hospitals,
	patients,
	monitoringPatients,
	alerts,
	escalationTargets,
	onAlertAction,
	liveFeed,
	onOpenLiveFeed,
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
						alerts={alerts}
						escalationTargets={escalationTargets}
						onAlertAction={onAlertAction}
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
						onAlertAction={onAlertAction}
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
