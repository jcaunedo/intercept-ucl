import type { InterceptLivePage } from "../intercept-live";
import { Monitoring, type MonitoringProps } from "../monitoring/monitoring";
import type { SchedulePanelProps } from "./schedule-panel";

type ScheduleProps = Omit<MonitoringProps, "schedule" | "defaultPage"> & {
	/** The clinician's shifts and the open shifts they can take (the layout's `hospitals` name them). */
	schedule: Omit<SchedulePanelProps, "hospitals">;
	/** The page shown first: Schedule by default. The Sidebar still moves to Monitoring, Patients and the rest. */
	defaultPage?: InterceptLivePage;
};

/**
 * The Schedule screen of Intercept Live (PRD Schedule): the clinician's shifts as a calendar, opened on the Schedule
 * page of the app's shell. It's the Monitoring layout with Schedule first, so the Sidebar, the header and the account
 * menu (My shift) are the app's.
 */
function Schedule({ defaultPage = "Schedule", ...props }: ScheduleProps) {
	return <Monitoring {...props} defaultPage={defaultPage} />;
}

export { Schedule, type ScheduleProps };
