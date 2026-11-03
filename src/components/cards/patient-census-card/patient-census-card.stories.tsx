import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowUpIcon, FlagIcon, SparklesIcon, WebcamIcon } from "lucide-react";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";

import {
	PatientCensusCard,
	PatientCardAlert,
	PatientCardMetric,
	type PatientCardAcuityLevel,
	type PatientCardAlertVariant,
	type PatientCensusCardProps,
} from "./patient-census-card";

// Synthetic patient (PRD PC-180). The vitals row follows Figma: HR, MAP, SpO₂, RR.
const patient = {
	lastName: "Miller",
	firstName: "Sarah",
	mrn: "01033876",
	sex: "F",
	age: 39,
	hospital: "Harbor Point General",
	unit: "MICU",
	room: "4",
	bed: "11",
	alert: { variant: "critical" },
	acuity: { label: "NEWS2", score: 5, level: "medium" },
	trajectory: { label: "Change in last 24 h", value: "+1", trend: "up", trendVariant: "critical" },
	vitals: [
		{ label: "Heart Rate", shortLabel: "HR", value: 77 },
		{ label: "MAP", value: 93 },
		{ label: "SpO₂", value: "97%" },
		{ label: "Resp. Rate", shortLabel: "RR", value: 18 },
	],
	tags: [{ label: "Ventilated" }, { label: "2 pressors" }],
} satisfies PatientCensusCardProps;

