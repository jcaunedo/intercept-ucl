import type * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CheckCheckIcon, EllipsisIcon } from "lucide-react";
import { expect, within } from "storybook/test";

import { Avatar, AvatarFallback } from "@/components/data-display/avatar";
import { Badge } from "@/components/data-display/badge";
import { Button } from "@/components/buttons/button";
import { Checkbox } from "@/components/forms/checkbox";

import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "./table";

type Patient = {
	name: string;
	initials: string;
	tone: 1 | 2 | 3 | 4 | 5 | 6;
	mrn: string;
	unit: string;
	room: string;
	news2: number;
};

const patients: Patient[] = [
	{ name: "Miller, Sarah", initials: "SM", tone: 1, mrn: "MRN 4471920", unit: "ICU", room: "12 - A", news2: 7 },
	{ name: "Hayes, Margaret", initials: "MH", tone: 2, mrn: "MRN 3092217", unit: "Step-down", room: "4 - B", news2: 5 },
	{ name: "Reynolds, Dale", initials: "DR", tone: 3, mrn: "MRN 5518304", unit: "ED", room: "Bay 3", news2: 6 },
	{ name: "Ruiz, Maria", initials: "MR", tone: 4, mrn: "MRN 6620148", unit: "Med-surg", room: "18 - A", news2: 2 },
	{ name: "Walker, Thomas", initials: "TW", tone: 5, mrn: "MRN 7731025", unit: "ICU", room: "9 - B", news2: 4 },
	{ name: "Brandt, Kayla", initials: "KB", tone: 6, mrn: "MRN 8842316", unit: "Step-down", room: "2 - A", news2: 1 },
];

/** The row's options, last in the row. The header keeps an empty column for it. */
function RowActions({ name }: { name: string }) {
	return (
		<Button variant='ghost' size='icon-xs' aria-label={`More actions for ${name}`} className='text-icon-subtle'>
			<EllipsisIcon />
		</Button>
	);
}

function Heading({ variant = "flat" }: { variant?: "default" | "flat" }) {
	return (
		<TableHeader variant={variant}>
			<TableRow className='hover:bg-transparent'>
				<TableHead>Patient</TableHead>
				<TableHead>Unit</TableHead>
				<TableHead>Room</TableHead>
				<TableHead>NEWS2</TableHead>
				<TableHead className='w-px'>
					<span className='sr-only'>Actions</span>
				</TableHead>
			</TableRow>
		</TableHeader>
	);
}

function Rows({
	count = 6,
	avatar = false,
	detail = false,
	checkbox = false,
}: {
	count?: number;
	avatar?: boolean;
	detail?: boolean;
	checkbox?: boolean;
}) {
	return (
		<TableBody>
			{patients.slice(0, count).map((patient) => (
				<TableRow key={patient.mrn}>
					<TableCell>
						<div className='flex items-center gap-4'>
							{checkbox ? <Checkbox aria-label={`Select ${patient.name}`} /> : null}
							{avatar ? (
								<div className='flex min-w-0 items-center gap-3'>
									<Avatar size='sm'>
										<AvatarFallback tone={patient.tone}>{patient.initials}</AvatarFallback>
									</Avatar>
									<div className='flex min-w-0 flex-col gap-0.5'>
										<span className='truncate'>{patient.name}</span>
										{detail ? <span className='truncate text-xs font-normal text-muted-foreground'>{patient.mrn}</span> : null}
									</div>
								</div>
							) : (
								<span className='truncate'>{patient.name}</span>
							)}
						</div>
					</TableCell>
					<TableCell>{patient.unit}</TableCell>
					<TableCell>{patient.room}</TableCell>
					<TableCell>{patient.news2}</TableCell>
					<TableCell className='w-px'>
						<RowActions name={patient.name} />
					</TableCell>
				</TableRow>
			))}
		</TableBody>
	);
}

/** Infusion volumes with their total. */
function TotalTable(props: React.ComponentProps<typeof Table>) {
	return (
		<Table {...props} aria-label='Infusions'>
			<TableHeader>
				<TableRow className='hover:bg-transparent'>
					<TableHead>Infusion</TableHead>
					<TableHead className='text-right'>Volume in last 24 h</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				<TableRow>
					<TableCell>Norepinephrine</TableCell>
					<TableCell className='text-right'>412 mL</TableCell>
				</TableRow>
				<TableRow>
					<TableCell>Propofol</TableCell>
					<TableCell className='text-right'>288 mL</TableCell>
				</TableRow>
				<TableRow>
					<TableCell>Fentanyl</TableCell>
					<TableCell className='text-right'>120 mL</TableCell>
				</TableRow>
			</TableBody>
			<TableFooter>
				<TableRow className='hover:bg-transparent'>
					<TableCell>Total</TableCell>
					<TableCell>820 mL</TableCell>
				</TableRow>
			</TableFooter>
			<TableCaption>Charted by the bedside nurse.</TableCaption>
		</Table>
	);
}

