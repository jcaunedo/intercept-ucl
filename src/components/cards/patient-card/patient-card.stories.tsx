import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

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
	acuity: { label: "SOFA acuity score", score: 7, level: "moderate" },
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
	args: { ...patient, onOpen: fn(), onMoreActions: fn() },
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

/** Compact, the default. Click anywhere to open the patient; the "…" button is a separate target. Hover lifts the card, darkens its border and deepens its shadow. */
export const Default: Story = {};

/** `variant="expanded"`: the vitals get their own row of metrics, for monitoring dashboards. */
export const Expanded: Story = {
	args: { variant: "expanded" },
};

/** Compact with out-of-range and missing readings: the same colors and arrows as the expanded card. */
export const CompactAbnormal: Story = {
	args: {
		variant: "compact",
		alert: { variant: "high", count: 2 },
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 128, variant: "destructive", range: "above" },
			{ label: "MAP", value: 58, variant: "destructive", range: "below" },
			{ label: "SpO₂", value: "90%", variant: "destructive", range: "below" },
			{ label: "Resp. Rate", shortLabel: "RR", variant: "missing" },
		],
	},
};

/** Opens through a link instead of a handler, for apps that route with URLs. */
export const AsLink: Story = {
	args: { onOpen: undefined, href: "#patient-01033876" },
};

/** Without `onOpen`, `href` or `onMoreActions`: a static card, no hover, no "…" button. */
export const Static: Story = {
	args: { onOpen: undefined, onMoreActions: undefined },
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
	args: { alert: undefined, acuity: undefined, trajectory: undefined, tags: [], onMoreActions: undefined },
};

/** A long name wraps so it's always readable. A long hospital name truncates, so the unit, room and bed stay visible. */
export const LongContent: Story = {
	args: {
		lastName: "Montgomery-Abernathy",
		firstName: "Alexandria",
		hospital: "Saint Bartholomew's Regional Medical Center",
		unit: "Cardiothoracic ICU",
	},
};

const alertVariants: PatientCardAlertVariant[] = ["critical", "high", "medium", "low", "resolved"];

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
	{ level: "high", score: 10 },
	{ level: "critical", score: 13 },
	{ level: "unknown" },
];

/**
 * Every acuity level beside every alert severity. The scales never share a label: acuity always says "risk" (pale
 * badges); alerts are Critical / High / Medium / Low (solid pills).
 */
export const AcuityAndAlerts: Story = {
	render: (args) => (
		<div className='grid grid-cols-[repeat(2,24.5rem)] gap-4'>
			{acuityLevels.map(({ level, score }, index) => (
				<PatientCard
					key={level}
					{...args}
					alert={index < 4 ? { variant: (["low", "medium", "high", "critical"] as const)[index] } : undefined}
					acuity={{ label: "SOFA acuity score", score, level: score === undefined ? undefined : level }}
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
