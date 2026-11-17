import type { InterceptLivePage } from "../intercept-live";
import { Monitoring, type MonitoringProps } from "../monitoring/monitoring";
import type { InboxPanelProps } from "./inbox-panel";

type InboxProps = Omit<MonitoringProps, "inbox" | "defaultPage"> & {
	/** The work besides alerts: drafts to sign, suggested orders, failed write-backs, handed-over items. */
	inbox: Pick<InboxPanelProps, "items" | "onItemAction">;
	/** The page shown first: Inbox by default. The Sidebar still moves to Monitoring, Patients and the rest. */
	defaultPage?: InterceptLivePage;
};

/**
 * The Inbox screen of Intercept Live (PRD Inbox): the one work queue, opened on the Inbox page of the app's shell. It's
 * the Monitoring layout with Inbox first, so the queue's alerts are Monitoring's own (acknowledging one here
 * acknowledges it everywhere) and the Sidebar moves between every page as in the app. Figma origin: intercept.ds Inbox
 * table (`1531:7584`).
 */
function Inbox({ defaultPage = "Inbox", ...props }: InboxProps) {
	return <Monitoring {...props} defaultPage={defaultPage} />;
}

export { Inbox, type InboxProps };
