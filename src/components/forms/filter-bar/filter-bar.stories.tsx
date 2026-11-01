import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	ActivityIcon,
	ArrowDownUpIcon,
	BellRingIcon,
	FilterIcon,
	Grid2x2Icon,
	Grid3x3Icon,
	ListIcon,
	TriangleIcon,
	UsersIcon,
} from "lucide-react";
import { expect, userEvent, within } from "storybook/test";

import { Button } from "@/components/buttons/button";
import { SearchInput } from "@/components/forms/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/forms/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/navigation/tabs";

import { FilterBar, FilterBarChip, FilterBarControls, FilterBarFilters } from "./filter-bar";

const meta = {
	title: "Forms/Filter Bar",
	component: FilterBar,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof FilterBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const quickViews = [
	{ id: "alerts", icon: BellRingIcon, label: "Active alerts", count: 5 },
	{ id: "range", icon: ActivityIcon, label: "Out of range", count: 8 },
	{ id: "rising", icon: TriangleIcon, label: "Rising score", count: 9 },
];

/** A Census-like bar: search, My patients and the quick views (at most one on), then the view toggle, sort and Filters. */
function ExampleBar({ className }: { className?: string }) {
	const [query, setQuery] = React.useState("");
	const [mine, setMine] = React.useState(false);
	const [view, setView] = React.useState<string | null>(null);

	return (
		<FilterBar aria-label='Patient filters' className={className}>
			<FilterBarFilters>
				<SearchInput label='Search patients' value={query} onValueChange={setQuery} />
				<FilterBarChip pressed={mine} onPressedChange={setMine} count={6}>
					<UsersIcon />
					My patients
				</FilterBarChip>
				<div role='group' aria-label='Quick views' className='contents'>
					{quickViews.map(({ id, icon: Icon, label, count }) => (
						<FilterBarChip
							key={id}
							pressed={view === id}
							onPressedChange={(pressed) => setView(pressed ? id : null)}
							count={count}
						>
							<Icon />
							{label}
						</FilterBarChip>
					))}
				</div>
			</FilterBarFilters>
			<FilterBarControls>
				<Tabs defaultValue='grid'>
					<TabsList aria-label='Density'>
						<TabsTrigger value='grid' aria-label='Comfortable'>
							<Grid2x2Icon />
						</TabsTrigger>
						<TabsTrigger value='compact' aria-label='Compact'>
							<Grid3x3Icon />
						</TabsTrigger>
						<TabsTrigger value='list' aria-label='List'>
							<ListIcon />
						</TabsTrigger>
					</TabsList>
				</Tabs>
				<Select defaultValue='news2'>
					<SelectTrigger aria-label='Sort by'>
						<ArrowDownUpIcon />
						<SelectValue />
					</SelectTrigger>
					<SelectContent position='popper' align='start'>
						<SelectItem value='news2'>NEWS2</SelectItem>
						<SelectItem value='alert'>Alert</SelectItem>
						<SelectItem value='name'>Name</SelectItem>
					</SelectContent>
				</Select>
				<Button variant='outline'>
					<FilterIcon />
					Filters
				</Button>
			</FilterBarControls>
		</FilterBar>
	);
}

/** The full bar, as on the Census. Pressing a quick view turns off the one that was on. */
export const Default: Story = {
	render: () => <ExampleBar />,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const alerts = canvas.getByRole("button", { name: /Active alerts/ });
		const range = canvas.getByRole("button", { name: /Out of range/ });
		await userEvent.click(alerts);
		await expect(alerts).toHaveAttribute("aria-pressed", "true");
		await userEvent.click(range);
		await expect(range).toHaveAttribute("aria-pressed", "true");
		await expect(alerts).toHaveAttribute("aria-pressed", "false");
		await userEvent.click(range);
		await expect(range).toHaveAttribute("aria-pressed", "false");
	},
};

/** On a narrow row the chips wrap within the left side, and the controls move below once both don't fit. */
export const Narrow: Story = {
	render: () => <ExampleBar className='max-w-xl' />,
};

/** A chip off and on, with and without a count. Off chips take the outline look on hover. */
export const Chips: Story = {
	render: () => (
		<div className='flex flex-wrap items-center gap-1'>
			<FilterBarChip>
				<UsersIcon />
				My patients
			</FilterBarChip>
			<FilterBarChip count={6}>
				<UsersIcon />
				My patients
			</FilterBarChip>
			<FilterBarChip defaultPressed>
				<UsersIcon />
				My patients
			</FilterBarChip>
			<FilterBarChip defaultPressed count={6}>
				<UsersIcon />
				My patients
			</FilterBarChip>
		</div>
	),
};

/** An uncontrolled chip toggles itself. */
export const ChipToggle: Story = {
	render: () => (
		<FilterBarChip count={5}>
			<BellRingIcon />
			Active alerts
		</FilterBarChip>
	),
	play: async ({ canvasElement }) => {
		const chip = within(canvasElement).getByRole("button", { name: /Active alerts/ });
		await expect(chip).toHaveAttribute("aria-pressed", "false");
		await userEvent.click(chip);
		await expect(chip).toHaveAttribute("aria-pressed", "true");
	},
};

/** Every state together: the bar, then the chip off and on. */
export const AllVariants: Story = {
	render: () => (
		<div className='flex flex-col gap-6'>
			<ExampleBar />
			<div className='flex flex-wrap items-center gap-1'>
				<FilterBarChip count={8}>
					<ActivityIcon />
					Out of range
				</FilterBarChip>
				<FilterBarChip defaultPressed count={8}>
					<ActivityIcon />
					Out of range
				</FilterBarChip>
			</div>
		</div>
	),
};
