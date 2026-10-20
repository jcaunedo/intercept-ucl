import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { Input } from "@/components/forms/input";

import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "./field";

const meta = {
	title: "Forms/Field",
	component: Field,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	decorators: [(Story) => <div className='w-72'>{Story()}</div>],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma's Input with "Show Label" on. */
export const Default: Story = {
	render: () => (
		<Field>
			<FieldLabel htmlFor='app-name'>App name</FieldLabel>
			<Input id='app-name' placeholder='My new app' />
		</Field>
	),
};

/** Figma's Input with "Show Helper" on. */
export const WithDescription: Story = {
	render: () => (
		<Field>
			<FieldLabel htmlFor='app-slug'>App URL</FieldLabel>
			<Input id='app-slug' placeholder='inventory-tracker' aria-describedby='app-slug-help' />
			<FieldDescription id='app-slug-help'>Lowercase letters, numbers and dashes.</FieldDescription>
		</Field>
	),
};

/**
 * Figma State=Error. `data-invalid` on the Field, `aria-invalid` on the control, and the message in FieldError.
 * Test: the field is named by its label, marked invalid, described by the error, and the error is announced.
 */
export const Invalid: Story = {
	render: () => (
		<Field data-invalid='true'>
			<FieldLabel htmlFor='work-email'>Work email</FieldLabel>
			<Input id='work-email' type='email' defaultValue='julio@' aria-invalid='true' aria-describedby='work-email-error' />
			<FieldError id='work-email-error'>Enter a complete email, like name@company.com.</FieldError>
		</Field>
	),
	play: async ({ canvas, userEvent }) => {
		const input = canvas.getByRole("textbox", { name: "Work email" });
		await expect(input).toBeInvalid();
		await expect(input).toHaveAccessibleDescription("Enter a complete email, like name@company.com.");
		await expect(canvas.getByRole("alert")).toHaveTextContent("Enter a complete email, like name@company.com.");

		// The label is wired to the field: clicking it moves focus into the input.
		await userEvent.click(canvas.getByText("Work email"));
		await expect(input).toHaveFocus();
	},
};

/** `errors` takes react-hook-form's error objects and shows each message once. Test: duplicates collapse to one item. */
export const MultipleErrors: Story = {
	render: () => (
		<Field data-invalid='true'>
			<FieldLabel htmlFor='password'>Password</FieldLabel>
			<Input id='password' type='password' defaultValue='abc' aria-invalid='true' aria-describedby='password-error' />
			<FieldError
				id='password-error'
				errors={[{ message: "Use at least 12 characters." }, { message: "Add a number." }, { message: "Use at least 12 characters." }]}
			/>
		</Field>
	),
	play: async ({ canvas }) => {
		const items = canvas.getAllByRole("listitem");
		await expect(items).toHaveLength(2);
		await expect(items.map((item) => item.textContent)).toEqual(["Use at least 12 characters.", "Add a number."]);
	},
};

/** Figma State=Disabled: the label keeps its color. */
export const Disabled: Story = {
	render: () => (
		<Field data-disabled='true'>
			<FieldLabel htmlFor='workspace'>Workspace</FieldLabel>
			<Input id='workspace' defaultValue='Intercept' disabled />
			<FieldDescription>Only workspace owners can rename it.</FieldDescription>
		</Field>
	),
};

export const Group: Story = {
	render: () => (
		<FieldSet>
			<FieldLegend>Blueprint</FieldLegend>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor='blueprint-name'>Name</FieldLabel>
					<Input id='blueprint-name' placeholder='Inventory tracker' />
				</Field>
				<Field>
					<FieldLabel htmlFor='blueprint-users'>User types</FieldLabel>
					<Input id='blueprint-users' placeholder='Admin, Staff' aria-describedby='blueprint-users-help' />
					<FieldDescription id='blueprint-users-help'>Separate user types with commas.</FieldDescription>
				</Field>
			</FieldGroup>
		</FieldSet>
	),
};
