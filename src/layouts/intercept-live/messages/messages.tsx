import type { InterceptLivePage } from "../intercept-live";
import { Monitoring, type MonitoringProps } from "../monitoring/monitoring";
import type { MessagesPanelProps } from "./messages-panel";

type MessagesProps = Omit<MonitoringProps, "messages" | "defaultPage"> & {
	/** Every thread with the bedside, from every hospital (the layout's `hospitals` name them). */
	messages: Omit<MessagesPanelProps, "hospitals">;
	/** The page shown first: Messages by default. The Sidebar still moves to Monitoring, Patients and the rest. */
	defaultPage?: InterceptLivePage;
};

/**
 * The Messages screen of Intercept Live (PRD Messages): every thread with the bedside, opened on the Messages page of
 * the app's shell. It's the Monitoring layout with Messages first, so the Sidebar, the header and opening a patient are
 * the app's, and a thread's patient is the same patient everywhere.
 */
function Messages({ defaultPage = "Messages", ...props }: MessagesProps) {
	return <Monitoring {...props} defaultPage={defaultPage} />;
}

export { Messages, type MessagesProps };
