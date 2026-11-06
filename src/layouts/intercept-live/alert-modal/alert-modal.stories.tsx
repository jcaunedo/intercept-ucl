import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Maximize2Icon } from "lucide-react";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";

import { Button } from "@/components/buttons/button";

import { AlertDetailModal, AlertPanel, type AlertDetailModalProps } from "./alert-modal";
import { dkaCalculate, type DkaCheck, type DkaReadings } from "./dka-protocol";
import {
	sampleEscalationTargets,
	sampleMonitoringAlerts,
	sampleMonitoringPatients,
} from "../monitoring/sample-monitoring";
import { sampleLiveScenario } from "../monitoring/sample-live-scenario";
import { samplePatientRecords } from "../patient-details/sample-patient-details";
import { withFlagDetails } from "../shared/flag-details";
import { sampleScenario2Discharge } from "../sample-data/sample-scenario-2";
import {
	sampleAlertDetails,
	sampleScenario1AlertDetail,
	sampleScenario2AlertDetail,
	sampleScenario2ResolvedDetail,
	sampleScenario3AlertDetail,
	sampleScenario3Pathway,
	sampleScenario3Tasks,
	sampleScenario4AlertDetail,
	sampleScenario4Protocol,
} from "./sample-alert-modal";

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
		onTransferDecision: fn(),
		onDischargeDecision: fn(),
		onBundleDecision: fn(),
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
	// The flags open their details from the patient's record, as the app's renderer does.
	const [flagged] = withFlagDetails([{ id: props.data.alert.patientId, tags: props.data.tags }], samplePatientRecords);
	return (
		<div className='flex min-h-screen items-center justify-center bg-background-subtle p-4'>
			<Button variant='outline' onClick={() => setOpen(true)}>
				<Maximize2Icon />
				Open alert
			</Button>
			<AlertDetailModal
				{...props}
				data={{ ...props.data, alert, tags: props.data.tags && flagged.tags }}
				open={open}
				onOpenChange={setOpen}
				onAction={(action) => {
					props.onAction?.(action);
					if (action.type === "acknowledge")
						setAlert((current) => ({
							...current,
							status: "acknowledged",
							addressed: { at: new Date().toISOString() },
						}));
					if (action.type === "unacknowledge")
						setAlert((current) => ({ ...current, status: "active", addressed: undefined }));
				}}
			/>
		</div>
	);
}

/**
 * Video consult (footer) rings Kayla Brandt, RN at the bedside, then opens the room's camera at the top of the
 * right column. Acknowledge, Escalate and Resolve, in the alert, run its lifecycle; the patient's name opens their
 * details.
 */
export const Default: Story = {
	play: async ({ args }) => {
		const dialog = within(
			await screen.findByRole("dialog", { name: "Rising work of breathing, positive fluid balance, HFrEF" }),
		);
		await expect(dialog.getByText("2,400 pg/mL")).toBeInTheDocument();
		await dialog.getByRole("button", { name: /, open patient$/ }).click();
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
		await dialog.getByRole("button", { name: "Video consult" }).click();
		await expect(await dialog.findByText("Calling Kayla Brandt…")).toBeInTheDocument();
		// Live: the calling screen (which names the nurse too) has gone, and the nurse's label is on the video.
		await waitFor(
			() => {
				expect(dialog.queryByText(/^Calling /)).not.toBeInTheDocument();
				expect(dialog.getByText("Kayla Brandt, RN")).toBeInTheDocument();
			},
			{ timeout: 7000 },
		);
		await expect(args.onConsultChange).toHaveBeenLastCalledWith("live");
		await dialog.getByRole("button", { name: "End" }).click();
		await expect(await dialog.findByRole("button", { name: "Video consult" })).toBeInTheDocument();
	},
};

/**
 * Escalate and Resolve open the triage queue's forms under the buttons: who to send it to and a note, or the
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
		await userEvent.click(dialog.getByRole("button", { name: "Resolve" }));
		await userEvent.click(await dialog.findByRole("radio", { name: "Treated" }));
		await userEvent.click(dialog.getByRole("button", { name: "Mark as resolved" }));
		await expect(args.onAction).toHaveBeenLastCalledWith({ type: "resolve", reason: "Treated", note: "" });
	},
};

/** With the consult on: the room's camera where the call was, the rest in place. */
export const InConsult: Story = {
	args: { defaultConsult: "live" },
};

