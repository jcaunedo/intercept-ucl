import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import {
	PatientCard,
	PatientCardAlert,
	PatientCardMetric,
	type PatientCardAcuityLevel,
	type PatientCardAlertVariant,
	type PatientCardProps,
} from "./patient-card";

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
	tags: [{ label: "Ventilated" }, { label: "On pressors" }],
} satisfies PatientCardProps;

const meta = {
	title: "Cards/Patient Card",
	component: PatientCard,
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
} satisfies Meta<typeof PatientCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Compact, the default, for the Census: identity, location, the top alert, acuity and tags, no vitals (the `vitals`
 * passed here show only on the expanded card). Click anywhere to open the patient.
 * Hover lifts the card, darkens its border and deepens its shadow.
 */
export const Default: Story = {};

/** `variant="expanded"`: the vitals get their own row of metrics, for monitoring dashboards. */
export const Expanded: Story = {
	args: { variant: "expanded" },
};

/** Opens through a link instead of a handler, for apps that route with URLs. */
export const AsLink: Story = {
	args: { onOpen: undefined, href: "#patient-01033876" },
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

/** No alert, no acuity and no tags: the card keeps only what it has. */
export const Minimal: Story = {
	args: { alert: undefined, acuity: undefined, trajectory: undefined, tags: [] },
};

/** The small card (`size="sm"`), for the Census's Compact density: 12px padding, 16px name and score, 12px lines, `xs` tags. */
export const Small: Story = {
	args: { size: "sm", tags: [{ label: "Ventilated" }, { label: "On pressors" }] },
	decorators: [
		(Story) => (
			<div className='w-56'>
				<Story />
			</div>
		),
	],
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
			{ label: "On pressors" },
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

const alertVariants: PatientCardAlertVariant[] =["critical", "high", "medium", "low", "resolved"];

/** Every alert pill, with and without a count. */
export const Alerts: Story = {
	render: () => (
		<div className='flex flex-col items-start gap-3'>
			{alertVariants.map((variant) => (
				<div key={variant} className='flex gap-3'>
					<PatientCardAlert variant={variant} />
					<PatientCardAlert variant={variant} count={3} />
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
				<PatientCard
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
			{alertVariants.map((variant) => (
				<PatientCard key={variant} {...args} alert={{ variant }} />
			))}
			<PatientCard {...args} alert={{ variant: "message", label: "1 message" }} />
		</div>
	),
};
