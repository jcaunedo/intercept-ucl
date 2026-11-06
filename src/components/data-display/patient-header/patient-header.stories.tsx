import type { Meta, StoryObj } from "@storybook/react-vite";
import { MessageCircleMoreIcon, VideoIcon } from "lucide-react";

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
		sex: "F",
		age: 39,
		hospital: "Harbor Point General",
		unit: "MICU",
		bed: "Bed 11",
		details: ["ICU day 3", "64 kg"],
		tags: [
			{ label: "Ventilated" },
			{ label: "2 pressors" },
			{ label: "Allergy: Penicillin" },
			{ label: "Droplet isolation" },
		],
	},
} satisfies Meta<typeof PatientHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * As in Figma: the 56px photo beside the name and the line under it (MRN, sex and age, and location), then the tags (all
 * outline) from the left edge, 12px below. No score: the page's Overview shows it.
 */
export const Default: Story = {};

/**
 * The `actions` slot on the right, for an app that keeps a patient's actions in the header. Intercept Live leaves it
 * empty: Video consult and Messages are in the app header since Nov 5, 2026.
 */
export const WithActions: Story = {
	args: {
		actions: (
			<>
				<Button variant='outline'>
					<VideoIcon aria-hidden='true' />
					Video consult
				</Button>
				<Button variant='outline' aria-label='Messages, 3 unread'>
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
			<PatientHeader {...args} {...WithActions.args} />
		</div>
	),
};
