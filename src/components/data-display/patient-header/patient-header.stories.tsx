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
		alertCounts: { critical: 1, low: 1 },
		onViewAlerts: fn(),
		onOpenLiveFeed: fn(),
	},
} satisfies Meta<typeof PatientHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * As in Figma: the 56px photo beside the name with sex and age ("- F, 59"), and one line under it: MRN and account, the
 * location after a pin, and the score as the cards write it. The tags (all outline) from the left edge, 8px below. On
 * the right, Live feed and the open alerts.
 */
export const Default: Story = {
	play: async ({ canvas, args }) => {
		await expect(canvas.getByRole("heading", { level: 1, name: "Miller, Sarah" })).toBeInTheDocument();
		await expect(canvas.getByText("- F, 59")).toBeInTheDocument();
		await expect(canvas.getByText(/Sidney Regional · MICU · 11 - Bed 11/)).toBeInTheDocument();
		await expect(canvas.getByText("6325DF2", { exact: false })).toBeInTheDocument();
		canvas.getByRole("button", { name: "2 active alerts" }).click();
		await expect(args.onViewAlerts).toHaveBeenCalled();
		canvas.getByRole("button", { name: "Live feed" }).click();
		await expect(args.onOpenLiveFeed).toHaveBeenCalled();
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

/** The live feed open: Live feed takes its pressed look (outline on the accent fill). */
export const LiveFeedOpen: Story = {
	args: { liveFeedOpen: true },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("button", { name: "Live feed" })).toHaveAttribute("aria-expanded", "true");
	},
};

/** Without `alertCounts`, `alert` gives the count; without handlers, no buttons. */
export const TotalOnly: Story = {
	args: { alertCounts: undefined, alert: { variant: "critical", count: 3 }, onOpenLiveFeed: undefined },
};

/** No score, no account and no buttons: the patient's side alone. */
export const Minimal: Story = {
	args: {
		acuity: undefined,
		trajectory: undefined,
		account: undefined,
		alertCounts: undefined,
		onViewAlerts: undefined,
		onOpenLiveFeed: undefined,
	},
};

/**
 * The `actions` slot, after the buttons, for an app that keeps more of a patient's actions in the header. Intercept
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
			<PatientHeader {...args} {...LiveFeedOpen.args} />
			<PatientHeader {...args} {...TotalOnly.args} />
			<PatientHeader {...args} {...Minimal.args} />
			<PatientHeader {...args} {...WithActions.args} />
		</div>
	),
};
