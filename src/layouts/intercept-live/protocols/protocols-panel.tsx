import * as React from "react";
import { ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/data-display/table";
import { EmptyState } from "@/components/feedback/empty-state";
import { Typography } from "@/components/typography/typography";

import { usePatientNavigation } from "../patient-navigation";

// The Protocols page (Sidebar › Protocols; PRD Sidebar NAV-044, Nov 20, 2026, user's call): the protocols tracking the
// clinician's patients, a row each, each opening its own page (Virtual Sepsis, the only one in v1). The Sidebar keeps
// Protocols current on a protocol's page (`subPages` in `intercept-live.tsx`).

/** A protocol as Protocols lists it. */
type ProtocolSummary = {
	id: string;
	/** "Virtual Sepsis": the protocol and the page it opens. */
	name: string;
	/** What it watches for, in a line. */
	description: string;
	/** The patients on it now. */
	patients: number;
	/** Their open alerts. */
	alerts: number;
	/** The page that shows it (an Intercept Live page key). */
	page: string;
};

type ProtocolsPanelProps = {
	protocols: ProtocolSummary[];
};

const count = (value: number, one: string, many: string) => `${value} ${value === 1 ? one : many}`;

/** Every protocol tracking the clinician's patients; each row opens the protocol's page. */
function ProtocolsPanel({ protocols }: ProtocolsPanelProps) {
	const navigation = usePatientNavigation();
	const headingId = React.useId();
	return (
		<main className='flex flex-1 flex-col gap-6 p-6'>
			<Typography as='h1' id={headingId} size='2xl' weight='bold'>
				Protocols
			</Typography>
			{protocols.length ? (
				<Table size='md' aria-labelledby={headingId}>
					<TableHeader variant='flat'>
						<TableRow>
							<TableHead>Protocol</TableHead>
							<TableHead className='text-right'>Patients</TableHead>
							<TableHead className='text-right'>Active alerts</TableHead>
							<TableHead>
								<span className='sr-only'>Actions</span>
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{protocols.map((protocol) => (
							<TableRow key={protocol.id}>
								<TableCell>
									<div className='flex flex-col'>
										<span>{protocol.name}</span>
										<span className='font-normal text-muted-foreground'>{protocol.description}</span>
									</div>
								</TableCell>
								<TableCell className='text-right tabular-nums'>{count(protocol.patients, "patient", "patients")}</TableCell>
								<TableCell className='text-right tabular-nums'>{count(protocol.alerts, "alert", "alerts")}</TableCell>
								<TableCell className='w-0 text-right'>
									<Button
										variant='outline'
										size='sm'
										aria-label={`Open ${protocol.name}`}
										onClick={() => navigation?.openPage?.(protocol.page)}
									>
										Open
										<ChevronRightIcon aria-hidden='true' />
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			) : (
				<EmptyState
					title='No protocols running'
					description='Protocols tracking your patients, like Virtual Sepsis, will appear here.'
				/>
			)}
		</main>
	);
}

export { ProtocolsPanel, type ProtocolSummary, type ProtocolsPanelProps };