/**
 * The alert panel (AlertPanel: UCL AlertExpanded with the modal's interactions), which replaced the three-column modal
 * in the app (Nov 3, 2026, user's call). Acknowledge confirms in place; Escalate and Resolve open their forms
 * under the buttons. Video consult rings Kayla Brandt, RN and slides a panel out with the call and the AI Notetaker under
 * it (Scenario 1, step 3): once the others on the call approve, it captures the consultation, prepares the notes and offers the draft
 * for review and approval; Pathway slides a second one out to its right with the CHF pathway, then keep or
 * transfer once its orders are sent (steps 4 and 5). End call and Hide pathway each slide theirs back.
 */
export const Panel: Story = {
	render: (args) => <PanelDemo {...args} />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Acknowledge" }));
		await expect(await canvas.findByRole("button", { name: "Acknowledged" })).toHaveAttribute("aria-pressed", "true");
		await userEvent.click(canvas.getByRole("button", { name: "Video consult" }));
		const call = within(await canvas.findByRole("complementary", { name: "Video consult" }));
		await expect(call.getByText("Calling Kayla Brandt…")).toBeInTheDocument();
		// Live: the calling screen (which names the nurse too) has gone, and the nurse's label is on the video.
		await waitFor(
			() => {
				expect(call.queryByText(/^Calling /)).not.toBeInTheDocument();
				expect(call.getByText("Kayla Brandt, RN")).toBeInTheDocument();
			},
			{ timeout: 7000 },
		);
		// Under the call, the AI Notetaker, on by default: as the call connects it asks Kayla for approval, and records once
		// she has.
		await expect(await call.findByText("Recording starts once Kayla Brandt, RN approves.")).toBeInTheDocument();
		await expect(await call.findByText("Capturing consultation", {}, { timeout: 6000 })).toBeInTheDocument();
		// The conversation streams into the live transcript, the clinician first, then Kayla; it stays once stopped.
		const transcript = within(call.getByRole("log", { name: "Live transcript" }));
		await expect(await transcript.findByText("Kayla Brandt, RN", {}, { timeout: 15000 })).toBeInTheDocument();
		await expect(transcript.getByText("You")).toBeInTheDocument();
		// Stop pauses it, marked in the transcript; Resume picks it up; stopped again, Prepare notes drafts them.
		await userEvent.click(call.getByRole("button", { name: "Stop" }));
		await expect(await call.findByText("Notetaker stopped")).toBeInTheDocument();
		await expect(transcript.getByText(/^Stopped at /)).toBeInTheDocument();
		await userEvent.click(call.getByRole("button", { name: "Resume" }));
		await expect(await transcript.findByText(/^Not captured · /)).toBeInTheDocument();
		await userEvent.click(await call.findByRole("button", { name: "Stop" }));
		await userEvent.click(await call.findByRole("button", { name: "Prepare notes" }));
		await expect(transcript.getByText("Kayla Brandt, RN")).toBeInTheDocument();
		await expect(await call.findByText("Preparing notes")).toBeInTheDocument();
		await expect(await call.findByText("Notes ready for review", {}, { timeout: 6000 })).toBeInTheDocument();
		await userEvent.click(call.getByRole("button", { name: "Review notes" }));
		const note = call.getByRole("textbox", { name: "Draft consult note" }) as HTMLTextAreaElement;
		await expect(note.value.startsWith("Video consult with Kayla Brandt, RN")).toBe(true);
		await userEvent.click(call.getByRole("button", { name: "Approve notes" }));
		await expect(await call.findByText(/Approved by you/)).toBeInTheDocument();
		// The pathway opens in a second panel, to the right of the call's.
		await userEvent.click(canvas.getByRole("button", { name: "Pathway" }));
		const pathway = within(await canvas.findByRole("complementary", { name: "Pathway" }));
		await expect(await pathway.findByRole("button", { name: "Accept" })).toBeInTheDocument();
		const panels = canvas.getAllByRole("complementary").map((panel) => panel.getAttribute("aria-label"));
		await expect(panels).toEqual(["Video consult", "Pathway"]);
		await userEvent.click(canvas.getByRole("button", { name: "End call" }));
		await waitFor(() => expect(canvas.queryByRole("complementary", { name: "Video consult" })).not.toBeInTheDocument());
		await userEvent.click(canvas.getByRole("button", { name: "Hide pathway" }));
		await waitFor(() => expect(canvas.queryByRole("complementary", { name: "Pathway" })).not.toBeInTheDocument());
	},
};

