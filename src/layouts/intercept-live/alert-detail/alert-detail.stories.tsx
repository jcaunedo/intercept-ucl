import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Maximize2Icon } from "lucide-react";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";

import { Button } from "@/components/buttons/button";

import { AlertDetailModal, type AlertDetailModalProps } from "./alert-detail";
import { sampleEscalationTargets, sampleMonitoringAlerts, sampleMonitoringPatients } from "../monitoring/sample-monitoring";
import { sampleLiveScenario } from "../monitoring/sample-live-scenario";
import { samplePatientRecords } from "../patient-details/sample-patient-details";
import { sampleAlertDetails, sampleScenario1AlertDetail } from "./sample-alert-detail";

/**
 * The alert modal, opened from a Monitoring card's alert bar or an alert toast's maximize button. Margaret Hayes's
 * Critical alert at 01:40 in Scenario 1, in three columns: the alert with her NEWS2, monitor and tags (step 2); Clinical
 * info, the key clinical findings and the history and labs the intensivist needs (step 3); and Pathway, for acting: the
 * one-click video consult to her bedside nurse and, as an exploration, step 4's CHF exacerbation pathway. In the
 * Monitoring and Census prototypes, Open alert shows it.
 */
const meta = {
	title: "Layouts/Intercept Live/Alert modal",
	component: AlertDetailModal,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	args: {
		data: sampleScenario1AlertDetail(),
		escalationTargets: sampleEscalationTargets,
		onAction: fn(),
		onOpenPatient: fn(),
		onConsultChange: fn(),
		onPathwayDecision: fn(),
	},
	render: (args) => <Demo {...args} />,
} satisfies Meta<typeof AlertDetailModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opens on load, and again from the button after it closes. */
function Demo(props: AlertDetailModalProps) {
	const [open, setOpen] = React.useState(true);
	// Acknowledge marks the alert acknowledged, as the app does, so the modal confirms it in place.
	const [alert, setAlert] = React.useState(props.data.alert);
	return (
		<div className='flex min-h-screen items-center justify-center bg-background-subtle p-4'>
			<Button variant='outline' onClick={() => setOpen(true)}>
				<Maximize2Icon />
				Open alert
			</Button>
			<AlertDetailModal
				{...props}
				data={{ ...props.data, alert }}
				open={open}
				onOpenChange={setOpen}
				onAction={(action) => {
					props.onAction?.(action);
					if (action.type === "acknowledge")
						setAlert((current) => ({ ...current, status: "acknowledged", addressed: { at: new Date().toISOString() } }));
					if (action.type === "unacknowledge") setAlert((current) => ({ ...current, status: "active", addressed: undefined }));
				}}
			/>
		</div>
	);
}

/**
 * Video call Kayla (footer) rings Kayla Brandt, RN at the bedside, then opens the room's camera at the top of the
 * right column. Acknowledge, Escalate and Mark as resolved, in the alert, run its lifecycle; Open patient opens their
 * details.
 */
export const Default: Story = {
	play: async ({ args }) => {
		const dialog = within(
			await screen.findByRole("dialog", { name: "Rising work of breathing, positive fluid balance, HFrEF" }),
		);
		await expect(dialog.getByText("2,400 pg/mL")).toBeInTheDocument();
		await dialog.getByRole("button", { name: "Open patient" }).click();
		await expect(args.onOpenPatient).toHaveBeenCalled();
		await dialog.getByRole("button", { name: "Acknowledge" }).click();
		await expect(args.onAction).toHaveBeenLastCalledWith({ type: "acknowledge" });
		// Confirmed in place: the button reads Acknowledged, pressed, and the status line says who and when.
		const acknowledged = await dialog.findByRole("button", { name: "Acknowledged" });
		await expect(acknowledged).toHaveAttribute("aria-pressed", "true");
		await expect(await dialog.findByText(/Acknowledged by you/)).toBeInTheDocument();
		// Clicking it again undoes it: Acknowledge again, and the status line leaves.
		await userEvent.click(acknowledged);
		await expect(args.onAction).toHaveBeenLastCalledWith({ type: "unacknowledge" });
		await expect(await dialog.findByRole("button", { name: "Acknowledge" })).toHaveAttribute("aria-pressed", "false");
		await waitFor(() => expect(dialog.queryByText(/Acknowledged by you/)).not.toBeInTheDocument());
		await userEvent.click(dialog.getByRole("button", { name: "Acknowledge" }));
		await dialog.getByRole("button", { name: "Video call Kayla, RN" }).click();
		await expect(await dialog.findByText("Calling Kayla Brandt…")).toBeInTheDocument();
		await waitFor(() => expect(dialog.getByText("Kayla Brandt, RN joined")).toBeInTheDocument(), { timeout: 3000 });
		await expect(args.onConsultChange).toHaveBeenLastCalledWith("live");
		await dialog.getByRole("button", { name: "End" }).click();
		await expect(await dialog.findByRole("button", { name: "Video call Kayla, RN" })).toBeInTheDocument();
	},
};