const meta = {
	title: "Cards/Patient Census Card",
	component: PatientCensusCard,
	subcomponents: { PatientCardAlert, PatientCardMetric },
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	args: { ...patient, onOpen: fn() },
	decorators: [
		// Figma draws the card 400px wide; in an app its grid column sets the width.
		(Story) => (
			<div className='w-[400px]'>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof PatientCensusCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Compact, the default, for the Census: identity, location, the top alert, acuity and tags, no vitals (the `vitals`
 * passed here show only on the expanded card). Click anywhere to open the patient.
 * Hover lifts the card, darkens its border and deepens its shadow.
 */
export const Default: Story = {};

/**
 * With an avatar leading the name row (intercept.ds `patient-card-compact`): `initials` (here in tone 1, Figma's blue),
 * or a `photo` with them as the fallback. 44px, centered on the name and identity; 32px on the small card.
 */
export const WithAvatar: Story = {
	args: { initials: "MS", tone: 1, alert: undefined },
	decorators: [
		(Story) => (
			<div className='flex items-start gap-4'>
				<Story />
			</div>
		),
	],
	render: (args) => (
		<>
			<PatientCensusCard {...args} />
			<PatientCensusCard {...args} size='sm' />
		</>
	),
	play: async ({ canvasElement }) => {
		await expect(canvasElement.querySelectorAll("[data-slot=avatar]")).toHaveLength(2);
	},
};

/** `variant="expanded"`: the vitals get their own row of metrics, for monitoring dashboards. */
export const Expanded: Story = {
	args: { variant: "expanded" },
};

/** Opens through a link instead of a handler, for apps that route with URLs. */
export const AsLink: Story = {
	args: { onOpen: undefined, href: "#patient-01033876" },
};

/**
 * `alertRing={false}`: no ring or tint, the card's default look, and the badge alone shows the alert. For pages where
 * patients are managed rather than watched (the Census).
 */
export const WithoutAlertRing: Story = {
	args: { alertRing: false },
};

/**
 * The alert badge as the Census shows it (intercept.ds `patient-census-card`): the bell in the severity's color, with
 * the count from 2 alerts, and no ring. With `onOpenAlert` the badge is a button that opens the alert (Intercept Live's
 * alert modal), not the patient; it darkens on hover.
 */
export const OpensAlert: Story = {
	args: { alert: { variant: "critical", count: 2 }, alertRing: false, onOpenAlert: fn() },
	play: async ({ canvas, args }) => {
		const badge = canvas.getByRole("button", { name: "Open alert: Critical 2 alerts" });
		await expect(badge).toHaveTextContent("2");
		badge.click();
		await expect(args.onOpenAlert).toHaveBeenCalled();
		await expect(args.onOpen).not.toHaveBeenCalled();
	},
};

/**
 * The "…" menu right of the name (`moreActions`), as on PatientMonitoringCard: it shows on hover, on keyboard focus in
 * the card, while its menu is open, and always where the device can't hover. It slides in as its slot opens, so the
 * alert badge glides aside.
 */
export const MoreActions: Story = {
	args: {
		alert: { variant: "critical", count: 2 },
		alertRing: false,
		moreActions: [
			{ label: "Ask Intercept Live", icon: SparklesIcon, onSelect: fn(), divider: true },
			{ label: "Escalate", icon: ArrowUpIcon, onSelect: fn() },
			{ label: "Huddle team", icon: WebcamIcon, onSelect: fn() },
			{ label: "Raise concern", icon: FlagIcon, onSelect: fn() },
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

/** Without `onOpen` or `href`: a static card, no hover. */
export const Static: Story = {
	args: { onOpen: undefined },
};

/** Out-of-range readings take the destructive color and an arrow; an unmonitored one shows "--". */
export const AbnormalAndMissingVitals: Story = {
	args: {
		variant: "expanded",
		alert: { variant: "high", count: 2 },
		trajectory: { label: "Change in last 24 h", value: "+3", trend: "up", variant: "destructive" },
		vitals: [
			{ label: "Heart Rate", value: 128, variant: "destructive", range: "above" },
			{ label: "MAP", value: 58, variant: "destructive", range: "below" },
			{ label: "SpO₂", value: "90%", variant: "destructive", range: "below" },
			{ label: "Resp. Rate", variant: "missing" },
		],
	},
};

/** No alert, no acuity and no tags: the card keeps only what it has, and "No tags" holds the tag row's height. */
export const Minimal: Story = {
	args: { alert: undefined, acuity: undefined, trajectory: undefined, tags: [] },
	play: async ({ canvas }) => {
		await expect(canvas.getByText("No tags")).toBeVisible();
	},
};

/** The small card (`size="sm"`), for the Census's Compact density: 12px padding, 16px name and score, 12px lines, `xs` tags. */
export const Small: Story = {
	args: { size: "sm", tags: [{ label: "Ventilated" }, { label: "2 pressors" }] },
	decorators: [
		(Story) => (
			<div className='w-56'>
				<Story />
			</div>
		),
	],
};

/**
 * A tag with `details` is a button: a click opens what it means and what's behind it now in a popover, and doesn't
 * open the patient. Escape closes it and focus returns to the tag; so does moving the mouse off the tag.
 */
export const TagDetails: Story = {
	args: {
		tags: [
			{ label: "Ventilated" },
			{
				label: "2 pressors",
				details: {
					description: "Drips that raise blood pressure, running now.",
					items: [
						{ label: "Norepinephrine", value: "0.22 mcg/kg/min" },
						{ label: "Vasopressin", value: "0.03 units/min" },
					],
					source: "Pump",
					updatedAt: new Date(Date.now() - 60_000).toISOString(),
				},
			},
		],
	},
	play: async ({ args, canvas }) => {
		const tag = canvas.getByRole("button", { name: "2 pressors" });
		await userEvent.click(tag);
		const popover = within(await screen.findByRole("dialog", { name: "2 pressors" }));
		await expect(popover.getByText("0.22 mcg/kg/min")).toBeInTheDocument();
		await expect(popover.getByText("Pump · 1 min ago")).toBeInTheDocument();
		await userEvent.click(popover.getByText("Norepinephrine"));
		await expect(args.onOpen).not.toHaveBeenCalled();
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
		await expect(tag).toHaveFocus();
		// Opened again, it closes as soon as the mouse leaves the tag.
		await userEvent.click(tag);
		await screen.findByRole("dialog", { name: "2 pressors" });
		await userEvent.unhover(tag);
		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
	},
};

/** A long name truncates on one line (full name on hover). A long hospital name truncates, so the unit, room and bed stay visible. */
export const LongContent: Story = {
	args: {
		lastName: "Montgomery-Abernathy",
		firstName: "Alexandria",
		hospital: "Saint Bartholomew's Regional Medical Center",
		unit: "Cardiothoracic ICU",
	},
};

/**
 * More tags than fit: they stay on one line, and the row scrolls sideways (wheel, trackpad, touch, or the arrow keys
 * once it's focused with Tab). A click on the row still opens the patient.
 */
export const ManyTags: Story = {
	args: {
		tags: [
			{ label: "Ventilated" },
			{ label: "2 pressors" },
			{ label: "ECMO" },
			{ label: "Contact isolation" },
			{ label: "Fall risk" },
			{ label: "DNR" },
		],
	},
	play: async ({ canvasElement, args }) => {
		const row = canvasElement.querySelector<HTMLElement>("[role='group'][aria-label^='Tags for']");
		if (!row) throw new Error("The tags row should be a focusable group when it overflows");
		const badges = [...row.children].map((badge) => badge.getBoundingClientRect().top);
		if (new Set(badges).size !== 1) throw new Error("Tags should stay on one line");
		if (row.scrollWidth <= row.clientWidth) throw new Error("The tags row should scroll");
		row.click();
		await expect(args.onOpen).toHaveBeenCalled();
	},
};

const alertVariants: PatientCardAlertVariant[] = ["critical", "high", "medium", "low", "resolved"];

/** Every alert pill, with and without a count, then `iconOnly` (the card's badge), with one alert and with 3. */
export const Alerts: Story = {
	render: () => (
		<div className='flex flex-col items-start gap-3'>
			{alertVariants.map((variant) => (
				<div key={variant} className='flex gap-3'>
					<PatientCardAlert variant={variant} />
					<PatientCardAlert variant={variant} count={3} />
					<PatientCardAlert variant={variant} iconOnly />
					<PatientCardAlert variant={variant} count={3} iconOnly />
				</div>
			))}
			<PatientCardAlert variant='message'>1 message</PatientCardAlert>
		</div>
	),
};

const acuityLevels: { level: PatientCardAcuityLevel; score?: number }[] = [
	{ level: "low", score: 2 },
	{ level: "moderate", score: 7 },
	{ level: "medium", score: 5 },
	{ level: "high", score: 10 },
	{ level: "critical", score: 13 },
	{ level: "unknown" },
];

/**
 * Every acuity level beside every alert severity. Acuity is neutral text after its score (Low, Moderate, Medium, High,
 * Critical, Unknown; Medium is NEWS2's band); alerts are solid pills (Critical / High / Medium / Low).
 */
export const AcuityAndAlerts: Story = {
	render: (args) => (
		<div className='grid grid-cols-[repeat(2,24.5rem)] gap-4'>
			{acuityLevels.map(({ level, score }, index) => (
				<PatientCensusCard
					key={level}
					{...args}
					alert={index < 4 ? { variant: (["low", "medium", "high", "critical"] as const)[index] } : undefined}
					acuity={{ label: "Score", score, level: score === undefined ? undefined : level }}
				/>
			))}
		</div>
	),
};

/** Every metric state, with trend and range arrows. */
export const Metrics: Story = {
	render: () => (
		<div className='grid grid-cols-4 gap-4'>
			<PatientCardMetric label='HR' value={88} />
			<PatientCardMetric label='HR' value={128} variant='destructive' range='above' />
			<PatientCardMetric label='HR' value={88} variant='success' />
			<PatientCardMetric label='HR' variant='missing' />
			<PatientCardMetric label='Change' value='+1' trend='up' />
			<PatientCardMetric label='Change' value='-2' trend='down' />
			<PatientCardMetric label='MAP' value={58} variant='destructive' range='below' />
			<PatientCardMetric label='SpO₂' value='97%' />
		</div>
	),
};

/** The card in each alert state, as a census grid shows them. */
export const AllVariants: Story = {
	decorators: [
		(Story) => (
			<div className='w-[824px]'>
				<Story />
			</div>
		),
	],
	render: (args) => (
		<div className='grid grid-cols-2 gap-6'>
			{alertVariants.map((variant, index) => (
				<PatientCensusCard key={variant} {...args} alert={{ variant, count: index % 2 ? 3 : undefined }} />
			))}
			<PatientCensusCard {...args} alert={{ variant: "message", label: "1 message" }} />
		</div>
	),
};