function PanelDemo(props: AlertDetailModalProps) {
	// Acknowledge marks the alert acknowledged, as the app does, so the panel confirms it in place.
	const [alert, setAlert] = React.useState(props.data.alert);
	// The flags open their details from the patient's record, as the app's renderer does.
	const [flagged] = withFlagDetails([{ id: props.data.alert.patientId, tags: props.data.tags }], samplePatientRecords);
	return (
		<div className='flex min-h-screen items-center justify-center bg-background-subtle p-4'>
			<AlertPanel
				{...props}
				data={{ ...props.data, alert, tags: props.data.tags && flagged.tags }}
				onClose={fn()}
				onAction={(action) => {
					props.onAction?.(action);
					if (action.type === "acknowledge")
						setAlert((current) => ({
							...current,
							status: "acknowledged",
							addressed: { at: new Date().toISOString() },
						}));
					if (action.type === "unacknowledge")
						setAlert((current) => ({ ...current, status: "active", addressed: undefined }));
				}}
				className='max-h-[calc(100dvh-32px)]'
			/>
		</div>
	);
}

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
		// An AI recommendation can be resolved (it was right, and it's handled) or get feedback (it was wrong), a link on its
		// source line.
		const panel = within(dialog.getByRole("region", { name: "Alert" }));
		await userEvent.click(panel.getByRole("button", { name: "Resolve" }));
		await expect(await panel.findByRole("button", { name: "Mark as resolved" })).toBeInTheDocument();
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
		await userEvent.click(pathway.getByRole("button", { name: "Save" }));
		await expect(pathway.getByText("Edited")).toBeInTheDocument();
		// Add note opens a note for the co-signer, which goes with the orders.
		await userEvent.click(pathway.getByRole("button", { name: "Add note" }));
		await userEvent.type(pathway.getByRole("textbox", { name: "Note for Dr. Tom Weller" }), "On 80 mg PO at home");
		await userEvent.click(pathway.getByRole("button", { name: "Accept" }));
		await expect(args.onPathwayDecision).toHaveBeenCalledWith(
			expect.objectContaining({ type: "accept", edited: ["furosemide"], note: "On 80 mg PO at home" }),
		);
		await expect(await pathway.findByText(/Sent to Dr. Tom Weller for co-signature/)).toBeInTheDocument();
		// The note shows in the status banner once its field has closed.
		await waitFor(() => expect(pathway.getByText("On 80 mg PO at home").closest("[role='status']")).not.toBeNull());
		await waitFor(() => expect(pathway.getByText(/Co-signed by Dr. Tom Weller/)).toBeInTheDocument(), {
			timeout: 6000,
		});
		await expect(pathway.getAllByText("Active")).not.toHaveLength(0);
	},
};

/** Exploration: while suggested, a click anywhere on an order opens its dose edit, as its pencil does. */
export const PathwayClickToEdit: Story = {
	play: async () => {
		const dialog = within(
			await screen.findByRole("dialog", { name: "Rising work of breathing, positive fluid balance, HFrEF" }),
		);
		const pathway = within(dialog.getByRole("region", { name: "CHF exacerbation pathway" }));
		await userEvent.click(pathway.getByText("Target urine output ≥ 100 mL/h over the next 2 h"));
		await expect(await pathway.findByRole("textbox", { name: "Furosemide IV dose" })).toHaveFocus();
	},
};

