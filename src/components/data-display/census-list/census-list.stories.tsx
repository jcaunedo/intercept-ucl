import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { CensusList, censusListPosition, type CensusListPatient } from "./census-list";

const patients: CensusListPatient[] = [
	{
		id: "p1",
		name: "Miller, Sarah",
		location: "MICU · Bed 11 · Sidney Regional",
		alert: { variant: "critical" },
		acuity: { label: "NEWS2", score: 17, level: "high" },
	},
	{
		id: "p2",
		name: "Johnson, Daniel",
		location: "MICU · Bed 3 · Sidney Regional",
		alert: { variant: "low" },
		acuity: { label: "NEWS2", score: 15, level: "high" },
	},
	{ id: "p3", name: "Bennett, Karen", location: "CCU · Bed 9 · Sidney Regional", acuity: { label: "NEWS2", score: 1, level: "low" } },
	{ id: "p4", name: "Carter, Emily", location: "MICU · Bed 6 · Sidney Regional", acuity: { label: "NEWS2" } },
	{
		id: "p5",
		name: "Erickson, Walter",
		location: "Med-Surg · Bed 6 · Chadron Memorial",
		alert: { variant: "high" },
		acuity: { label: "NEWS2", score: 2, level: "low" },
	},
	{
		id: "p6",
		name: "Hayes, Margaret",
		location: "Med-Surg · Bed 4 · Chadron Memorial",
		acuity: { label: "NEWS2", score: 5, level: "medium" },
	},
	// Discharged yesterday: never in the census list.
	{
		id: "p7",
		name: "Porter, Alan",
		location: "Discharged · Chadron Memorial",
		acuity: { label: "NEWS2", score: 1, level: "low" },
		inHospital: false,
	},
];

const meta = {
	title: "Data Display/CensusList",
	component: CensusList,
	tags: ["autodocs"],
	args: { patients, currentId: "p6", onSelectPatient: fn() },
	decorators: [
		(Story) => (
			<div className='flex h-[480px] w-80 flex-col border border-border bg-background py-3'>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof CensusList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The census in the source page's order: Hayes is on screen, so marked. Porter, discharged, isn't listed. */
export const Default: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByRole("button", { name: /Hayes, Margaret/ })).toHaveAttribute("aria-current", "page");
		await expect(canvas.queryByText("Porter, Alan")).toBeNull();
	},
};

/** Picking a patient calls `onSelectPatient` with their id. */
export const SelectPatient: Story = {
	play: async ({ args, canvasElement }) => {
		await userEvent.click(within(canvasElement).getByRole("button", { name: /Bennett, Karen/ }));
		await expect(args.onSelectPatient).toHaveBeenCalledWith("p3");
	},
};

/** As the shell uses it: picking a patient moves the mark, and the line over it counts the census only ("6 of 6"). */
export const WithPosition: Story = {
	render: function Render(args) {
		const [currentId, setCurrentId] = React.useState("p1");
		const { position, count } = censusListPosition(args.patients, currentId);
		return (
			<>
				<p className='px-6 pb-2 text-sm text-muted-foreground'>
					From Monitoring, in its order{position ? ` · ${position} of ${count}` : ""}
				</p>
				<CensusList {...args} currentId={currentId} onSelectPatient={setCurrentId} />
			</>
		);
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button", { name: /Hayes, Margaret/ }));
		await expect(canvas.getByText("From Monitoring, in its order · 6 of 6")).toBeInTheDocument();
	},
};

/** Without `onSelectPatient`, the rows are plain text, not buttons. */
export const ReadOnly: Story = {
	args: { onSelectPatient: undefined },
};

/** No one in hospital. */
export const Empty: Story = {
	args: { patients: patients.filter((patient) => patient.inHospital === false) },
};
