import { CheckIcon, ExternalLinkIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import { Badge } from "@/components/data-display/badge";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { formatRelativeDate } from "@/lib/relative-date";
import { cn } from "@/lib/utils";

import { Detail, formatDateTime, formatTime, freshness, NoData, SectionCard } from "../section-parts";

// The Epic section (PRD Patient details PD-OD-01, PD-121): what Intercept receives from the hospital's record for
// this patient, how fresh each part is, and what Intercept has written back. A status page, not a copy of the EMR: the
// record stays in Epic, and "Open chart in Epic" leaves for it. Copy describes what's available, never how it's
// connected (PD-134).

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

/** `current`: updating as the hospital records it. `delayed`: no update for longer than usual. `unavailable`: none. */
type EmrFeedState = "current" | "delayed" | "unavailable";

type EmrFeed = {
	id: string;
	/** "Admissions and transfers", "Results"… */
	label: string;
	/** What it carries, in words. */
	description: string;
	state: EmrFeedState;
	updatedAt?: string;
	/** `read`: Intercept shows it. `write`: Intercept also writes signed work back. `read-only`: shown, and the hospital doesn't allow changes from Intercept. */
	access: "read" | "write" | "read-only";
	/** A plain-words note on the feed's state or limits, e.g. why it's delayed. */
	note?: string;
};

type EmrWriteBack = {
	id: string;
	/** What was written, e.g. "Tele-ICU progress note". */
	title: string;
	author: string;
	at: string;
	status: "written" | "failed" | "waiting";
	/** For a failure: what failed and what to do. */
	detail?: string;
};

type PatientEmr = {
	/** The EMR's name, e.g. "Epic". */
	name: string;
	/** The hospital whose record it is. */
	hospital: string;
	state: "connected" | "delayed" | "unavailable";
	checkedAt: string;
	encounter?: { status: string; admittedAt?: string; account?: string };
	feeds: EmrFeed[];
	writeBacks: EmrWriteBack[];
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

const feedStates: Record<EmrFeedState, { label: string; dot: string }> = {
	current: { label: "Up to date", dot: "bg-success" },
	delayed: { label: "Delayed", dot: "bg-warning" },
	unavailable: { label: "Unavailable", dot: "bg-destructive" },
};

const connectionStates: Record<PatientEmr["state"], { label: string; dot: string }> = {
	connected: { label: "Connected", dot: "bg-success" },
	delayed: { label: "Some data is delayed", dot: "bg-warning" },
	unavailable: { label: "Not available right now", dot: "bg-destructive" },
};

const accessLabels: Record<EmrFeed["access"], string> = {
	read: "Read",
	write: "Read and write back",
	"read-only": "Read-only at this hospital",
};

const writeBackStatuses = {
	written: { label: "Written", variant: "green", icon: CheckIcon },
	failed: { label: "Failed", variant: "red", icon: TriangleAlertIcon },
	waiting: { label: "Waiting", variant: "secondary", icon: undefined },
} as const;

/** A colored dot with its state in words beside it, never color alone. */
function StateDot({ className }: { className: string }) {
	return <span aria-hidden='true' className={cn("size-2 shrink-0 rounded-full", className)} />;
}

/* -------------------------------------------------------------------------- */
/* EpicSection                                                                */
/* -------------------------------------------------------------------------- */

type EpicSectionProps = {
	emr: PatientEmr;
	/** Opens the patient's chart in the EMR, where the hospital allows it. */
	onOpenChart?: () => void;
};

/**
 * The hospital record's status for this patient: the connection and encounter, each feed with its freshness and
 * access, and recent write-backs. Feeds and write-backs sit side by side on a wide canvas.
 */
function EpicSection({ emr, onOpenChart }: EpicSectionProps) {
	const now = useCurrentMinute();
	const connection = connectionStates[emr.state];
	const delayed = emr.feeds.filter((feed) => feed.state !== "current");
	const writesBack = emr.feeds.some((feed) => feed.access === "write");

	return (
		<div className='@container'>
			<div className='flex flex-col gap-6'>
				<SectionCard
					title={`${emr.name} at ${emr.hospital}`}
					meta={
						<>
							<StateDot className={connection.dot} />
							{connection.label}
							{now !== null ? ` · checked ${formatRelativeDate(emr.checkedAt, now).label.toLowerCase()}` : null}
						</>
					}
					action={
						onOpenChart ? (
							<Button variant='outline' size='sm' onClick={onOpenChart}>
								<ExternalLinkIcon aria-hidden='true' />
								Open chart in {emr.name}
							</Button>
						) : undefined
					}
				>
					<p className='max-w-[72ch] text-sm text-foreground'>
						{emr.name} is the record of care. Intercept shows part of it in Vitals, Chart, Medications, Orders and Notes
						{writesBack ? ", and writes signed Intercept notes back to it." : "."}
						{delayed.length ? ` Behind right now: ${delayed.map((feed) => feed.label.toLowerCase()).join(", ")}.` : null}
					</p>
					{emr.encounter ? (
						<dl className='grid gap-x-6 gap-y-3 @min-[40rem]:grid-cols-3'>
							<Detail label='Encounter'>{emr.encounter.status}</Detail>
							{emr.encounter.admittedAt ? <Detail label='Admitted'>{formatDateTime(emr.encounter.admittedAt)}</Detail> : null}
							{emr.encounter.account ? <Detail label='Account'>{emr.encounter.account}</Detail> : null}
						</dl>
					) : null}
				</SectionCard>

				<div className='grid gap-6 @min-[60rem]:grid-cols-[minmax(0,1fr)_24rem] @min-[60rem]:items-start'>
					<SectionCard title='What Intercept receives'>
						{emr.feeds.length ? (
							<ul className='flex flex-col divide-y divide-border-muted'>
								{emr.feeds.map((feed) => {
									const state = feedStates[feed.state];
									return (
										<li
											key={feed.id}
											className='grid gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0 @min-[40rem]:grid-cols-[minmax(0,1fr)_auto]'
										>
											<div className='flex min-w-0 flex-col gap-0.5'>
												<span className='text-sm font-medium text-foreground'>{feed.label}</span>
												<span className='text-xs text-muted-foreground'>{feed.description}</span>
												{feed.note ? <span className='text-xs text-foreground'>{feed.note}</span> : null}
											</div>
											<div className='flex flex-col gap-0.5 @min-[40rem]:items-end @min-[40rem]:text-right'>
												<span className='flex items-center gap-1.5 text-sm text-foreground'>
													<StateDot className={state.dot} />
													{state.label}
												</span>
												<span className='text-xs text-muted-foreground'>
													{[
														feed.updatedAt && now !== null
															? `Updated ${formatRelativeDate(feed.updatedAt, now).label.toLowerCase()}`
															: undefined,
														accessLabels[feed.access],
													]
														.filter(Boolean)
														.join(" · ")}
												</span>
											</div>
										</li>
									);
								})}
							</ul>
						) : (
							<NoData>Nothing from {emr.name} for this patient yet.</NoData>
						)}
					</SectionCard>

					<SectionCard title='Written back' meta={emr.writeBacks.length ? freshness(emr.name, emr.writeBacks[0].at, now) : undefined}>
						{emr.writeBacks.length ? (
							<ul className='flex flex-col divide-y divide-border-muted'>
								{emr.writeBacks.map((item) => {
									const status = writeBackStatuses[item.status];
									return (
										<li key={item.id} className='flex flex-col gap-1 py-3 first:pt-0 last:pb-0'>
											<div className='flex items-start justify-between gap-3'>
												<span className='text-sm font-medium text-foreground'>{item.title}</span>
												<Badge variant={status.variant} size='xs'>
													{status.icon ? <status.icon aria-hidden='true' /> : null}
													{status.label}
												</Badge>
											</div>
											<span className='text-xs text-muted-foreground'>
												{item.author} · {now !== null && now - Date.parse(item.at) < 12 * 3_600_000 ? formatTime(item.at) : formatDateTime(item.at)}
											</span>
											{item.detail ? <span className='text-xs text-foreground'>{item.detail}</span> : null}
										</li>
									);
								})}
							</ul>
						) : (
							<NoData>Nothing written to {emr.name} for this patient yet.</NoData>
						)}
					</SectionCard>
				</div>
			</div>
		</div>
	);
}

export { EpicSection, type EmrFeed, type EmrFeedState, type EmrWriteBack, type EpicSectionProps, type PatientEmr };
