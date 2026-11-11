import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";

import { TagsPopover, TagsPopoverActionsProvider, TagsPopoverGroup } from "./tags-popover";

// Times relative to when the story loads, so "1 min ago" reads the same in every session.
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const meta = {
	title: "Overlays/Tags Popover",
	component: TagsPopover,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		variant: { control: "select", options: ["outline", "secondary", "neutral"] },
		size: { control: "select", options: ["xs", "sm", "md", "lg"] },
	},
	args: {
		label: "2 pressors",
		variant: "outline",
		size: "sm",
		details: {
			changes: ["Epinephrine drip increased by 75% in the last 3 hours"],
			items: [
				{ label: "Epinephrine", value: "0.07 mcg/kg/min" },
				{ label: "Norepinephrine", value: "0.18 mcg/kg/min" },
			],
			source: "Pump",
			updatedAt: minutesAgo(1),
		},
	},
} satisfies Meta<typeof TagsPopover>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A flag with what changed and what's behind it: a click opens it; Escape closes it and returns focus to the tag.
 */
export const Default: Story = {
	play: async ({ canvas }) => {
		const tag = canvas.getByRole("button", { name: "2 pressors" });
		await userEvent.click(tag);
		const dialog = await screen.findByRole("dialog", { name: "2 pressors" });
		const popover = within(dialog);
		await expect(popover.getByText("Epinephrine drip increased by 75% in the last 3 hours")).toBeInTheDocument();
		await expect(popover.getByText("0.07 mcg/kg/min")).toBeInTheDocument();
		// Above the toasts (`--z-toast`, 60): what the user opens comes first (theme.css "Stacking order").
		await expect(getComputedStyle(dialog).zIndex).toBe("70");
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
		await expect(tag).toHaveFocus();
		// Focus is back on the tag, but without its ring; the next key brings it back.
		await expect(tag).toHaveAttribute("data-quiet-focus");
		const quiet = getComputedStyle(tag).boxShadow;
		await userEvent.keyboard("{Shift}");
		await expect(tag).not.toHaveAttribute("data-quiet-focus");
		// The ring animates in (the tag's box-shadow transition).
		await waitFor(() => expect(getComputedStyle(tag).boxShadow).not.toBe(quiet));
	},
};

/** Nothing changed lately: a muted line in place of the changes. */
export const NoChanges: Story = {
	args: {
		label: "Ventilated",
		details: {
			description: "No changes in the last 12 hours",
			items: [
				{ label: "Mode", value: "AC/VC" },
				{ label: "FiO₂", value: "40%" },
				{ label: "PEEP", value: "8 cmH₂O" },
			],
			source: "Ventilator",
			updatedAt: minutesAgo(2),
		},
	},
};

/**
 * An alert's findings, each a sentence after a semibold term, so a scan picks out every finding by its name (DESIGN.md
 * "Tags popover").
 */
export const Findings: Story = {
	args: {
		label: "COPD exacerbation",
		details: {
			items: [
				{ term: "Hypercapnic respiratory failure:", label: "pH 7.24, PaCO₂ 78, PaO₂ 58, HCO₃ 33 on arrival" },
				{ term: "Severe COPD:", label: "GOLD 3, 40 pack-years, home oxygen 2 L, out of it for 4 days" },
				{ term: "On BiPAP:", label: "20 min, IPAP 12 / EPAP 5, FiO₂ 35%. RR 30, HR 112, SpO₂ 88%" },
			],
			source: "Concern · ED consult request",
			updatedAt: minutesAgo(0),
		},
	},
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "COPD exacerbation" }));
		const popover = within(await screen.findByRole("dialog", { name: "COPD exacerbation" }));
		await expect(popover.getByText("Severe COPD:")).toHaveClass("font-semibold");
	},
};

/**
 * A value that's a sentence moves under its label as a paragraph (two rows); a short one stays beside its label,
 * right-aligned.
 */