/** Exploration: declining the pathway needs a reason; Undo decline brings the suggestion back. */
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
		await expect(args.onPathwayDecision).toHaveBeenCalledWith({
			type: "decline",
			rationale: "Transferring to Scottsbluff instead",
		});
		await expect(region).toHaveAttribute("data-status", "declined");
		await waitFor(() => expect(pathway.queryByRole("textbox")).not.toBeInTheDocument());
		await userEvent.click(pathway.getByRole("button", { name: "Undo decline" }));
		await expect(args.onPathwayDecision).toHaveBeenLastCalledWith({ type: "undecline" });
		await expect(region).toHaveAttribute("data-status", "suggested");
		await expect(await pathway.findByRole("button", { name: "Accept" })).toBeInTheDocument();
	},
};

/**
 * Exploration: after declining, the intensivist writes their own pathway (a name, then each order's name, dose and an
 * optional target) and sends it to the same co-signer; it then shows in the suggestion's place, awaiting co-signature,
 * then active.
 */
export const OwnPathway: Story = {
	play: async ({ args }) => {
		const dialog = within(
			await screen.findByRole("dialog", { name: "Rising work of breathing, positive fluid balance, HFrEF" }),
		);
		const region = dialog.getByRole("region", { name: "CHF exacerbation pathway" });
		const pathway = within(region);
		await userEvent.click(pathway.getByRole("button", { name: "Decline" }));
		await userEvent.type(pathway.getByRole("textbox", { name: "Why decline?" }), "Transferring to Scottsbluff instead");
		await userEvent.click(pathway.getByRole("button", { name: "Decline pathway" }));
		await userEvent.click(await pathway.findByRole("button", { name: "Create your own pathway" }));
		const send = await pathway.findByRole("button", { name: "Send for co-signature" });
		await expect(send).toBeDisabled();
		await userEvent.type(await pathway.findByRole("textbox", { name: "Pathway name" }), "Stabilize for transfer");
		await userEvent.type(pathway.getByRole("textbox", { name: "Order" }), "BiPAP");
		await userEvent.type(pathway.getByRole("textbox", { name: "Dose or settings" }), "IPAP 12, EPAP 6, FiO₂ 60%");
		await userEvent.click(pathway.getByRole("button", { name: "Add order" }));
		const second = within(await pathway.findByRole("listitem", { name: "Order 2" }));
		await userEvent.type(second.getByRole("textbox", { name: "Order" }), "Furosemide IV");
		await userEvent.type(second.getByRole("textbox", { name: "Dose or settings" }), "80 mg IV bolus");
		await expect(send).toBeEnabled();
		await userEvent.click(send);
		await expect(args.onPathwayDecision).toHaveBeenLastCalledWith({
			type: "create",
			title: "Stabilize for transfer",
			orders: [
				expect.objectContaining({ name: "BiPAP", dose: "IPAP 12, EPAP 6, FiO₂ 60%" }),
				expect.objectContaining({ name: "Furosemide IV", dose: "80 mg IV bolus" }),
			],
		});
		await expect(region).toHaveAttribute("aria-label", "Stabilize for transfer");
		await expect(region).toHaveAttribute("data-status", "pending");
		await expect(await pathway.findByText(/Sent to Dr. Tom Weller for co-signature/)).toBeInTheDocument();
		await waitFor(() => expect(region).toHaveAttribute("data-status", "active"), { timeout: 6000 });
	},
};

const scenario1 = sampleScenario1AlertDetail();
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

/**
 * Exploration, Scenario 1 step 5: once the pathway's orders are sent, **Keep or transfer** opens under it: what the plan
 * needs against what Chadron has tonight, the receiving hospitals and the transport. Keep asks why and shows the 1 h
 * and 4 h checkpoints, then lists them with their due times.
 */
