import type { Meta, StoryObj } from "@storybook/react-vite";
import { MessageCircleMoreIcon, VideoIcon } from "lucide-react";
import { expect, fn } from "storybook/test";

import { Button } from "@/components/buttons/button";
import samplePhoto3 from "@/components/data-display/avatar/images/sample-photo-3.png";
import { Counter } from "@/components/data-display/counter";

import { PatientHeader } from "./patient-header";

const meta = {
	title: "Data Display/PatientHeader",
	component: PatientHeader,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	args: {
		lastName: "Miller",
		firstName: "Sarah",
		photo: samplePhoto3,
		initials: "SM",
		tone: 1,
		mrn: "01033876",
		account: "6325DF2",
		sex: "F",
		age: 59,
		hospital: "Sidney Regional",
		unit: "MICU",
		room: "11",
		bed: "Bed 11",
		tags: [
			{ label: "Ventilated" },
			{ label: "2 pressors" },
			{ label: "Allergy: Penicillin" },
			{ label: "Droplet isolation" },
		],
		acuity: { label: "NEWS2", score: 10, level: "high" },
		trajectory: { label: "Change in last 24 h", value: "+1", trend: "up" },
		clinicalStatus: { status: "deteriorating", assessedAt: new Date(Date.now() - 2 * 60_000).toISOString() },
		alertCounts: { critical: 1, low: 1 },
		recentAlerts: { count: 6, period: "12 h" },
		onViewAlerts: fn(),
	},
} satisfies Meta<typeof PatientHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * As in Figma: the 56px photo beside the name with sex and age ("- F, 59"), and one line under it: MRN and account and
 * the location after a pin. The tags (all outline) from the left edge, 8px below. On the right, as wide, three columns
 * after rules: NEWS2 with its change, the clinical status with when it was assessed, and the alerts in the last 12 h
 * with the open ones' button.
 */
export const Default: Story = {
	play: async ({ canvas, args }) => {
		await expect(canvas.getByRole("heading", { level: 1, name: "Miller, Sarah" })).toBeInTheDocument();
		await expect(canvas.getByText("- F, 59")).toBeInTheDocument();
		await expect(canvas.getByText(/Sidney Regional · MICU · 11 - Bed 11/)).toBeInTheDocument();
		await expect(canvas.getByText("6325DF2", { exact: false })).toBeInTheDocument();
		await expect(canvas.getByRole("group", { name: "NEWS2" })).toHaveTextContent(/10High1 point up in 24 h$/);
		await expect(canvas.getByRole("group", { name: "Clinical status" })).toHaveTextContent(/DeterioratingLast assessed \d+ min ago$/);
		await expect(canvas.getByRole("group", { name: /^Alerts\s*·\s*6 alerts in last 12 h$/ })).toBeInTheDocument();
		// A Critical and a Low open: the button takes the highest, Critical.
		await expect(canvas.getByRole("button", { name: "2 active alerts" })).toHaveAttribute("data-severity", "critical");
		canvas.getByRole("button", { name: "2 active alerts" }).click();
		await expect(args.onViewAlerts).toHaveBeenCalled();
	},
};

/**
 * The alerts button takes the color of the highest open severity, as the cards' alert bar: Critical red, High orange,
 * Medium amber, Low blue.
 */
export const AlertSeverities: Story = {
	render: (args) => (
		<div className='flex flex-col divide-y divide-border'>
			<PatientHeader {...args} alertCounts={{ critical: 1, low: 2 }} />
			<PatientHeader {...args} alertCounts={{ high: 1, medium: 1 }} />
			<PatientHeader {...args} alertCounts={{ medium: 2 }} />
			<PatientHeader {...args} alertCounts={{ low: 1 }} />
		</div>
	),
	play: async ({ canvasElement }) => {
		const severities = [...canvasElement.querySelectorAll("[data-slot='patient-header'] button[data-severity]")].map(
			(button) => button.getAttribute("data-severity"),
		);
		await expect(severities).toEqual(["critical", "high", "medium", "low"]);
	},
};

/** No open alert: the alerts button stays, "No active alerts" in outline. A falling score's arrow is green. */
export const NoAlerts: Story = {
	args: {
		acuity: { label: "NEWS2", score: 3, level: "low" },
		trajectory: { label: "Change in last 24 h", value: "−2", trend: "down" },
		alertCounts: {},
	},
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("button", { name: "No active alerts" })).toHaveAttribute("data-variant", "outline");
	},
};

/** A vital stopped reporting, so the status can't be assessed: Insufficient data. */
export const InsufficientData: Story = {
	args: {
		acuity: { label: "NEWS2", level: "unknown" },
		trajectory: undefined,
		clinicalStatus: { status: "insufficient-data", assessedAt: new Date(Date.now() - 41 * 60_000).toISOString() },
	},
};

/** Without `alertCounts`, `alert` gives the count; without `recentAlerts`, the label is "Alerts" alone. */
export const TotalOnly: Story = {
	args: { alertCounts: undefined, alert: { variant: "critical", count: 3 }, recentAlerts: undefined },
};

/** No score, no status, no account and no alerts button: the patient's side alone. */
export const Minimal: Story = {
	args: {
		acuity: undefined,
		trajectory: undefined,
		clinicalStatus: undefined,
		account: undefined,
		alertCounts: undefined,
		recentAlerts: undefined,
		onViewAlerts: undefined,
	},
};

/**
 * The `actions` slot, after the columns, for an app that keeps more of a patient's actions in the header. Intercept
 * Live leaves it empty: Video consult and Messages are in the app header since Nov 5, 2026.
 */
export const WithActions: Story = {
	args: {
		actions: (
			<>
				<Button variant='outline' size='lg'>
					<VideoIcon aria-hidden='true' />
					Video consult
				</Button>
				<Button variant='outline' size='lg' aria-label='Messages, 3 unread'>
					<MessageCircleMoreIcon aria-hidden='true' />
					Messages
					<Counter variant='secondary' count={3} aria-hidden='true' />
				</Button>
			</>
		),
	},
};

/** No photo: initials on the patient's tone. */
export const Initials: Story = {
	args: { photo: undefined },
};

/** More tags than fit: the row stays on one line and scrolls sideways (a mouse can slide it). */
export const ManyTags: Story = {
	args: {
		tags: [
			{ label: "Ventilated" },
			{ label: "2 pressors" },
			{ label: "CRRT" },
			{ label: "Insulin infusion" },
			{ label: "DNR/DNI" },
			{ label: "Allergies: Penicillin, Sulfa drugs, Latex" },
			{ label: "Droplet isolation" },
			{ label: "Fall risk" },
		],
	},
	decorators: [
		(Story) => (
			<div className='max-w-3xl'>
				<Story />
			</div>
		),
	],
};

/** Every state together. */
export const AllVariants: Story = {
	render: (args) => (
		<div className='flex flex-col gap-8 py-6'>
			<PatientHeader {...args} />
			<PatientHeader {...args} photo={undefined} />
			<PatientHeader {...args} {...NoAlerts.args} />
			<PatientHeader {...args} {...InsufficientData.args} />
			<PatientHeader {...args} {...TotalOnly.args} />
			<PatientHeader {...args} {...Minimal.args} />
			<PatientHeader {...args} {...WithActions.args} />
		</div>
	),
};
