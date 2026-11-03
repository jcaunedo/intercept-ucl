import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowUpFromLineIcon, CheckCheckIcon, ScanEyeIcon } from "lucide-react";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";

import { FilterBar, FilterBarControls, FilterBarFilters } from "@/components/forms/filter-bar";
import { SearchInput } from "@/components/forms/search-input";

import { FilterPanel, FilterPanelButton, filterPanelCount, type FilterPanelGroup, type FilterPanelValue } from "./filter-panel";

// A patient list's filters, with counts as the page would work them out.
const groups: FilterPanelGroup[] = [
	{
		id: "unit",
		title: "Unit",
		options: [
			{ id: "micu", label: "MICU", count: 6 },
			{ id: "sicu", label: "SICU", count: 4 },
			{ id: "med-surg", label: "Med-Surg", count: 5 },
			{ id: "ob-icu", label: "OB-ICU", count: 0 },
		],
	},
	{
		id: "alert",
		title: "Highest alert",
		options: [
			{ id: "critical", label: "Critical", count: 2, swatch: "bg-severity-critical" },
			{ id: "high", label: "High", count: 1, swatch: "bg-severity-high" },
			{ id: "medium", label: "Medium", count: 3, swatch: "bg-severity-medium" },
			{ id: "low", label: "Low", count: 2, swatch: "bg-severity-low" },
			{ id: "none", label: "No active alerts", count: 10, swatch: "bg-border" },
		],
	},
	{
		id: "status",
		title: "Alert status",
		options: [
			{ id: "acknowledged", label: "Acknowledged", count: 1, icon: ScanEyeIcon },
			{ id: "escalated", label: "Escalated", count: 0, icon: ArrowUpFromLineIcon },
			{ id: "resolved", label: "Resolved", count: 3, icon: CheckCheckIcon },
		],
	},
	{
		id: "limits",
		title: "Outside alarm limits",
		description: "A picked option keeps the patients outside the limit when it was picked.",
		options: [
			{ id: "hr", label: "HR", count: 2 },
			{ id: "spo2", label: "SpO₂", count: 3 },
		],
	},
];

const meta = {
	title: "Forms/Filter Panel",
	component: FilterPanel,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	args: {
		groups,
		countLabel: "patients",
		defaultOpen: true,
		onOpenChange: fn(),
		onValueChange: fn(),
		onDone: fn(),
	},
} satisfies Meta<typeof FilterPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Open, nothing picked: the search, then each group's options with their counts. An option that would show no one is
 * muted, still clickable. No footer until something is picked.
 */
export const Default: Story = {
	play: async () => {
		const panel = within(await screen.findByRole("dialog", { name: "Filters" }));
		await expect(panel.queryByRole("button", { name: "Done" })).not.toBeInTheDocument();
		await expect(panel.getByRole("searchbox", { name: "Search filters" })).toHaveFocus();
	},
};

/**
 * Picking an option brings in the footer: the summary, Clear all and Done. Clear all unpicks everything, and the
 * footer leaves; Done closes the panel.
 */
export const Picked: Story = {
	args: { summary: "5 of 18 patients in this view" },
	play: async ({ args }) => {
		const panel = within(await screen.findByRole("dialog", { name: "Filters" }));
		await userEvent.click(panel.getByRole("checkbox", { name: "Med-Surg" }));
		await expect(args.onValueChange).toHaveBeenLastCalledWith({ unit: ["med-surg"] });
		await expect(await panel.findByText("5 of 18 patients in this view")).toBeInTheDocument();
		await userEvent.click(panel.getByRole("button", { name: "Clear all" }));
		await expect(args.onValueChange).toHaveBeenLastCalledWith({});
		await waitFor(() => expect(panel.queryByRole("button", { name: "Done" })).not.toBeInTheDocument());
		await userEvent.click(panel.getByRole("checkbox", { name: "Critical" }));
		await userEvent.click(await panel.findByRole("button", { name: "Done" }));
		await expect(args.onDone).toHaveBeenCalled();
		await expect(args.onOpenChange).toHaveBeenLastCalledWith(false);
	},
};

/**
 * The search narrows the options: an option whose label matches, or a whole group whose title matches. Escape clears it
 * first and keeps the panel open; the next Escape closes it.
 */
export const Search: Story = {
	play: async ({ args }) => {
		const panel = within(await screen.findByRole("dialog", { name: "Filters" }));
		const search = panel.getByRole("searchbox", { name: "Search filters" });
		await userEvent.type(search, "alert");
		await expect(panel.getByRole("checkbox", { name: "Critical" })).toBeInTheDocument();
		await expect(panel.queryByRole("checkbox", { name: "MICU" })).not.toBeInTheDocument();
		await userEvent.clear(search);
		await userEvent.type(search, "zzz");
		await expect(panel.getByText('No filters match "zzz"')).toBeInTheDocument();
		await userEvent.keyboard("{Escape}");
		await expect(search).toHaveValue("");
		await expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
		await userEvent.keyboard("{Escape}");
		await expect(args.onOpenChange).toHaveBeenLastCalledWith(false);
	},
};

/** In a Filter Bar: the Filters button opens the panel and counts what's picked. */
export const InFilterBar: Story = {
	args: { defaultOpen: false },
	render: (args) => <BarExample {...args} />,
	play: async ({ canvas }) => {
		const button = canvas.getByRole("button", { name: "Filters" });
		await expect(button).toHaveAttribute("aria-expanded", "false");
		await userEvent.click(button);
		const panel = within(await screen.findByRole("dialog", { name: "Filters" }));
		await userEvent.click(panel.getByRole("checkbox", { name: "Critical" }));
		await userEvent.click(panel.getByRole("checkbox", { name: "High" }));
		await userEvent.click(await panel.findByRole("button", { name: "Done" }));
		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
		await expect(canvas.getByRole("button", { name: "Filters, 2 picked" })).toHaveAttribute("aria-expanded", "false");
	},
};

function BarExample(props: React.ComponentProps<typeof FilterPanel>) {
	const [open, setOpen] = React.useState(false);
	const [value, setValue] = React.useState<FilterPanelValue>({});
	const id = React.useId();
	return (
		<div className='p-6'>
			<FilterBar aria-label='Patient filters'>
				<FilterBarFilters>
					<SearchInput label='Search patients' />
				</FilterBarFilters>
				<FilterBarControls>
					<FilterPanelButton panelId={id} open={open} count={filterPanelCount(value)} onClick={() => setOpen(true)} />
				</FilterBarControls>
			</FilterBar>
			<FilterPanel
				{...props}
				id={id}
				open={open}
				onOpenChange={setOpen}
				value={value}
				onValueChange={setValue}
				summary={`${18 - filterPanelCount(value) * 3} of 18 patients in this view`}
			/>
		</div>
	);
}