/**
 * Escalate and Mark as resolved open the triage queue's forms under the buttons: who to send it to and a note, or the
 * resolution and a note. Escape closes an open form and leaves the modal open.
 */
export const EscalateAndResolve: Story = {
	play: async ({ args }) => {
		const dialog = within(
			await screen.findByRole("dialog", { name: "Rising work of breathing, positive fluid balance, HFrEF" }),
		);
		const escalate = dialog.getByRole("button", { name: "Escalate" });
		await userEvent.click(escalate);
		await expect(escalate).toHaveAttribute("aria-expanded", "true");
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(escalate).toHaveAttribute("aria-expanded", "false"));
		await expect(screen.getByRole("dialog")).toBeInTheDocument();
		await userEvent.click(dialog.getByRole("button", { name: "Mark as resolved" }));
		await userEvent.click(await dialog.findByRole("radio", { name: "Treated" }));
		await userEvent.click(dialog.getByRole("button", { name: "Resolve alert" }));
		await expect(args.onAction).toHaveBeenLastCalledWith({ type: "resolve", reason: "Treated", note: "" });
	},
};

/** With the consult on: the room's camera where the call was, the rest in place. */
export const InConsult: Story = {
	args: { defaultConsult: "live" },
};

/** Acknowledged in the prototype: no lifecycle buttons, so no footer. */
export const NoActions: Story = {
	args: { actions: [] },
};

const feedDetails = sampleAlertDetails({
	alerts: [...sampleMonitoringAlerts, ...sampleLiveScenario.flatMap((step) => step.fire ?? [])],
	monitoringPatients: sampleMonitoringPatients,
	records: samplePatientRecords,
});

/**
 * Every alert suggests a pathway, matched to its kind: here the Sepsis Sniffer's candidate gets the hour-1 sepsis
 * bundle, to be co-signed by the patient's attending of record.
 */
export const SepsisAlert: Story = {
	args: { data: feedDetails.find((detail) => detail.alert.id === "a1")! },
	play: async () => {
		await expect(feedDetails.filter((detail) => !detail.pathway)).toEqual([]);
		const dialog = within(await screen.findByRole("dialog"));
		await expect(dialog.getByRole("region", { name: "Sepsis bundle, hour 1" })).toBeInTheDocument();
		// An AI recommendation can be resolved (it was right, and it's handled) or declined (it was wrong).
		const panel = within(dialog.getByRole("region", { name: "Alert" }));
		await userEvent.click(panel.getByRole("button", { name: "Resolve" }));
		await expect(await panel.findByRole("button", { name: "Resolve alert" })).toBeInTheDocument();
		await userEvent.click(panel.getByRole("button", { name: "Feedback" }));
		await expect(await panel.findByRole("button", { name: "Send feedback" })).toBeInTheDocument();
	},
};

/**
 * Resolved, with the note left when resolving it: who, when and why on the state line, the note under it. The panel takes
 * the Resolved bar's green, and there's nothing left to do.
 */
export const ResolvedWithNote: Story = {
	args: {
		data: {
			...sampleScenario1AlertDetail(),
			alert: {
				...sampleScenario1AlertDetail().alert,
				status: "resolved",
				addressed: {
					at: new Date().toISOString(),
					reason: "Treated",
					note: "BiPAP started, SpO₂ back to 94%. Furosemide 80 mg IV given.",
				},
			},
		},
	},
	play: async () => {
		const panel = within(await screen.findByRole("region", { name: "Alert" }));
		await expect(panel.getByText(/Resolved by you · .* · Treated/)).toBeInTheDocument();
		await expect(panel.getByText("BiPAP started, SpO₂ back to 94%. Furosemide 80 mg IV given.")).toBeInTheDocument();
		await expect(panel.queryByRole("button", { name: "Acknowledge" })).not.toBeInTheDocument();
	},
};

