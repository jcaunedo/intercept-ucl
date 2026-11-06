import type { Meta, StoryObj } from "@storybook/react-vite";

import { LabTile } from "./lab-tile";

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const meta = {
	title: "Data Display/Lab Tile",
	component: LabTile,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div className='w-56'>
				<Story />
			</div>
		),
	],
	args: {
		name: "Lactate",
		value: "4.1",
		unit: "mmol/L",
		resultedAt: minutesAgo(43),
		previous: { value: "2.2", at: minutesAgo(400) },
	},
} satisfies Meta<typeof LabTile>;

export default meta;
type Story = StoryObj<typeof meta>;

/** In range: a neutral tile, the change muted. */
export const Default: Story = {};

/** Above the reference range: a tinted tile, "H", the change in the same hue. */
export const High: Story = { args: { flag: "high" } };

/** Below the reference range. */
export const Low: Story = {
	args: { flag: "low", name: "Potassium", value: "3.3", previous: { value: "3.8", at: minutesAgo(400) } },
};

/** A critical value: the value itself turns red, and so does the whole change line. */
export const Critical: Story = { args: { flag: "critical" } };

/** Collected, not resulted: "--" and when it was collected. */
export const Pending: Story = {
	args: { name: "Procalcitonin", value: undefined, unit: undefined, previous: undefined, collectedAt: minutesAgo(120) },
};

/** No earlier result to compare with. */
export const FirstResult: Story = { args: { previous: undefined } };

/** Every Figma variant: State=Resulted × Flag=None | High | Low | Critical, and State=Pending. */
export const AllVariants: Story = {
	decorators: [
		(Story) => (
			<div className='w-auto'>
				<Story />
			</div>
		),
	],
	render: (args) => (
		<div className='grid grid-cols-[repeat(5,14rem)] gap-2'>
			<LabTile {...args} />
			<LabTile {...args} flag='high' />
			<LabTile {...args} flag='low' />
			<LabTile {...args} flag='critical' />
			<LabTile {...args} value={undefined} previous={undefined} collectedAt={minutesAgo(120)} />
		</div>
	),
};

/** A key labs panel: tiles in a list, two to a row. */
export const KeyLabs: Story = {
	decorators: [
		(Story) => (
			<div className='w-96'>
				<Story />
			</div>
		),
	],
	render: () => (
		<ul aria-label='Key labs' className='grid grid-cols-2 gap-2'>
			{[
				{ name: "Lactate", value: "4.1", unit: "mmol/L", flag: "high", previous: "2.2" },
				{ name: "WBC", value: "17.2", unit: "K/µL", flag: "high", previous: "13.9" },
				{ name: "Creatinine", value: "1.9", unit: "mg/dL", flag: "high", previous: "1.4" },
				{ name: "Potassium", value: "3.3", unit: "mmol/L", flag: "low", previous: "3.8" },
				{ name: "Hemoglobin", value: "9.8", unit: "g/dL", flag: "low", previous: "10.6" },
			].map((lab) => (
				<li key={lab.name}>
					<LabTile
						name={lab.name}
						value={lab.value}
						unit={lab.unit}
						flag={lab.flag as "high" | "low"}
						resultedAt={minutesAgo(60)}
						previous={{ value: lab.previous, at: minutesAgo(180) }}
					/>
				</li>
			))}
			<li>
				<LabTile name='Procalcitonin' collectedAt={minutesAgo(100)} />
			</li>
		</ul>
	),
};
