import type { Meta, StoryObj } from "@storybook/react-vite";

import { HospitalSectionHeader } from "./hospital-section-header";

const meta = {
	title: "Data Display/HospitalSectionHeader",
	component: HospitalSectionHeader,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	args: { name: "CVMC", patientCount: 4, alertCount: 3 },
} satisfies Meta<typeof HospitalSectionHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As in Figma. */
export const Default: Story = {};

/** One patient, one alert: singular words. */
export const Singular: Story = {
	args: { name: "Mercy West Hospital", patientCount: 1, alertCount: 1 },
};

/** No active alerts. */
export const NoAlerts: Story = {
	args: { name: "Harbor Point General", patientCount: 7, alertCount: 0 },
};

/** A long name truncates; the counts stay whole. */
export const LongName: Story = {
	args: { name: "Saint Elizabeth Regional Medical Center and Children's Hospital", patientCount: 12, alertCount: 5 },
	decorators: [
		(Story) => (
			<div className='w-80'>
				<Story />
			</div>
		),
	],
};

/** Every state together. */
export const AllVariants: Story = {
	render: () => (
		<div className='flex flex-col gap-6'>
			<HospitalSectionHeader name='CVMC' patientCount={4} alertCount={3} />
			<HospitalSectionHeader name='Mercy West Hospital' patientCount={1} alertCount={1} />
			<HospitalSectionHeader name='Harbor Point General' patientCount={7} alertCount={0} />
		</div>
	),
};
