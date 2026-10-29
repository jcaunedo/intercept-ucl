import type { Meta, StoryObj } from "@storybook/react-vite";
import { MessageCircleMoreIcon, VideoIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import samplePhoto3 from "@/components/data-display/avatar/images/sample-photo-3.png";

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
		sex: "F",
		age: 39,
		hospital: "Harbor Point General",
		unit: "MICU",
		bed: "Bed 11",
		details: ["ICU day 3", "64 kg"],
		alert: { variant: "critical", count: 3 },
		acuity: { label: "SOFA acuity score", score: 7, level: "moderate" },
		trajectory: { label: "Change in last 24 h", value: "+2", trend: "up", trendVariant: "critical" },
		tags: [
			{ label: "Full code", variant: "outline" },
			{ label: "Allergy: Penicillin", variant: "red" },
			{ label: "Droplet isolation", variant: "amber" },
			{ label: "Ventilated" },
			{ label: "On pressors" },
		],
		actions: (
			<>
				<Button variant='outline'>
					<MessageCircleMoreIcon aria-hidden='true' />3 messages
				</Button>
				<Button variant='neutral'>
					<VideoIcon aria-hidden='true' />
					Live Camera
				</Button>
			</>
		),
	},
} satisfies Meta<typeof PatientHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As in Figma: photo, Critical · 3, acuity with its rising 24h change, safety and organ support badges, Messages and Live Camera. */
export const Default: Story = {};

/** No photo: initials on the patient's tone. */
export const Initials: Story = {
	args: { photo: undefined },
};

/** No alert, acuity unchanged, no actions. */
export const Quiet: Story = {
	args: {
		alert: undefined,
		trajectory: { label: "Change in last 24 h", value: "0" },
		actions: undefined,
	},
};

/** Every state together. */
export const AllVariants: Story = {
	render: (args) => (
		<div className='flex flex-col gap-8 py-6'>
			<PatientHeader {...args} />
			<PatientHeader {...args} photo={undefined} />
			<PatientHeader {...args} alert={undefined} trajectory={{ label: "Change in last 24 h", value: "0" }} actions={undefined} />
		</div>
	),
};