type Message = {
	id: string;
	from: string;
	initials: string;
	tone: 5 | 6 | 7 | 8 | 9;
	role: string;
	subject: string;
	preview: string;
	kind: "Request" | "Update" | "System";
	at: string;
	unread: boolean;
};

const messages: Message[] = [
	{
		id: "m1",
		from: "Kayla Brandt, RN",
		initials: "KB",
		tone: 5,
		role: "Bedside nurse",
		subject: "Family asking for an update on Sarah Miller",
		preview: "Her husband is here and asking whether the plan changed overnight. Could someone call him before rounds?",
		kind: "Request",
		at: "4 min ago",
		unread: true,
	},
	{
		id: "m2",
		from: "Laura Mitchell, MD",
		initials: "LM",
		tone: 6,
		role: "Attending",
		subject: "Co-signed the sepsis bundle orders",
		preview: "All four orders are active. Lactate is due again at 7:04 PM.",
		kind: "Update",
		at: "18 min ago",
		unread: true,
	},
	{
		id: "m3",
		from: "Intercept Live",
		initials: "IL",
		tone: 7,
		role: "System",
		subject: "SpO₂ not reporting for Dale Reynolds",
		preview: "The pulse oximeter at Alliance ED Bay 3 stopped sending values 6 minutes ago.",
		kind: "System",
		at: "1 h ago",
		unread: false,
	},
	{
		id: "m4",
		from: "Daniel Reyes",
		initials: "DR",
		tone: 8,
		role: "Pharmacist",
		subject: "Vancomycin trough is due",
		preview: "Draw it before the 11 PM dose so we can adjust for her kidney function.",
		kind: "Request",
		at: "Yesterday",
		unread: false,
	},
	{
		id: "m5",
		from: "Emily Carter, RN",
		initials: "EC",
		tone: 9,
		role: "Charge nurse",
		subject: "Bed 11 is ready for the transfer",
		preview: "Cleaned and set up with a ventilator. The family can wait in the lounge.",
		kind: "Update",
		at: "Nov 11",
		unread: false,
	},
];

const kindVariants = { Request: "amber", Update: "secondary", System: "blue" } as const;