export const ParagraphValue: Story = {
	args: {
		label: "Allergy: Iodinated contrast",
		details: {
			changes: ["Iodinated contrast added to the allergy list 6 hours ago"],
			items: [
				{ label: "Iodinated contrast", value: "Hives and itching during the cardiac cath, moderate · confirmed" },
				{ label: "Premedication", value: "On file" },
			],
			source: "Allergy list",
			updatedAt: minutesAgo(360),
		},
	},
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Allergy: Iodinated contrast" }));
		const popover = within(await screen.findByRole("dialog", { name: "Allergy: Iodinated contrast" }));
		const sentence = popover.getByText(/Hives and itching/);
		const label = popover.getByText("Iodinated contrast", { selector: "dt" });
		// Stacked: the sentence starts under its label, left-aligned.
		await waitFor(() => expect(sentence.getBoundingClientRect().top).toBeGreaterThan(label.getBoundingClientRect().bottom - 1));
		await expect(sentence).not.toHaveClass("text-right");
		// A short value stays beside its label.
		await expect(popover.getByText("On file")).toHaveClass("text-right");
	},
};

/**
 * With `action`: a full-width outline button at the bottom to what the flag leads to, here Fall risk's fall prevention
 * pathway (Nov 10, 2026, user's call; intercept.ds `Popover` `1352:13395`). Selecting it closes the popover.
 */
export const WithAction: Story = {
	args: {
		label: "Fall risk",
		details: {
			changes: ["Morse Fall Scale score up from 45 to 55 in the last 5 hours"],
			items: [
				{ label: "Morse Fall Scale", value: "55, high risk" },
				{ label: "Precautions", value: "Bed alarm on · Low bed, locked · Non-slip socks · Call light in reach" },
				{ label: "Assessed by", value: "Lucy Hart, RN" },
			],
			source: "Nursing assessment",
			updatedAt: minutesAgo(300),
			action: { label: "View fall prevention pathway", onSelect: fn() },
		},
	},
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Fall risk" }));
		const popover = within(await screen.findByRole("dialog", { name: "Fall risk" }));
		await userEvent.click(popover.getByRole("button", { name: "View fall prevention pathway" }));
		await expect(args.details.action?.onSelect).toHaveBeenCalled();
		await waitFor(() => expect(screen.queryByRole("dialog", { name: "Fall risk" })).not.toBeInTheDocument());
	},
};

// The app's one answer for every Fall risk tag, wherever it shows (WithActionsProvider).
const openFallPathway = fn();

/**
 * From a TagsPopoverActionsProvider (Nov 11, 2026, user's call: the button belongs to the popover, not to each page): the
 * app wraps itself once and every TagsPopover inside asks it for its button by label and `subject` (the patient). Here
 * both Fall risk tags get "View fall prevention pathway" without an `action` of their own; DNR gets none.
 */
export const WithActionsProvider: Story = {
	args: {
		label: "Fall risk",
		details: {
			items: [{ label: "Morse Fall Scale", value: "55, high risk" }],
			source: "Nursing assessment",
			updatedAt: minutesAgo(300),
			subject: "p2",
		},
	},
	render: (args) => (
		<TagsPopoverActionsProvider
			resolve={({ label, details }) =>
				label === "Fall risk" && details.subject
					? { label: "View fall prevention pathway", onSelect: () => openFallPathway(details.subject) }
					: undefined
			}
		>
			<TagsPopoverGroup>
				<div className='flex gap-2'>
					<TagsPopover {...args} />
					<TagsPopover label='DNR' details={{ items: [{ label: "Code status", value: "DNR" }], subject: "p2" }} />
				</div>
			</TagsPopoverGroup>
		</TagsPopoverActionsProvider>
	),
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "DNR" }));
		const dnr = within(await screen.findByRole("dialog", { name: "DNR" }));
		await expect(dnr.queryByRole("button", { name: "View fall prevention pathway" })).not.toBeInTheDocument();
		await userEvent.keyboard("{Escape}");
		await userEvent.click(canvas.getByRole("button", { name: "Fall risk" }));
		const popover = within(await screen.findByRole("dialog", { name: "Fall risk" }));
		await userEvent.click(popover.getByRole("button", { name: "View fall prevention pathway" }));
		await expect(openFallPathway).toHaveBeenCalledWith("p2");
	},
};