export const KeepOrTransfer: Story = {
	play: async ({ args }) => {
		const dialog = within(
			await screen.findByRole("dialog", {
				name: "Rising work of breathing, positive fluid balance, HFrEF",
			}),
		);
		// Not before the plan: it follows the pathway's orders.
		await expect(dialog.queryByRole("region", { name: "Keep or transfer" })).not.toBeInTheDocument();
		await userEvent.click(dialog.getByRole("button", { name: "Accept" }));
		const region = await dialog.findByRole("region", {
			name: "Keep or transfer",
		});
		const panel = within(region);
		await expect(panel.getByText("1 machine, free in the ER")).toBeInTheDocument();
		await userEvent.click(panel.getByRole("button", { name: "Keep at Chadron" }));
		const keep = await panel.findByRole("button", { name: "Keep at Chadron" });
		await expect(keep).toBeDisabled();
		await userEvent.type(panel.getByRole("textbox", { name: "Why keep at Chadron?" }), "BiPAP and RT are here");
		await userEvent.click(keep);
		await expect(args.onTransferDecision).toHaveBeenCalledWith({
			type: "keep",
			rationale: "BiPAP and RT are here",
		});
		await expect(region).toHaveAttribute("data-decision", "keep");
		await expect(await panel.findByText(/Keeping at Chadron/)).toBeInTheDocument();
		// Change decision takes it back.
		await userEvent.click(await panel.findByRole("button", { name: "Change decision" }));
		await expect(args.onTransferDecision).toHaveBeenLastCalledWith({
			type: "undo",
		});
		await expect(region).toHaveAttribute("data-decision", "open");
	},
};

/** Exploration: Transfer picks the receiving hospital and the transport, and asks why. */
export const TransferRequested: Story = {
	play: async ({ args }) => {
		const dialog = within(
			await screen.findByRole("dialog", {
				name: "Rising work of breathing, positive fluid balance, HFrEF",
			}),
		);
		await userEvent.click(dialog.getByRole("button", { name: "Accept" }));
		const region = await dialog.findByRole("region", {
			name: "Keep or transfer",
		});
		const panel = within(region);
		await userEvent.click(panel.getByRole("button", { name: "Transfer" }));
		await userEvent.click(await panel.findByRole("radio", { name: /Air/ }));
		await userEvent.type(panel.getByRole("textbox", { name: "Why transfer?" }), "Needs more than the floor can give");
		await userEvent.click(panel.getByRole("button", { name: "Request transfer" }));
		await expect(args.onTransferDecision).toHaveBeenCalledWith({
			type: "transfer",
			rationale: "Needs more than the floor can give",
			receivingId: "regional-west",
			transportId: "air",
		});
		await expect(
			await panel.findByText(/Transfer requested to Regional West Medical Center, by air/),
		).toBeInTheDocument();
	},
};

/**
 * Exploration, Scenario 1 step 6 in the panel: kept at Chadron at 01:52, both checkpoints passed, and the platform logs
 * **Transfer avoided** with the trip the family didn't make, the estimated cost avoided (a placeholder until sourced) and
 * the ICU-level care delivered locally.
 */
export const TransferAvoided: Story = {
	args: {
		data: {
			...scenario1,
			pathwayStatus: "active",
			transfer: {
				...scenario1.transfer!,
				decided: {
					type: "keep",
					rationale: "BiPAP and RT are here; a 2 h ride is the bigger risk tonight",
					at: minutesAgo(250),
				},
				checkpoints: [
					{
						...scenario1.transfer!.checkpoints[0],
						result: { status: "passed", detail: "RR 22, SpO₂ 94% on BiPAP" },
					},
					{
						...scenario1.transfer!.checkpoints[1],
						result: {
							status: "passed",
							detail: "Urine output 140 mL/h, SBP 128, RR 20, SpO₂ 95% on 2 L",
						},
					},
				],
				outcome: {
					distance: "100 mi each way",
					cost: "$ to be sourced",
					careHours: "4 h 20 min",
				},
			},
		},
	},
	play: async () => {
		const panel = within(await screen.findByRole("region", { name: "Keep or transfer" }));
		await expect(panel.getByText("Transfer avoided")).toBeInTheDocument();
		await expect(panel.getAllByText(/Passed/)).toHaveLength(2);
		await expect(panel.queryByRole("button", { name: "Change decision" })).not.toBeInTheDocument();
	},
};

