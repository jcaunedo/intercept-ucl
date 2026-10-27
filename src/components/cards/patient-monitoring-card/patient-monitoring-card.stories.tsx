import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import {
	PatientMonitoringCard,
	type MonitorTrends,
	type MonitorVitals,
	type PatientMonitoringCardProps,
} from "./patient-monitoring-card";
import { useLiveVitals } from "./use-live-vitals";

// Synthetic patient (PRD PC-180).
const stable: MonitorVitals = { hr: 86, spo2: 97, systolic: 118, diastolic: 72, map: 87, rr: 16 };
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
 * The card with live numbers: they vary as on a bedside monitor, without crossing an alarm limit (`useLiveVitals`),
 * and the waveforms follow the heart and breathing rates. Every story uses it.
 */
function LiveCard(props: PatientMonitoringCardProps) {
	return <PatientMonitoringCard {...props} vitals={useLiveVitals(props.vitals, props.limits)} />;
}

const meta = {
	title: "Cards/PatientMonitoringCard",
	component: PatientMonitoringCard,
	render: (args) => <LiveCard {...args} />,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	args: {
		lastName: "Miller",
		firstName: "Sarah",
		mrn: "01033876",
		sex: "F",
		age: 39,
		hospital: "Harbor Point General",
		unit: "MICU",
		bed: "Bed 11",
		vitals: stable,
		onOpen: fn(),
	},
	decorators: [
		(Story) => (
			<div className='w-[398px]'>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof PatientMonitoringCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Condensed (default): the ECG strip and HR, SpO₂, BP and RR. The expand button shows the full monitor. */
export const Default: Story = {};

/** The full monitor: one waveform lane per parameter, with its numbers and alarm limits. */
export const Expanded: Story = {
	args: { defaultExpanded: true },
};

/**
 * An alert, as on the Census cards: the ring and tint pulse in step with every other alert card until the card is
 * clicked or the alert is acknowledged or escalated. Values outside their alarm limits get a ↑ / ↓ tag.
 */
export const Alarm: Story = {
	args: {
		vitals: deteriorating,
		alert: { variant: "critical", count: 3 },
		defaultExpanded: true,
	},
};

/** An acknowledged alert: the ring rests at 2px, no pulse. */
export const AcknowledgedAlert: Story = {
	args: { vitals: deteriorating, alert: { variant: "high", status: "acknowledged" } },
};

/** As on the Census prototype: opening the card resolves its alert; the pill turns Resolved and the ring blinks green once. */
export const ClickToResolve: Story = {
	args: { vitals: deteriorating },
	render: function Render(args) {
		const [resolved, setResolved] = React.useState(false);
		return (
			<LiveCard
				{...args}
				alert={resolved ? { variant: "resolved" } : { variant: "critical", count: 3 }}
				onOpen={() => setResolved(true)}
			/>
		);
	},
};

/** Missing values show "--", never zero; a parameter without a rate draws a flat line. */
export const MissingValues: Story = {
	args: { vitals: { hr: 92, systolic: 110, diastolic: 70, map: 83 }, defaultExpanded: true },
};

/** Compact (`size="sm"`), for the Compact panel: four a row at 1728. Smaller type, tighter padding, a shorter monitor. */
export const Small: Story = {
	args: { size: "sm" },
	decorators: [
		(Story) => (
			<div className='w-[300px]'>
				<Story />
			</div>
		),
	],
};

/** The 1-hour trends plot: a sparkline under each numeric instead of the ECG strip, here a patient drifting worse. */
export const Trends: Story = {
	args: {
		vitals: deteriorating,
		trends: deterioratingHour,
		plot: "trends",
		alert: { variant: "critical", count: 3 },
	},
};

/** The full monitor with the trends plot: each lane is the parameter's last hour, beside its numbers and limits. */
export const FullTrends: Story = {
	args: {
		vitals: deteriorating,
		trends: deterioratingHour,
		plot: "trends",
		defaultExpanded: true,
		alert: { variant: "critical", count: 3 },
	},
};

/** Condensed and expanded, stable and alarming; then the trends plot, condensed and full, and the compact size. */
export const AllVariants: Story = {
	decorators: [
		(Story) => (
			<div className='w-[812px]'>
				<Story />
			</div>
		),
	],
	render: (args) => (
		<div className='grid grid-cols-2 items-start gap-4'>
			<LiveCard {...args} />
			<LiveCard {...args} vitals={deteriorating} alert={{ variant: "critical", count: 3 }} />
			<LiveCard {...args} defaultExpanded />
			<LiveCard {...args} vitals={deteriorating} alert={{ variant: "critical", count: 3 }} defaultExpanded />
			<LiveCard {...args} vitals={deteriorating} trends={deterioratingHour} plot='trends' />
			<LiveCard {...args} vitals={deteriorating} trends={deterioratingHour} plot='trends' defaultExpanded />
			<div className='col-span-2 grid grid-cols-[300px_300px] items-start gap-3'>
				<LiveCard {...args} size='sm' />
				<LiveCard {...args} size='sm' vitals={deteriorating} trends={deterioratingHour} plot='trends' />
			</div>
		</div>
	),
};
