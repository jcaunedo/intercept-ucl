import type { InterceptLivePage } from "../intercept-live";
import { Monitoring, type MonitoringProps } from "../monitoring/monitoring";
import type { AnalyticsPanelProps } from "./analytics-panel";

type AnalyticsProps = Omit<MonitoringProps, "analytics" | "defaultPage"> & {
	/** The outcomes: one month against the baseline, its breakdowns, hospitals, events and the quarterly report. */
	analytics: AnalyticsPanelProps;
	/** The page shown first: Analytics by default. The Sidebar still moves to Monitoring, Patients and the rest. */
	defaultPage?: InterceptLivePage;
};

/**
 * The Analytics screen of Intercept Live (PRD Outcomes dashboard): the pilot's outcomes, opened on the Analytics page of
 * the app's shell. It's the Monitoring layout with Analytics first, so the Sidebar moves between every page as in the
 * app. Figma: none yet.
 */
function Analytics({ defaultPage = "Analytics", ...props }: AnalyticsProps) {
	return <Monitoring {...props} defaultPage={defaultPage} />;
}

export { Analytics, type AnalyticsProps };