/** Exploration: the 1 h checkpoint missed. A High alert was raised, and transfer is back on the table. */
export const CheckpointMissed: Story = {
	args: {
		data: {
			...scenario1,
			pathwayStatus: "active",
			transfer: {
				...scenario1.transfer!,
				decided: {
					type: "keep",
					rationale: "BiPAP and RT are here",
					at: minutesAgo(65),
				},
				checkpoints: [
					{
						...scenario1.transfer!.checkpoints[0],
						result: { status: "missed", detail: "RR 28, SpO₂ 88% on BiPAP" },
					},
					scenario1.transfer!.checkpoints[1],
				],
			},
		},
	},
	play: async () => {
		const panel = within(await screen.findByRole("region", { name: "Keep or transfer" }));
		await expect(panel.getByText(/A checkpoint was missed/)).toBeInTheDocument();
		await expect(panel.getByRole("button", { name: "Change decision" })).toBeInTheDocument();
	},
};

const scenario2Resolved = sampleScenario2ResolvedDetail(sampleScenario2AlertDetail());

/**
 * Exploration, Scenario 2 step 6: Dale Reynolds kept at Alliance and both checkpoints passed. The discharge workflow has
 * flagged **Uninsured** and **Can't afford home oxygen** from his chart and drafted two referrals, under keep or
 * transfer. Each is sent once someone has said who agreed to it (the patient, family or consent on file), or skipped
 * with a reason. His page's Discharge section shows the same panel.
 */
export const SocialNeedsAtDischarge: Story = {
	args: {
		data: {
			...scenario2Resolved,
			transfer: {
				...scenario2Resolved.transfer!,
				decided: {
					type: "keep",
					rationale: "Air grounded and the road closed; BiPAP, RT and an airway plan are here",
					at: minutesAgo(125),
				},
			},
			discharge: sampleScenario2Discharge(),
		},
	},
	play: async ({ args }) => {
		const region = await screen.findByRole("region", { name: "Social needs at discharge" });
		const panel = within(region);
		await expect(panel.getByText("2 to send")).toBeInTheDocument();
		await expect(panel.getByText("Can't afford home oxygen")).toBeInTheDocument();
		const medicaid = within(panel.getByRole("listitem", { name: "Medicaid eligibility screening" }));
		// Who agreed comes first.
		const send = medicaid.getByRole("button", { name: "Send referral" });
		await expect(send).toBeDisabled();
		await userEvent.click(medicaid.getByRole("radio", { name: "Family" }));
		await userEvent.type(await medicaid.findByRole("textbox", { name: /Who in the family/ }), "his daughter, Amy Reynolds");
		await userEvent.click(send);
		await expect(args.onDischargeDecision).toHaveBeenCalledWith({
			type: "send",
			referralId: "medicaid",
			consent: { by: "family", who: "his daughter, Amy Reynolds" },
		});
		await expect(await medicaid.findByText(/Sent to Alliance financial counseling/)).toBeInTheDocument();
		await expect(medicaid.getByText(/Consent: family \(his daughter, Amy Reynolds\)/)).toBeInTheDocument();
		// Skipping asks why, and can be taken back.
		const rehab = within(panel.getByRole("listitem", { name: "Pulmonary rehab, closer to home" }));
		await userEvent.click(rehab.getByRole("button", { name: "Skip" }));
		await userEvent.type(await rehab.findByRole("textbox", { name: "Why skip?" }), "Already enrolled");
		await userEvent.click(rehab.getByRole("button", { name: "Skip referral" }));
		await expect(args.onDischargeDecision).toHaveBeenLastCalledWith({
			type: "skip",
			referralId: "pulmonary-rehab",
			rationale: "Already enrolled",
		});
		await expect(await panel.findByText("Done")).toBeInTheDocument();
		await userEvent.click(await rehab.findByRole("button", { name: "Undo skip" }));
		await expect(args.onDischargeDecision).toHaveBeenLastCalledWith({ type: "undo", referralId: "pulmonary-rehab" });
		await expect(await panel.findByText("1 to send")).toBeInTheDocument();
	},
};

/**
 * Rosa Medina's hour-1 sepsis bundle mid-way (Scenario 3, steps 3 to 5), in the alert panel: the timer from time zero 34
 * min ago, lactate, cultures and the antibiotic green, two boluses in with their reassessments, and the renal dose review
 * to confirm. MAP stayed under 65, so the septic shock pathway is suggested under the bundle; accepting it shows the
 * bedside tasks its orders generate, the norepinephrine's IV site checks first.
 */
