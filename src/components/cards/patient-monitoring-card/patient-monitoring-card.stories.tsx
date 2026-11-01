import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowUpIcon, FlagIcon, WebcamIcon } from "lucide-react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

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

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

/**
 * Condensed (default): the ECG strip and HR, SpO₂, BP and RR. The page sets `expanded` for the full monitor. Without an
 * alert, the alert bar says "No active alerts".
 */
export const Default: Story = {};

/**
 * With an avatar left of the name, as on PatientCard: `initials` (in an Avatar `tone`), or a `photo` with them as the
 * fallback. 44px, centered on the name and identity; 32px on the small card. Clicks on it open the patient.
 */
export const WithAvatar: Story = {
	args: { initials: "MS", tone: 1, unreadMessages: 1 },
	play: async ({ args, canvasElement }) => {
		// The avatar lets clicks through, so click what's under its center: the card's open target.
		const avatar = canvasElement.querySelector("[data-slot='avatar']")!.getBoundingClientRect();
		const target = document.elementFromPoint(avatar.x + avatar.width / 2, avatar.y + avatar.height / 2) as HTMLElement;
		await userEvent.click(target);
		await expect(args.onOpen).toHaveBeenCalled();
	},
};

/**
 * The alert bar under the name and location: the top severity, how many alerts the patient had in the last 24 h
 * (`inLast24h`), and how long ago it started (`since`), ticking each second; "Resolved" in green; "No active alerts".
 */
export const AlertBar: Story = {
	decorators: [
		(Story) => (
			<div className='w-[812px]'>
				<Story />
			</div>
		),
	],
	render: (args) => (
		<div className='grid grid-cols-2 items-start gap-4'>
			<LiveCard
				{...args}
				vitals={deteriorating}
				alert={{ variant: "critical", count: 2, inLast24h: 3, since: minutesAgo(3.6) }}
			/>
			<LiveCard {...args} alert={{ variant: "high", inLast24h: 1, since: minutesAgo(12) }} />
			<LiveCard {...args} alert={{ variant: "resolved", inLast24h: 3, since: minutesAgo(905) }} />
			<LiveCard {...args} />
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText("No active alerts")).toBeVisible();
		await expect(canvas.getAllByText(/in the last 24 h/)).toHaveLength(3);
	},
};

/** A new message from the patient's family: a message icon right of the name, a button with `onOpenMessages`. */
export const FamilyMessage: Story = {
	args: { unreadMessages: 1, onOpenMessages: fn() },
	play: async ({ args, canvasElement }) => {
		await userEvent.click(within(canvasElement).getByRole("button", { name: "1 new message from family" }));
		await expect(args.onOpenMessages).toHaveBeenCalled();
		await expect(args.onOpen).not.toHaveBeenCalled();
	},
};

/**
 * The "…" menu right of the name (`moreActions`): it shows on hover, on keyboard focus in the card, while its menu is
 * open, and always where the device can't hover. It slides in as its slot opens, so the message icon glides aside.
 */
export const MoreActions: Story = {
	args: {
		unreadMessages: 2,
		moreActions: [
			{ label: "Raise concern", icon: FlagIcon, onSelect: fn() },
			{ label: "Huddle team", icon: WebcamIcon, onSelect: fn() },
			{ label: "Escalate", icon: ArrowUpIcon, onSelect: fn() },
		],
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		// Tab reaches it while it's hidden, and focus shows it (it slides in).
		const button = canvas.getByRole("button", { name: "More actions for Miller, Sarah" });
		button.focus();
		await waitFor(() => expect(button).toBeVisible());
		await userEvent.click(button);
		await expect(await within(document.body).findByRole("menuitem", { name: "Escalate" })).toBeInTheDocument();
		await userEvent.keyboard("{Escape}");
	},
};

/**
 * With the acuity score and its change over the monitor, and the tags under it, as on PatientCard. The page shows or
 * hides them (Monitoring's Card details); without `tags` there's no row, and an empty list says "No tags".
 */
export const ScoreAndTags: Story = {
	args: {
		acuity: { label: "NEWS2", score: 7, level: "high" },
		trajectory: { label: "Change in last 24 h", value: "+1", trend: "up", trendVariant: "critical" },
		tags: [{ label: "On pressors" }, { label: "Dialysis" }],
	},
};

/** The small card with its score and tags. */
export const SmallScoreAndTags: Story = {
	args: { ...ScoreAndTags.args, size: "sm" },
};

/** The full monitor: one waveform lane per parameter, with its numbers and alarm limits. */
export const Expanded: Story = {
	args: { defaultExpanded: true },
};

/**
 * An alert, as on Monitoring: the ring and tint pulse in step with every other alert card until the card is
 * clicked or the alert is acknowledged or escalated. Values outside their alarm limits get a ▲ / ▼ triangle.
 */
export const Alarm: Story = {
	args: {
		vitals: deteriorating,
		alert: { variant: "critical", count: 3 },
		defaultExpanded: true,
	},
};

/**
 * Device alarms, as the bedside monitor shows them (GE CARESCAPE): a value outside its limits takes its alarm priority's
 * box. SpO₂ (high) flashes red at about 1.5 Hz, HR (medium) yellow at about 0.5 Hz, RR (low) is steady cyan; ABP's alarm
 * was acknowledged at the bedside, so it keeps its ▼ without the color. Steady under reduced motion.
 */
export const DeviceAlarms: Story = {
	args: {
		vitals: deteriorating,
		defaultExpanded: true,
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

/** An acknowledged alert: the ring rests at 2px, no pulse. */
export const AcknowledgedAlert: Story = {
	args: { vitals: deteriorating, alert: { variant: "high", status: "acknowledged" } },
};

/** As on the Census prototype: opening the card resolves its alert; the bar turns Resolved and the ring blinks green once. */
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
