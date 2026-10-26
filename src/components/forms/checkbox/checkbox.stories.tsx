import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/forms/field";
import { Label } from "@/components/forms/label";

import { Checkbox } from "./checkbox";

const meta = {
	title: "Forms/Checkbox",
	component: Checkbox,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	args: {
		"aria-label": "Send a weekly summary",
	},
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = {
	args: { defaultChecked: true },
};

/** Some, not all, of a group is selected. Test: it's announced as "mixed". */
export const Indeterminate: Story = {
	args: { defaultChecked: "indeterminate" },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("checkbox")).toHaveAttribute("aria-checked", "mixed");
	},
};

export const Disabled: Story = {
	args: { disabled: true },
};

/** An option label: regular weight, 8px from the box, `muted` when disabled. */
export const WithLabel: Story = {
	render: () => (
		<div className='flex flex-col gap-3'>
			<div className='flex items-center gap-2'>
				<Checkbox id='summary' />
				<Label htmlFor='summary'>Send a weekly summary</Label>
			</div>
			<div className='flex items-center gap-2'>
				<Checkbox id='summary-off' disabled />
				<Label htmlFor='summary-off'>Send a daily summary</Label>
			</div>
		</div>
	),
};

/** With a description, using Field's horizontal layout. */
export const WithDescription: Story = {
	render: () => (
		<Field orientation='horizontal' className='w-80'>
			<Checkbox id='auth' defaultChecked />
			<FieldContent>
				<FieldLabel htmlFor='auth'>Add sign-in</FieldLabel>
				<FieldDescription>Adds email and social sign-in for every user type.</FieldDescription>
			</FieldContent>
		</Field>
	),
};

function SelectAll() {
	const modules = ["Inventory", "Orders", "Suppliers"];
	const [selected, setSelected] = React.useState<string[]>(["Inventory"]);
	const all = selected.length === modules.length ? true : selected.length ? "indeterminate" : false;

	return (
		<div className='flex flex-col gap-3'>
			<div className='flex items-center gap-2'>
				<Checkbox id='all-modules' checked={all} onCheckedChange={(value) => setSelected(value === true ? modules : [])} />
				<Label htmlFor='all-modules'>All modules</Label>
			</div>
			{modules.map((module) => (
				<div key={module} className='ml-6 flex items-center gap-2'>
					<Checkbox
						id={module}
						checked={selected.includes(module)}
						onCheckedChange={(value) => setSelected((current) => (value === true ? [...current, module] : current.filter((item) => item !== module)))}
					/>
					<Label htmlFor={module}>{module}</Label>
				</div>
			))}
		</div>
	);
}

/**
 * Partial in use: the parent checkbox reflects its children.
 * Test: some selected → mixed; parent selects all; clearing one child → mixed again; parent clears all.
 */
export const SelectAllPattern: Story = {
	render: () => <SelectAll />,
	play: async ({ canvas, userEvent, step }) => {
		const parent = canvas.getByRole("checkbox", { name: "All modules" });
		const children = ["Inventory", "Orders", "Suppliers"].map((name) => canvas.getByRole("checkbox", { name }));

		await step("One of three selected: the parent is mixed", async () => {
			await expect(parent).toHaveAttribute("aria-checked", "mixed");
		});

		await step("The parent selects every module", async () => {
			await userEvent.click(parent);
			await expect(parent).toBeChecked();
			for (const child of children) await expect(child).toBeChecked();
		});

		await step("Clearing one module makes the parent mixed again", async () => {
			await userEvent.click(children[1]);
			await expect(children[1]).not.toBeChecked();
			await expect(parent).toHaveAttribute("aria-checked", "mixed");
		});

		await step("The parent selects all, then clears all", async () => {
			await userEvent.click(parent);
			await expect(parent).toBeChecked();
			await userEvent.click(parent);
			await expect(parent).not.toBeChecked();
			for (const child of children) await expect(child).not.toBeChecked();
		});

		await step("Space toggles a focused checkbox", async () => {
			children[0].focus();
			await userEvent.keyboard(" ");
			await expect(children[0]).toBeChecked();
			await expect(parent).toHaveAttribute("aria-checked", "mixed");
		});
	},
};

export const Invalid: Story = {
	args: { "aria-invalid": true },
};

export const AllVariants: Story = {
	render: () => (
		<div className='flex flex-col gap-3'>
			{(
				[
					["Default", {}],
					["Selected", { defaultChecked: true }],
					["Partial", { defaultChecked: "indeterminate" }],
					["Disabled", { disabled: true }],
					["Selected, disabled", { defaultChecked: true, disabled: true }],
					["Error", { "aria-invalid": true }],
				] as const
			).map(([label, state]) => (
				<div key={label} className='flex items-center gap-2'>
					<Checkbox id={`all-${label}`} {...state} />
					<Label htmlFor={`all-${label}`}>{label}</Label>
				</div>
			))}
		</div>
	),
};
