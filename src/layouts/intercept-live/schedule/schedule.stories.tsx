import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, waitFor, within } from "storybook/test";

import { sampleHospitals, sampleShift, sampleShiftEndsAt, sampleTeam, sampleUser } from "../sample-data/sample-workspace";
import { samplePatients } from "../sample-data/sample-census";
import { sampleMonitoringAlerts, sampleMonitoringPatients } from "../monitoring/sample-data/sample-monitoring";
import { Schedule } from "./schedule";
import { clearPrototypeLocation } from "../sample-data/prototype-links";
import { sampleOpenShifts, sampleScheduleShifts } from "./sample-data/sample-schedule";

// The Schedule layout (`schedule.tsx`): Intercept Live's shell opened on Schedule, so the Sidebar, the header and the
// account menu are the app's. Its content is `SchedulePanel`.
const meta = {
	title: "Layouts/Intercept Live/Schedule",
	component: Schedule,
	parameters: {
		layout: "fullscreen",
	},
	beforeEach: () => clearPrototypeLocation({ onlyInTests: true }),
	args: {
		hospitals: sampleHospitals,
		patients: sampleMonitoringPatients,
		alerts: sampleMonitoringAlerts,
		censusPatients: samplePatients,
		user: sampleUser,
		shiftEndsAt: sampleShiftEndsAt,
		shift: sampleShift,
		team: sampleTeam,
		schedule: {
			shifts: sampleScheduleShifts,
			openShifts: sampleOpenShifts,
			onShiftAction: fn(),
			onNewRequest: fn(),
		},
	},
} satisfies Meta<typeof Schedule>;

export default meta;
type Story = StoryObj<typeof meta>;

const todayLabel = () =>
	new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

/**
 * The month on screen, today marked. Each day shows its shifts as chips in their type's color (Day, Night, On call,
 * Time off), dashed while still a draft; a chip opens the shift's details. The rail (from lg up) jumps to a day and
 * filters by shift type and hospital.
 */
export const Default: Story = {
	play: async ({ canvas, userEvent }) => {
		const month = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
		await expect(await canvas.findByRole("heading", { level: 1, name: month })).toBeVisible();
		// Today is a day shift: its details name the hospitals it covers and offer a swap.
		const today = canvas.getByRole("button", { name: new RegExp(`^${todayLabel()}, today`) });
		await expect(today).toHaveAttribute("aria-current", "date");
		const chip = canvas.getAllByRole("button", { name: /^Day shift, / })
			.find((button) => button.closest("li")?.contains(today));
		await userEvent.click(chip!);
		const details = within(await screen.findByRole("dialog"));
		await expect(details.getByRole("button", { name: "Request swap" })).toBeVisible();
		await expect(details.getByText("Chadron Memorial")).toBeVisible();
	},
};

/** A week on a 24-hour grid, scrolled to 6 AM: each shift a block from start to end, nights running into the next day. */
export const Week: Story = {
	args: { schedule: { ...meta.args.schedule, defaultView: "week" } },
	play: async ({ canvas, userEvent }) => {
		await expect(await canvas.findByRole("tab", { name: "Week", selected: true })).toBeVisible();
		await userEvent.click(canvas.getByRole("button", { name: "Next week" }));
		await userEvent.click(canvas.getByRole("button", { name: "Today" }));
		await expect(canvas.getAllByRole("button", { name: /^Day shift, / }).length).toBeGreaterThan(0);
	},
};

/** One day on the 24-hour grid. A day in the month view opens here. */
export const Day: Story = {
	args: { schedule: { ...meta.args.schedule, defaultView: "day" } },
};

/**
 * Open shifts: only those the clinician is eligible for, dashed. Request this shift sends it to the coordinator; the
 * shift then reads Requested and leaves the tab's count.
 */
export const OpenShifts: Story = {
	args: { schedule: { ...meta.args.schedule, defaultTab: "open", defaultView: "week" } },
	play: async ({ canvas, userEvent, args }) => {
		await expect(await canvas.findByRole("tab", { name: /^Open shifts/, selected: true })).toBeVisible();
		// Week by week until an open shift is on screen.
		let block = canvas.queryAllByRole("button", { name: /Open shift$/ })[0];
		for (let week = 0; !block && week < 5; week++) {
			await userEvent.click(canvas.getByRole("button", { name: "Next week" }));
			block = canvas.queryAllByRole("button", { name: /Open shift$/ })[0];
		}
		await userEvent.click(block!);
		await userEvent.click(await screen.findByRole("button", { name: "Request this shift" }));
		await waitFor(() => expect(args.schedule?.onShiftAction).toHaveBeenCalledWith(expect.any(String), "pick-up"));
	},
};

/** New request asks the coordinator for time off, a swap or availability. */
export const NewRequest: Story = {
	play: async ({ canvas, userEvent, args }) => {
		await userEvent.click(await canvas.findByRole("button", { name: "New request" }));
		await userEvent.click(await screen.findByRole("menuitem", { name: "Time off" }));
		await expect(args.schedule?.onNewRequest).toHaveBeenCalledWith("time-off");
	},
};

/** No open shifts the clinician can take. */
export const NoOpenShifts: Story = {
	args: { schedule: { ...meta.args.schedule, openShifts: [], defaultTab: "open" } },
	play: async ({ canvas }) => {
		await expect(await canvas.findByText("No open shifts you can take right now.")).toBeVisible();
	},
};