/** The tag at each Badge size the cards and the patient header use, and in their variants. */
export const AllVariants: Story = {
	render: (args) => (
		<div className='flex flex-col items-start gap-3'>
			{(["xs", "sm"] as const).map((size) => (
				<div key={size} className='flex gap-2'>
					{(["outline", "secondary", "neutral"] as const).map((variant) => (
						<TagsPopover key={variant} {...args} label={`${variant} · ${size}`} variant={variant} size={size} />
					))}
				</div>
			))}
		</div>
	),
};

/**
 * A row of flags in a TagsPopoverGroup (Nov 10, 2026, user's call): open one with a click, then move the mouse along the
 * row and each flag's popover opens in place of the last, no click needed. It stays open off the row; a click outside
 * closes it.
 */
export const Row: Story = {
	render: (args) => (
		<div className='flex gap-1.5'>
			<TagsPopoverGroup>
				<TagsPopover {...args} />
				<TagsPopover
					label='DNR'
					details={{ items: [{ label: "Code status", value: "DNR, ordered by Dr. Ellis" }], source: "Orders", updatedAt: minutesAgo(90) }}
				/>
				<TagsPopover
					label='Allergy: Iodinated contrast'
					details={{
						changes: ["Iodinated contrast added to the allergy list 6 hours ago"],
						items: [{ label: "Iodinated contrast", value: "Hives and itching during the cardiac cath, moderate · confirmed" }],
						source: "Allergy list",
						updatedAt: minutesAgo(360),
					}}
				/>
			</TagsPopoverGroup>
		</div>
	),
	play: async ({ canvas }) => {
		const pressors = canvas.getByRole("button", { name: "2 pressors" });
		const dnr = canvas.getByRole("button", { name: "DNR" });
		// Hover alone opens nothing.
		await userEvent.hover(dnr);
		await new Promise((resolve) => setTimeout(resolve, 300));
		await expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		// Once one is open, hovering another swaps to it.
		await userEvent.click(pressors);
		await screen.findByRole("dialog", { name: "2 pressors" });
		await userEvent.hover(dnr);
		await screen.findByRole("dialog", { name: "DNR" });
		await waitFor(() => expect(screen.queryByRole("dialog", { name: "2 pressors" })).not.toBeInTheDocument());
		await userEvent.hover(canvas.getByRole("button", { name: "Allergy: Iodinated contrast" }));
		await screen.findByRole("dialog", { name: "Allergy: Iodinated contrast" });
		await expect(screen.getAllByRole("dialog")).toHaveLength(1);
		// Tab steps along the row from the keyboard, looping from the last back to the first; Shift+Tab goes back.
		await userEvent.keyboard("{Tab}");
		await screen.findByRole("dialog", { name: "2 pressors" });
		await expect(pressors).toHaveFocus();
		await userEvent.keyboard("{Tab}");
		await screen.findByRole("dialog", { name: "DNR" });
		await expect(dnr).toHaveFocus();
		await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
		await screen.findByRole("dialog", { name: "2 pressors" });
		await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
		await screen.findByRole("dialog", { name: "Allergy: Iodinated contrast" });
		await expect(screen.getAllByRole("dialog")).toHaveLength(1);
		// Leaving the row keeps it open; a click outside closes it.
		await userEvent.unhover(canvas.getByRole("button", { name: "Allergy: Iodinated contrast" }));
		await new Promise((resolve) => setTimeout(resolve, 300));
		await expect(screen.getByRole("dialog", { name: "Allergy: Iodinated contrast" })).toBeInTheDocument();
		await userEvent.click(document.body);
		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
	},
};
