import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, waitFor, within } from "storybook/test";

import { MessageHeader } from "./message-header";

const kelly = { name: "Kelly Ortiz, RN", initials: "KO", tone: 4, presence: "online" } as const;
const sarah = { name: "Miller, Sarah", place: "MICU · Bed 11", initials: "SM", tone: 1 } as const;

const meta = {
	title: "Data Display/MessageHeader",
	component: MessageHeader,
	tags: ["autodocs"],
	args: {
		person: kelly,
		role: "Bedside nurse · Sidney Regional · Hospital messaging",
		patient: sarah,
		onOpenPatient: fn(),
		onToggleDetails: fn(),
	},
	decorators: [
		(Story) => (
			<div className='w-[63rem] max-w-full border border-border'>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof MessageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The person and their role · hospital · channel, then the patient bar, which opens and closes the patient's details (a
 * `panel-right` icon at its end); the patient's name opens their page, underlined on hover. Test: the bar is a collapsed
 * toggle named for the patient, and a click on it calls `onToggleDetails`, not `onOpenPatient`; a click on the name calls
 * `onOpenPatient`, not `onToggleDetails`.
 */
export const Default: Story = {
	play: async ({ canvasElement, args, userEvent }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByRole("heading", { level: 2, name: "Kelly Ortiz, RN" })).toBeVisible();
		const bar = canvas.getByRole("button", { name: "Miller, Sarah, patient details" });
		await expect(bar).toHaveAttribute("aria-expanded", "false");
		await userEvent.click(bar);
		await expect(args.onToggleDetails).toHaveBeenCalledOnce();
		await expect(args.onOpenPatient).not.toHaveBeenCalled();
		await userEvent.click(canvas.getByRole("button", { name: "Miller, Sarah, open patient" }));
		await expect(args.onOpenPatient).toHaveBeenCalledOnce();
		await expect(args.onToggleDetails).toHaveBeenCalledOnce();
	},
};

/**
 * When the last message came, before Urgent: ConversationRow's time, "12 min ago" with the exact time in its tooltip.
 * Test: a `time` element reads "12 min ago" and carries the exact time.
 */
export const SentAt: Story = {
	args: { sentAt: new Date(Date.now() - 12 * 60_000).toISOString(), urgent: true },
	play: async ({ canvasElement }) => {
		// The time shows once the client knows the minute (after the first render), as on ConversationRow.
		await waitFor(() => expect(canvasElement.querySelector("time")).not.toBeNull());
		const time = canvasElement.querySelector("time");
		// The minute clock rounds down, so 12 minutes back reads 11 or 12.
		await expect(time).toHaveTextContent(/^1[12] min ago$/);
		await expect(time).toHaveAttribute("title");
		await expect(time).toHaveAttribute("dateTime");
	},
};

/** An urgent conversation: the solid red Urgent badge on the right. */
export const Urgent: Story = {
	args: { urgent: true },
	play: async ({ canvasElement }) => {
		await expect(within(canvasElement).getByText("Urgent")).toBeVisible();
	},
};

/**
 * Details open: the bar is expanded, its icon intercept.ds `panel-right-alt` (the panel drawn solid) in `icon`, in place
 * of `panel-right`. Test: `aria-expanded`, `aria-controls`, and the icon swap.
 */
export const DetailsOpen: Story = {
	args: { detailsOpen: true, detailsId: "patient-details" },
	play: async ({ canvasElement }) => {
		const bar = within(canvasElement).getByRole("button", { name: "Miller, Sarah, patient details" });
		await expect(bar).toHaveAttribute("aria-expanded", "true");
		await expect(bar).toHaveAttribute("aria-controls", "patient-details");
		const strip = canvasElement.querySelector("[data-slot=message-header-patient]")!;
		await expect(strip.querySelector(".lucide-panel-right")).toBeNull();
		await expect(strip.querySelector("svg.text-icon")).not.toBeNull();
	},
};

/**
 * No `onToggleDetails` (Intercept Live below xl, where the details can't show): the whole bar opens the patient, an
 * arrow at its end; the keyboard reaches it through the name. Test: the name isn't a toggle, and a click on it, then on
 * the rest of the bar, each call `onOpenPatient`.
 */
export const OpensPatient: Story = {
	args: { onToggleDetails: undefined },
	play: async ({ canvasElement, args, userEvent }) => {
		const name = within(canvasElement).getByRole("button", { name: "Miller, Sarah, open patient" });
		await expect(name).not.toHaveAttribute("aria-expanded");
		await userEvent.click(name);
		await expect(args.onOpenPatient).toHaveBeenCalledOnce();
		const bar = canvasElement.querySelector<HTMLElement>("[data-slot=message-header-patient-button]");
		await userEvent.click(bar!);
		await expect(args.onOpenPatient).toHaveBeenCalledTimes(2);
	},
};

/**
 * `patientHref`: the name is a real link to the patient's page, so Cmd/Ctrl+click opens it in a new tab; a plain click
 * still calls `onOpenPatient` and stays in place. Test: a link to the address, and a click calls `onOpenPatient`.
 */
export const PatientLink: Story = {
	args: { patientHref: "#patient-sarah-miller" },
	play: async ({ canvasElement, args, userEvent }) => {
		const link = within(canvasElement).getByRole("link", { name: "Miller, Sarah, open patient" });
		await expect(link).toHaveAttribute("href", "#patient-sarah-miller");
		await userEvent.click(link);
		await expect(args.onOpenPatient).toHaveBeenCalledOnce();
		await expect(args.onToggleDetails).not.toHaveBeenCalled();
	},
};

/** A conversation about no patient: no bar. */
export const NoPatient: Story = {
	args: { patient: undefined },
	play: async ({ canvasElement }) => {
		await expect(canvasElement.querySelector("[data-slot=message-header-patient]")).toBeNull();
	},
};

/** Neither `onToggleDetails` nor `onOpenPatient`: the bar is text, without an icon. */
export const StaticPatient: Story = {
	args: { onOpenPatient: undefined, onToggleDetails: undefined },
	play: async ({ canvasElement }) => {
		await expect(within(canvasElement).queryByRole("button", { name: /Miller, Sarah/ })).toBeNull();
	},
};

const sarahSummary =
	"MAP has fallen from 70 to 58 mmHg as norepinephrine went up to 0.22, lactate has nearly doubled to 4.1, and Sepsis Sniffer flagged her as a sepsis candidate 2 min ago.";

/**
 * A summary of the patient after their place on the bar (intercept.ds `about-patient`), 14/20 `foreground`, cut off on
 * one line. Test: the summary shows on the bar, and it's the bar's description, since the bar's label replaces its text
 * for screen readers.
 */
export const PatientSummary: Story = {
	args: { patientSummary: sarahSummary },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const bar = canvas.getByRole("button", { name: "Miller, Sarah, patient details" });
		await expect(canvasElement.querySelector("[data-slot=message-header-patient]")).toHaveTextContent(
			/MICU · Bed 11 +- +MAP has fallen/,
		);
		await expect(bar).toHaveAccessibleDescription(sarahSummary);
	},
};

/** A narrow screen showing the conversation alone: Back before the avatar. */
export const WithBack: Story = {
	args: { onBack: fn() },
	play: async ({ canvasElement, args, userEvent }) => {
		await userEvent.click(within(canvasElement).getByRole("button", { name: "Back to conversations" }));
		await expect(args.onBack).toHaveBeenCalledOnce();
	},
};

/** Every state together. */
export const AllVariants: Story = {
	render: (args) => (
		<div className='flex flex-col gap-6'>
			<MessageHeader {...args} />
			<MessageHeader {...args} urgent sentAt={new Date(Date.now() - 12 * 60_000).toISOString()} detailsOpen patientSummary={sarahSummary} />
			<MessageHeader {...args} patient={undefined} />
			<MessageHeader {...args} onToggleDetails={undefined} patientSummary={sarahSummary} />
			<MessageHeader {...args} onBack={fn()} onOpenPatient={undefined} onToggleDetails={undefined} />
		</div>
	),
};