export const SepsisBundle: Story = {
	args: {
		data: (() => {
			const detail = sampleScenario3AlertDetail();
			const at = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
			const startedAt = at(34);
			return {
				...detail,
				alert: { ...detail.alert, firedAt: startedAt },
				pathway: sampleScenario3Pathway(),
				tasks: sampleScenario3Tasks(),
				bundle: detail.bundle && {
					...detail.bundle,
					startedAt,
					elements: detail.bundle.elements.map((element) => {
						switch (element.id) {
							case "cultures":
								return { ...element, status: "complete" as const, result: "2 sets, both arms", documented: { by: "Ashley Brooks, RN", at: at(28) } };
							case "antibiotics":
								return {
									...element,
									status: "complete" as const,
									result: "Piperacillin-tazobactam 4.5 g IV, first dose",
									documented: { by: "Ashley Brooks, RN", at: at(22) },
								};
							case "fluids":
								return {
									...element,
									status: "in-progress" as const,
									fluids: element.fluids && {
										...element.fluids,
										boluses: [
											{ id: "b1", volume: 500, at: at(18), reassessment: "Lungs clear, SpO₂ 95%, RR 22, MAP 61", tolerated: true, by: "Jenna Collins, NP" },
											{ id: "b2", volume: 500, at: at(8), reassessment: "Lungs clear, SpO₂ 95%, RR 22, MAP 61", tolerated: true, by: "Jenna Collins, NP" },
										],
									},
								};
							default:
								return element;
						}
					}),
				},
			};
		})(),
	},
	render: (args) => <PanelDemo {...args} />,
	play: async ({ canvas, args, userEvent }) => {
		// The bundle opens with the alert, so its timer is in view.
		const pathway = within(await canvas.findByRole("complementary", { name: "Pathway" }));
		const bundle = within(pathway.getByRole("region", { name: "Hour-1 bundle" }));
		await expect(bundle.getByText("Left in hour 1")).toBeInTheDocument();
		await expect(bundle.getByText("3 of 5")).toBeInTheDocument();
		await expect(bundle.getByText("1,000 mL")).toBeInTheDocument();
		// The renal dose review: confirmed here, and can be taken back.
		await userEvent.click(bundle.getByRole("button", { name: "Confirm dose" }));
		await expect(args.onBundleDecision).toHaveBeenCalledWith({ type: "confirm-check", elementId: "antibiotics" });
		await expect(await bundle.findByText(/Reviewed by you/)).toBeInTheDocument();
		// Accepting the pathway generates the bedside tasks, shared with Sidney ED's nurses.
		await expect(pathway.queryByRole("region", { name: "Bedside tasks" })).not.toBeInTheDocument();
		await userEvent.click(pathway.getByRole("button", { name: "Accept" }));
		const tasks = within(await pathway.findByRole("region", { name: "Bedside tasks" }));
		await expect(tasks.getByText("IV site check, norepinephrine")).toBeInTheDocument();
	},
};

/**
 * Tyler Kessler's DKA protocol 6 h in (Scenario 4, steps 1 to 3), in the alert panel: the pathway active, the hourly
 * checks from 7 units/h, the rate up at hour 3 (signed on the intensivist's phone), the potassium hard stop at hour 4
 * (insulin held, then replaced), and at hour 6 glucose under 250: dextrose prompted and the rate down to 3.5 units/h,
 * waiting for sign-off. The next check is due. Each rate is the calculator's (`dkaCalculate`), as in the scenario.
 */
