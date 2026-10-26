import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { PatientMonitoringCard, type MonitorVitals } from "./patient-monitoring-card";

// Synthetic patient (PRD PC-180).
const stable: MonitorVitals = { hr: 86, spo2: 97, systolic: 118, diastolic: 72, map: 87, rr: 16 };
const deteriorating: MonitorVitals = { hr: 134, spo2: 86, systolic: 84, diastolic: 48, map: 60, rr: 31 };

const meta = {
	title: "Cards/PatientMonitoringCard",
	component: PatientMonitoringCard,
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
 * clicked or the alert is acknowledged or escalated. Values outside their alarm limits get no highlight on the monitor.
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

/** As on the Census prototype: opening the card resolves its alert; the pill turns Resolved and the ring fades out. */
export const ClickToResolve: Story = {
	args: { vitals: deteriorating },
	render: function Render(args) {
		const [resolved, setResolved] = React.useState(false);
		return (
			<PatientMonitoringCard
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

// Drifts each value by a small step every 2s, like a live feed, for the Live story.
function useDriftingVitals(start: MonitorVitals) {
	const [vitals, setVitals] = React.useState(start);
	React.useEffect(() => {
		const drift = (value: number | undefined, step: number, min: number, max: number) =>
			value === undefined ? undefined : Math.min(max, Math.max(min, value + Math.round((Math.random() - 0.5) * 2 * step)));
		const timer = window.setInterval(() => {
			setVitals((current) => {
				const systolic = drift(current.systolic, 2, 105, 128);
				const diastolic = drift(current.diastolic, 1, 66, 78);
				return {
					hr: drift(current.hr, 2, 80, 94),
					spo2: drift(current.spo2, 1, 95, 99),
					systolic,
					diastolic,
					map: systolic !== undefined && diastolic !== undefined ? Math.round((systolic + 2 * diastolic) / 3) : current.map,
					rr: drift(current.rr, 1, 14, 18),
				};
			});
		}, 2000);
		return () => window.clearInterval(timer);
	}, []);
	return vitals;
}

/** A live feed: the numbers drift slightly every 2 seconds and the waveforms follow the heart and breathing rates. */
export const Live: Story = {
	render: function Render(args) {
		const vitals = useDriftingVitals(stable);
		return <PatientMonitoringCard {...args} vitals={vitals} defaultExpanded />;
	},
};

/** Condensed and expanded, stable and alarming. */
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
			<PatientMonitoringCard {...args} />
			<PatientMonitoringCard {...args} vitals={deteriorating} alert={{ variant: "critical", count: 3 }} />
			<PatientMonitoringCard {...args} defaultExpanded />
			<PatientMonitoringCard {...args} vitals={deteriorating} alert={{ variant: "critical", count: 3 }} defaultExpanded />
		</div>
	),
};