const meta = {
	title: "Data Display/Table",
	component: Table,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

// Row heights are measured within 1px: collapsed borders give each row half of the rule it shares with the next.
const near = (value: number, target: number) => expect(Math.abs(value - target)).toBeLessThanOrEqual(1);

/**
 * `sm`: 40px rows under the flat heading row. The first cell of a row is semibold. intercept.ds
 * [Table 40](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1531-7580).
 */
export const Default: Story = {
	render: (args) => (
		<Table {...args} aria-label='Patients'>
			<Heading />
			<Rows />
		</Table>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const rows = canvas.getAllByRole("row");
		await expect(rows).toHaveLength(patients.length + 1);
		near(rows[0].getBoundingClientRect().height, 40);
		near(rows[1].getBoundingClientRect().height, 40);
		await expect(canvas.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
	},
};

/** `md`: 48px rows. intercept.ds [Table 48](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1531-7581). */
export const Medium: Story = {
	args: { size: "md" },
	render: Default.render,
	play: async ({ canvasElement }) => {
		const rows = within(canvasElement).getAllByRole("row");
		near(rows[1].getBoundingClientRect().height, 48);
		// The heading row stays 40px.
		near(rows[0].getBoundingClientRect().height, 40);
	},
};

/** The heading row on the page's background instead of the grey fill. */
export const DefaultHeader: Story = {
	render: (args) => (
		<Table {...args} aria-label='Patients'>
			<Heading variant='default' />
			<Rows />
		</Table>
	),
};

/**
 * An avatar before the first cell's text, at `md`. intercept.ds
 * [Avatar 1](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1531-7582).
 */
export const WithAvatars: Story = {
	args: { size: "md" },
	render: (args) => (
		<Table {...args} aria-label='Patients'>
			<Heading />
			<Rows count={5} avatar />
		</Table>
	),
};

/**
 * A second line under the name grows each row to 56px. intercept.ds
 * [Avatar 2](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1531-7583).
 */
export const WithAvatarsAndDetail: Story = {
	args: { size: "md" },
	render: (args) => (
		<Table {...args} aria-label='Patients'>
			<Heading />
			<Rows count={5} avatar detail />
		</Table>
	),
	play: async ({ canvasElement }) => {
		const rows = within(canvasElement).getAllByRole("row");
		near(rows[1].getBoundingClientRect().height, 56);
	},
};

/** A checkbox first in each row, 16px before the text. */
export const WithCheckbox: Story = {
	render: (args) => (
		<Table {...args} aria-label='Patients'>
			<Heading />
			<Rows checkbox />
		</Table>
	),
};

/** The total row: a grey fill, the label medium, the total semibold at the right. */
export const WithTotal: Story = {
	render: (args) => <TotalTable {...args} />,
	play: async ({ canvasElement }) => {
		const rows = within(canvasElement).getAllByRole("row");
		near(rows[rows.length - 1].getBoundingClientRect().height, 40);
	},
};

/**
 * `lg`: an inbox. A 44px heading row with a checkbox that selects every message, then 70px rows, 12px above and below
 * and from the edges: a checkbox, the unread dot (`info`), who it's from with their role, the subject over a one-line
 * preview, its type, its date and two actions. intercept.ds
 * [Inbox table](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1531-7584).
 */
export const Inbox: Story = {
	args: { size: "lg" },
	render: (args) => (
		<Table {...args} aria-label='Inbox' className='table-fixed'>
			<colgroup>
				<col className='w-[19.75rem]' />
				<col />
				<col className='w-[12.75rem]' />
				<col className='w-[12.75rem]' />
				<col className='w-[6.25rem]' />
			</colgroup>
			<TableHeader variant='flat'>
				<TableRow className='hover:bg-transparent'>
					<TableHead>
						<div className='flex items-center gap-3'>
							<Checkbox aria-label='Select every message' />
							From
						</div>
					</TableHead>
					<TableHead>Message</TableHead>
					<TableHead>Type</TableHead>
					<TableHead>Date</TableHead>
					<TableHead>
						<span className='sr-only'>Actions</span>
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{messages.map((message) => (
					<TableRow key={message.id}>
						<TableCell>
							<div className='flex items-center gap-2.5'>
								<Checkbox aria-label={`Select the message from ${message.from}`} />
								<span
									aria-label={message.unread ? "Unread" : undefined}
									role={message.unread ? "img" : undefined}
									className={message.unread ? "size-2.5 shrink-0 rounded-full bg-info" : "size-2.5 shrink-0"}
								/>
								<div className='flex min-w-0 items-center gap-2'>
									<Avatar size='md'>
										<AvatarFallback tone={message.tone}>{message.initials}</AvatarFallback>
									</Avatar>
									<div className='flex min-w-0 flex-col gap-1'>
										<span className='truncate'>{message.from}</span>
										<span className='truncate text-xs font-normal'>{message.role}</span>
									</div>
								</div>
							</div>
						</TableCell>
						<TableCell>
							<div className='flex min-w-0 flex-col gap-1.5'>
								<span className='truncate font-semibold'>{message.subject}</span>
								<span className='truncate'>{message.preview}</span>
							</div>
						</TableCell>
						<TableCell>
							<Badge variant={kindVariants[message.kind]} size='xs'>
								{message.kind}
							</Badge>
						</TableCell>
						<TableCell>{message.at}</TableCell>
						<TableCell>
							<div className='flex items-center justify-end gap-6'>
								<Button variant='ghost' size='icon-xs' aria-label='Mark as read' className='text-icon-subtle'>
									<CheckCheckIcon />
								</Button>
								<RowActions name={`the message from ${message.from}`} />
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	),
	play: async ({ canvasElement }) => {
		const rows = within(canvasElement).getAllByRole("row");
		near(rows[0].getBoundingClientRect().height, 44);
		near(rows[1].getBoundingClientRect().height, 70);
	},
};

/** Every row variant together: both headings, `sm` and `md` rows, avatars with and without a detail, the total. */
export const AllVariants: Story = {
	render: () => (
		<div className='flex flex-col gap-10'>
			<Table aria-label='Flat heading, sm rows'>
				<Heading />
				<Rows count={3} />
			</Table>
			<Table aria-label='Default heading, sm rows with checkboxes'>
				<Heading variant='default' />
				<Rows count={3} checkbox />
			</Table>
			<Table size='md' aria-label='md rows'>
				<Heading />
				<Rows count={3} />
			</Table>
			<Table size='md' aria-label='md rows with avatars'>
				<Heading />
				<Rows count={3} avatar />
			</Table>
			<Table size='md' aria-label='md rows with avatars and a detail'>
				<Heading />
				<Rows count={3} avatar detail />
			</Table>
			<TotalTable />
		</div>
	),
};
