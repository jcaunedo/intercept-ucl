import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowUpFromLineIcon, CheckCheckIcon, GitForkIcon, ScanEyeIcon, VideoIcon, VideoOffIcon } from "lucide-react";
import { expect, fn, screen } from "storybook/test";

import { Button } from "@/components/buttons/button";

import { AlertExpanded, type AlertExpandedProps } from "./alert-expanded";

// Synthetic patient (PRD PC-180): Scenario 1's Margaret Hayes, as Figma draws her.
const hayes = {
	lastName: "Hayes",
	firstName: "Margaret",
	initials: "HM",
	tone: 3,
	sex: "F",
	age: 72,
	mrn: "00826154",
	hospital: "Chadron Community Hospital",
	unit: "Med-Surg",
	bed: "Bed 4",
	alert: { variant: "critical", inLast24h: 3, since: new Date(Date.now() - 214_000).toISOString() },
	title: "Rising work of breathing, positive fluid balance, HFrEF",
	description: "NEWS2 10, High: up 5 in 4 h",
	source: "Source: Rule · Deterioration score",
	acuity: { label: "NEWS2", score: 10, level: "high" },
	trajectory: { label: "Change in last 24 h", value: "+1", trend: "up" },
	monitor: {
		vitals: { hr: 134, spo2: 86, systolic: 84, diastolic: 48, map: 60, rr: 31 },
		alarmPriorities: { hr: "medium", spo2: "high", rr: "low" },
	},
	// With details, as Intercept Live passes them: each flag opens what it means and what's behind it now.
	tags: [
		{
			label: "NIV",
			details: {
				description: "Non-invasive ventilation: a mask, no breathing tube.",
				items: [
					{ label: "Mode", value: "BiPAP" },
					{ label: "IPAP", value: "12 cmH₂O" },
					{ label: "EPAP", value: "6 cmH₂O" },
					{ label: "FiO₂", value: "40%" },
				],
				source: "Ventilator",
				updatedAt: new Date(Date.now() - 4 * 60_000).toISOString(),
			},
		},
		{ label: "Fall risk", details: { description: "At higher risk of falling; the bedside team takes fall precautions." } },
	],
} satisfies AlertExpandedProps;

// The lifecycle buttons and the actions under the alert, as the alert modal passes them.
const lifecycle = (
	<>
		<Button variant='neutral' size='sm' className='flex-1 font-semibold'>
			<ScanEyeIcon />
			Acknowledge
		</Button>
		<Button variant='neutral' size='sm' className='flex-1 font-semibold'>
			<ArrowUpFromLineIcon />
			Escalate
		</Button>
		<Button variant='neutral' size='sm' className='flex-1 font-semibold'>
			<CheckCheckIcon />
			Resolve
		</Button>
	</>
);
const consult = (
	<>
		<Button variant='outline'>
			<VideoIcon />
			Video consult
		</Button>
		<Button variant='outline'>
			<GitForkIcon />
			View pathway
		</Button>
	</>
);

const meta = {
	title: "Overlays/Alert Expanded",
	component: AlertExpanded,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	args: { ...hayes, alertActions: lifecycle, actions: consult, onOpenPatient: fn(), onClose: fn() },
} satisfies Meta<typeof AlertExpanded>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As in Figma: Hayes's Critical alert, its lifecycle actions, Video consult and View pathway, her score, monitor and tags. */
export const Default: Story = {
	play: async ({ args, canvas, userEvent }) => {
		// The name opens the patient; the × closes the panel.
		await userEvent.click(canvas.getByRole("button", { name: "Hayes, Margaret, open patient" }));
		await expect(args.onOpenPatient).toHaveBeenCalled();
		await userEvent.click(canvas.getByRole("button", { name: "Close" }));
		await expect(args.onClose).toHaveBeenCalled();
		await expect(canvas.getByRole("heading", { name: hayes.title })).toBeInTheDocument();
		// A flag opens its details, as on the cards.
		await userEvent.click(canvas.getByRole("button", { name: "NIV" }));
		await expect(await screen.findByRole("dialog", { name: "NIV" })).toBeInTheDocument();
	},
};

/** With `href`, the name is a link to the patient's page. */
export const NameAsLink: Story = {
	args: { href: "#patient", onOpenPatient: undefined },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("link", { name: "Hayes, Margaret, open patient" })).toHaveAttribute("href", "#patient");
	},
};

/** Once addressed, the state line under the source; the lifecycle buttons that are left. */
export const WithStatus: Story = {
	args: {
		status: <p className='text-sm text-foreground'>✓ Acknowledged by you · 1:42 AM</p>,
	},
};

/** A resolved alert: the Resolved bar's green, neutral words, no lifecycle actions. */
export const Resolved: Story = {
	args: {
		alert: { variant: "resolved", inLast24h: 3, since: new Date(Date.now() - 15 * 3_600_000).toISOString() },
		status: <p className='text-sm text-foreground'>Resolved by Kayla Brandt, RN · 6:00 AM · Treated</p>,
		alertActions: undefined,
	},
};

/** Only what's required: the name, the alert and its heading. No ×, no actions, score, monitor or tags. */
export const Minimal: Story = {
	args: {
		alertActions: undefined,
		actions: undefined,
		acuity: undefined,
		trajectory: undefined,
		monitor: undefined,
		tags: undefined,
		description: undefined,
		onClose: undefined,
		onOpenPatient: undefined,
	},
};

/**
 * With `panels`: each slides out on the right as its own column, here Video consult and Pathway. UCL has no call tile
 * or pathway, so this story stands them in; Intercept Live passes its own (Layouts › Intercept Live › Alert modal ›
 * Panel).
 */
export const WithConsult: Story = {
	args: {
		// While the call is on, the consult button ends it: flat destructive.
		actions: (
			<>
				<Button variant='destructive-secondary'>
					<VideoOffIcon />
					End call
				</Button>
				<Button variant='outline'>
					<GitForkIcon />
					View pathway
				</Button>
			</>
		),
		panels: [
			{
				id: "consult",
				label: "Video consult",
				content: (
					<div className='flex aspect-[352/248] items-center justify-center rounded-card bg-(--gray-900) text-sm text-(--gray-300)'>
						The call goes here
					</div>
				),
			},
			{
				id: "pathway",
				label: "Pathway",
				content: <p className='text-sm text-muted-foreground'>The pathway goes here.</p>,
			},
		],
	},
	play: async ({ canvas }) => {
		await expect(await canvas.findByRole("complementary", { name: "Video consult" })).toBeInTheDocument();
		await expect(canvas.getByRole("complementary", { name: "Pathway" })).toBeInTheDocument();
	},
};

/** Each severity's panel: Critical, High, Medium and Low, then Resolved. */
export const AllVariants: Story = {
	render: (args) => (
		<div className='flex flex-col gap-6'>
			{(["critical", "high", "medium", "low", "resolved"] as const).map((variant) => (
				<AlertExpanded
					key={variant}
					{...args}
					alert={{ ...args.alert, variant }}
					alertActions={variant === "resolved" ? undefined : args.alertActions}
					monitor={undefined}
				/>
			))}
		</div>
	),
};