/**
 * An alert with nothing behind it yet: no reason line, evidence or recommendation, and no history or labs. Both sections
 * stay, each saying it has nothing to show.
 */
export const NoFindings: Story = {
	args: {
		data: {
			...sampleScenario1AlertDetail(),
			reasons: [],
			history: [],
			alert: { ...sampleScenario1AlertDetail().alert, evidence: undefined, recommendation: undefined },
		},
	},
	play: async () => {
		const dialog = within(await screen.findByRole("dialog"));
		await expect(dialog.getByRole("region", { name: "Key clinical findings" })).toHaveTextContent(
			"No key findings for this alert.",
		);
		await expect(dialog.getByRole("region", { name: "History and labs" })).toHaveTextContent(
			"No history or labs on file for this patient.",
		);
	},
};

/**
 * Exploration, Scenario 1 step 4: the CHF exacerbation pathway in the right column, under the video consult. The
 * intensivist edits the furosemide dose, accepts, and the orders go to Dr. Tom Weller, the family physician on call, for
 * co-signature; once he co-signs (about 4 s here) they're active. Decline asks why.
 */
export const Pathway: Story = {
	play: async ({ args }) => {
		const dialog = within(
			await screen.findByRole("dialog", { name: "Rising work of breathing, positive fluid balance, HFrEF" }),
		);
		const pathway = within(dialog.getByRole("region", { name: "CHF exacerbation pathway" }));
		await userEvent.click(pathway.getByRole("button", { name: "Edit Furosemide IV dose" }));
		const dose = pathway.getByRole("textbox", { name: "Furosemide IV dose" });
		await userEvent.clear(dose);
		await userEvent.type(dose, "120 mg IV bolus, then 10 mg/h infusion");
		await userEvent.click(pathway.getByRole("button", { name: "Save dose" }));
		await expect(pathway.getByText("Edited")).toBeInTheDocument();
		// Add note opens a note for the co-signer, which goes with the orders.
		await userEvent.click(pathway.getByRole("button", { name: "Add note" }));
		await userEvent.type(pathway.getByRole("textbox", { name: "Note for Dr. Tom Weller" }), "On 80 mg PO at home");
		await userEvent.click(pathway.getByRole("button", { name: "Accept and send" }));
		await expect(args.onPathwayDecision).toHaveBeenCalledWith(
			expect.objectContaining({ type: "accept", edited: ["furosemide"], note: "On 80 mg PO at home" }),
		);
		await expect(await pathway.findByText(/Sent to Dr. Tom Weller for co-signature/)).toBeInTheDocument();
		// The note shows under the status once its field has closed.
		await waitFor(() => expect(pathway.getByText("On 80 mg PO at home").tagName).toBe("SPAN"));
		await waitFor(() => expect(pathway.getByText(/Co-signed by Dr. Tom Weller/)).toBeInTheDocument(), { timeout: 6000 });
		await expect(pathway.getAllByText("Active")).not.toHaveLength(0);
	},
};

/** Exploration: declining the pathway needs a reason. */
export const PathwayDeclined: Story = {
	play: async ({ args }) => {
		const dialog = within(
			await screen.findByRole("dialog", { name: "Rising work of breathing, positive fluid balance, HFrEF" }),
		);
		const region = dialog.getByRole("region", { name: "CHF exacerbation pathway" });
		const pathway = within(region);
		await userEvent.click(pathway.getByRole("button", { name: "Decline" }));
		await userEvent.type(pathway.getByRole("textbox", { name: "Why decline?" }), "Transferring to Scottsbluff instead");
		await userEvent.click(pathway.getByRole("button", { name: "Decline pathway" }));
		await expect(args.onPathwayDecision).toHaveBeenCalledWith({ type: "decline", rationale: "Transferring to Scottsbluff instead" });
		await expect(region).toHaveAttribute("data-status", "declined");
		await waitFor(() => expect(pathway.queryByRole("textbox")).not.toBeInTheDocument());
	},
};