export const DkaProtocol: Story = {
	name: "DKA Protocol",
	args: {
		data: (() => {
			const detail = sampleScenario4AlertDetail();
			const start = Date.now() - (6 * 60 + 8) * 60_000;
			const at = (hour: number, minute = 0) => new Date(start + hour * 60 * 60_000 + minute * 60_000).toISOString();
			const protocol = sampleScenario4Protocol(at(0));
			const nurse = "Brittany Cole, RN";
			const readings: DkaReadings[] = [
				{ glucose: 520, potassium: 5.6, gap: 28, bicarbonate: 6, fluids: "0.9% saline 1,000 mL/h, second liter" },
				{ glucose: 468, potassium: 5.1, gap: 26, bicarbonate: 8, fluids: "0.45% saline + KCl 20 mEq/L, 250 mL/h" },
				{ glucose: 415, potassium: 4.4, gap: 24, bicarbonate: 10, fluids: "0.45% saline + KCl 20 mEq/L, 250 mL/h" },
				{ glucose: 386, potassium: 3.9, gap: 22, bicarbonate: 11, fluids: "0.45% saline + KCl 20 mEq/L, 250 mL/h" },
				{ glucose: 318, potassium: 3.1, gap: 20, bicarbonate: 12, fluids: "0.45% saline + KCl 20 mEq/L, 250 mL/h" },
				{ glucose: 296, potassium: 3.6, gap: 19, bicarbonate: 13, fluids: "0.45% saline + KCl 20 mEq/L, 250 mL/h; KCl 20 mEq/h IV" },
				{ glucose: 238, potassium: 3.9, gap: 17, bicarbonate: 14, fluids: "0.45% saline + KCl 20 mEq/L, 250 mL/h" },
			];
			const checks: DkaCheck[] = [];
			readings.forEach((entry, hour) => {
				const previous = checks.at(-1);
				const { insulin, prompts } = dkaCalculate(protocol, entry, previous);
				const before = previous?.insulin;
				const changed = before && !before.held && !insulin.held && before.rate !== insulin.rate;
				checks.push({
					id: `h${hour}`,
					hour,
					at: at(hour),
					status: "done",
					readings: entry,
					insulin,
					// The hard stop's prompts were acted on; the dextrose prompt is still open.
					prompts: prompts.map((prompt, index) => ({
						...prompt,
						id: `h${hour}-${index}`,
						done: hour === 4 ? { by: nurse, at: at(4, 8), result: prompt.kind === "hard-stop" ? "drip paused" : "KCl 20 mEq/h IV" } : undefined,
					})),
					rateChange: changed
						? {
								from: before.rate,
								to: insulin.rate,
								signOff:
									hour === 3
										? { status: "signed", by: "Joanna Smith, MD", at: at(3, 5), via: "phone", seconds: 38 }
										: { status: "pending", sentTo: "Dr. Smith", at: at(hour, 3) },
							}
						: undefined,
					done: { by: nurse, at: at(hour, 3) },
				});
			});
			checks.push({ id: "h7", hour: 7, at: at(7), status: "due" });
			return { ...detail, alert: { ...detail.alert, firedAt: at(0, -2) }, pathwayStatus: "active" as const, protocol: { ...protocol, checks } };
		})(),
	},
	render: (args) => <PanelDemo {...args} />,
	play: async ({ canvas }) => {
		// A running protocol opens with the alert.
		const pathway = within(await canvas.findByRole("complementary", { name: "Pathway" }));
		const protocol = within(pathway.getByRole("region", { name: "DKA insulin protocol" }));
		// The summary: the rate running (the change waits for sign-off) and the next check.
		await expect(protocol.getByText("Next check", { exact: false })).toBeInTheDocument();
		await expect(protocol.getByText("Hour 7")).toBeInTheDocument();
		// The latest check in full: dextrose prompted, the rate change waiting for sign-off.
		await expect(protocol.getByText("Add dextrose")).toBeInTheDocument();
		await expect(protocol.getByText(/Waiting for sign-off/)).toBeInTheDocument();
		// The hard stop folds into its check's line once it's older.
		await expect(protocol.getAllByText("Insulin held").length).toBeGreaterThan(0);
	},
};

/**
 * Rosa Medina prefers Spanish (Scenario 3, step 2): once the video consult is on, it offers a medical interpreter. Add
 * interpreter connects one, who joins the call.
 */
export const Interpreter: Story = {
	args: { data: sampleScenario3AlertDetail(), defaultConsult: "live" },
	render: (args) => <PanelDemo {...args} />,
	play: async ({ canvas, userEvent }) => {
		const call = within(await canvas.findByRole("complementary", { name: "Video consult" }));
		await expect(await call.findByText("Rosa prefers Spanish.")).toBeInTheDocument();
		await userEvent.click(call.getByRole("button", { name: "Add interpreter" }));
		await expect(await call.findByText("Lucía Herrera joined the call", {}, { timeout: 6000 })).toBeInTheDocument();
	},
};
