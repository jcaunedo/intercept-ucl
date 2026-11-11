import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import { PatientMonitor, type MonitorTrends, type MonitorVitals, type PatientMonitorProps } from "./patient-monitor";
import { useLiveVitals } from "./use-live-vitals";

// Synthetic patient (PRD PC-180).
const stable: MonitorVitals = { hr: 90, spo2: 98, systolic: 109, diastolic: 61, map: 77, rr: 17 };
const deteriorating: MonitorVitals = { hr: 134, spo2: 86, systolic: 84, diastolic: 48, map: 60, rr: 31 };

// An hour that ends at `end`, drifting from `start`, with a little beat-to-beat wobble.
const hour = (start: number, end: number, wobble: number) =>
	Array.from({ length: 60 }, (_, minute) => {
		const value = start + ((end - start) * minute) / 59 + Math.sin(minute * 1.7) * wobble;
		return Math.round(minute === 59 ? end : value);
	});
const deterioratingHour: MonitorTrends = {
	hr: hour(104, 134, 2),
	spo2: hour(94, 86, 0.6),
	systolic: hour(108, 84, 2),
	rr: hour(22, 31, 1),
};

/**
 * The monitor with live numbers: they vary as on a bedside monitor, without crossing an alarm limit (`useLiveVitals`),
 * and the waveforms follow the heart and breathing rates. Every story uses it.
 */
function LiveMonitor(props: PatientMonitorProps) {
	return <PatientMonitor {...props} vitals={useLiveVitals(props.vitals, props.limits)} />;
}

const meta = {
	title: "Data Display/PatientMonitor",
	component: PatientMonitor,
	render: (args) => <LiveMonitor {...args} />,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	args: {
		"aria-label": "Bedside monitor, Sarah Miller",
		vitals: stable,
	},
	decorators: [
		(Story) => (
			<div className='w-[366px]'>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof PatientMonitor>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Four lanes, II, Pleth, ABP and Resp, each with its numbers and alarm limits (the adult ICU defaults here). */
export const Default: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByRole("region", { name: "Bedside monitor, Sarah Miller" })).toBeInTheDocument();
		await expect(canvasElement.querySelectorAll("[data-alarm]")).toHaveLength(0);
	},
};

/** Values outside their alarm limits get a ▲ / ▼ in their label row; the parameter keeps its color. */
export const OutsideLimits: Story = {
	args: { vitals: deteriorating },
	play: async ({ canvasElement }) => {
		const sides = [...canvasElement.querySelectorAll("[data-alarm]")].map((numeric) => numeric.getAttribute("data-alarm"));
		await expect(sides).toEqual(["above", "below", "below", "above"]);
	},
};

/**
 * Device alarms, as the bedside monitor shows them (GE CARESCAPE): SpO₂ (high) flashes red, HR (medium) yellow, RR (low)
 * is steady cyan; ABP's alarm was acknowledged at the bedside, so it keeps its ▼ without the color.
 */
export const DeviceAlarms: Story = {
	args: {
		vitals: deteriorating,
		alarmPriorities: { hr: "medium", spo2: "high", systolic: "medium", rr: "low" },
		acknowledgedAlarms: ["systolic"],
	},
	play: async ({ canvasElement }) => {
		const priorities = [...canvasElement.querySelectorAll("[data-device-alarm]")].map((value) =>
			value.getAttribute("data-device-alarm"),
		);
		await expect(priorities).toEqual(["medium", "high", "low"]);
	},
};

/**
 * One-sided limits, as device profiles set them: RR alarms only above 30 and MAP only below 65. The side that's off
 * reads OFF. ABP alarms on its mean here, so it shows MAP's limits.
 */
export const OneSidedLimits: Story = {
	args: {
		vitals: { hr: 104, spo2: 94, systolic: 96, diastolic: 39, map: 58, rr: 34 },
		limits: { rr: [null, 30], map: [65, null] },
		alarmPriorities: { map: "high", rr: "medium" },
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getAllByText("OFF")).toHaveLength(2);
		await expect(canvas.getByText(/mean pressure below alarm limits/)).toBeInTheDocument();
	},
};

/** A reading that isn't coming in shows "--", never zero, and its lane is a flat line. */
export const MissingValues: Story = {
	args: { vitals: { hr: 88, systolic: 112, diastolic: 70, map: 84 } },
	play: async ({ canvasElement }) => {
		await expect(within(canvasElement).getAllByText("--")).toHaveLength(2);
	},
};

/** Each lane plots the parameter's last hour instead of its waveform, beside the same numbers and limits. */
export const Trends: Story = {
	args: { vitals: deteriorating, plot: "trends", trends: deterioratingHour },
};

/** The compact size, as in the small PatientMonitoringCard: a narrower numerics column and smaller numbers. */
export const Small: Story = {
	args: { size: "sm" },
	decorators: [
		(Story) => (
			<div className='w-[270px]'>
				<Story />
			</div>
		),
	],
};

/** A height in `className` stretches the lanes, e.g. to fill a column of the alert modal. */
export const Tall: Story = {
	args: { className: "h-[360px]" },
};

/** Every plot and size, stable and deteriorating. */
export const AllVariants: Story = {
	decorators: [
		(Story) => (
			<div className='w-[760px]'>
				<Story />
			</div>
		),
	],
	render: (args) => (
		<div className='grid grid-cols-2 gap-6'>
			<LiveMonitor {...args} aria-label='Waveforms, stable' />
			<LiveMonitor {...args} aria-label='Waveforms, deteriorating' vitals={deteriorating} />
			<LiveMonitor {...args} aria-label='Trends, deteriorating' vitals={deteriorating} plot='trends' trends={deterioratingHour} />
			<LiveMonitor {...args} aria-label='Small' size='sm' />
		</div>
	),
};
