import * as React from "react";
import { CheckIcon, FilePenLineIcon, RotateCwIcon, SparklesIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import { Badge, type BadgeProps } from "@/components/data-display/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/forms/select";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { cn } from "@/lib/utils";

import { formatDateTime, formatTime, NoData, SectionCard } from "../section-parts";

// The Notes section (PRD Patient details §10, PD-070–PD-072): notes imported from the hospital's record and Intercept's
// own, newest first, with where each one went. A list with type and author filters, and the selected note beside it
// (under it on a narrow canvas). Writing a note happens in Clinical Documentation; this page starts it and shows status.

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

/**
 * `draft`: not signed. `signed`: signed, and for a hospital note, the record it's from. `written-back`: an Intercept note
 * written into the hospital's record. `write-back-failed`: signed, but the hospital's record didn't take it.
 */
type PatientNoteStatus = "draft" | "signed" | "written-back" | "write-back-failed";

type PatientNote = {
	id: string;
	/** "ICU progress note", "Nursing note", "History and physical"… The type filter lists these. */
	type: string;
	author: { name: string; role: string; organization?: string };
	/** When it was written or last edited, ISO 8601. */
	at: string;
	/** Imported from the hospital's record, or written in Intercept. */
	origin: "hospital" | "intercept";
	status: PatientNoteStatus;
	/** When it was written into the hospital's record. */
	writtenBackAt?: string;
	/** For a failed write-back: what failed and what to do, in words. */
	failure?: string;
	/** Drafted by AI Scribe from a camera session: always a draft for the clinician to review and sign (PRD PD-073). */
	scribe?: { sessionAt: string };
	sections: { heading?: string; text: string }[];
};

type PatientNotes = {
	/** The hospital's record, e.g. "Epic", for "Written to Epic · 14:32". */
	emr: string;
	notes: PatientNote[];
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

const ALL = "all";

function statusBadge(note: PatientNote, emr: string): { label: string; variant: BadgeProps["variant"]; icon?: typeof CheckIcon } {
	switch (note.status) {
		case "draft":
			return { label: "Draft", variant: "yellow" };
		case "written-back":
			return {
				label: note.writtenBackAt ? `Written to ${emr} · ${formatTime(note.writtenBackAt)}` : `Written to ${emr}`,
				variant: "green",
				icon: CheckIcon,
			};
		case "write-back-failed":
			return { label: "Write-back failed", variant: "red", icon: TriangleAlertIcon };
		default:
			return { label: note.origin === "hospital" ? `Signed in ${emr}` : "Signed", variant: "outline" };
	}
}

const byNewest = (a: PatientNote, b: PatientNote) => b.at.localeCompare(a.at);

/** "Today 9:12 AM" reads as just the time; older notes carry their date. */
function formatNoteTime(iso: string, now: number | null) {
	if (now === null) return formatDateTime(iso);
	const sameDay = new Date(iso).toDateString() === new Date(now).toDateString();
	return sameDay ? formatTime(iso) : formatDateTime(iso);
}

/* -------------------------------------------------------------------------- */
/* Parts                                                                      */
/* -------------------------------------------------------------------------- */

function NoteStatusBadge({ note, emr }: { note: PatientNote; emr: string }) {
	const status = statusBadge(note, emr);
	return (
		<Badge variant={status.variant} size='xs'>
			{status.icon ? <status.icon aria-hidden='true' /> : null}
			{status.label}
		</Badge>
	);
}

/** "AI Scribe" chip: an AI draft is never mistaken for a clinician's note (PRD PD-AC-10). */
function ScribeBadge() {
	return (
		<Badge variant='purple' size='xs'>
			<SparklesIcon aria-hidden='true' />
			AI Scribe
		</Badge>
	);
}

/** One row of the list: a button that selects the note. */
function NoteListItem({
	note,
	emr,
	selected,
	now,
	onSelect,
}: {
	note: PatientNote;
	emr: string;
	selected: boolean;
	now: number | null;
	onSelect: () => void;
}) {
	return (
		<li>
			<button
				type='button'
				aria-current={selected ? "true" : undefined}
				onClick={onSelect}
				className={cn(
					"flex w-full flex-col gap-1 rounded-lg border px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
					selected ? "border-foreground bg-background-subtle" : "border-transparent hover:bg-accent",
					note.scribe && !selected && "border-dashed border-badge-purple-foreground/50",
				)}
			>
				<span className='flex items-baseline justify-between gap-2'>
					<span className='truncate text-sm font-semibold text-foreground'>{note.type}</span>
					<span className='shrink-0 text-xs text-muted-foreground tabular-nums'>{formatNoteTime(note.at, now)}</span>
				</span>
				<span className='truncate text-xs text-muted-foreground'>
					{note.author.name}, {note.author.role}
				</span>
				<span className='flex flex-wrap gap-1'>
					{note.scribe ? <ScribeBadge /> : null}
					<NoteStatusBadge note={note} emr={emr} />
				</span>
			</button>
		</li>
	);
}

/** The selected note: who wrote it, where it went, what to do if it failed, and its text. */
function NoteDetail({
	note,
	emr,
	now,
	onEdit,
	onRetry,
}: {
	note: PatientNote;
	emr: string;
	now: number | null;
	onEdit?: () => void;
	onRetry?: () => void;
}) {
	const byline = [`${note.author.name}, ${note.author.role}`, note.author.organization, formatNoteTime(note.at, now)]
		.filter(Boolean)
		.join(" · ");

	return (
		<SectionCard
			title={note.type}
			meta={note.origin === "hospital" ? `From ${emr}` : "Intercept note"}
			className={cn(note.scribe && "border-dashed border-badge-purple-foreground/50")}
		>
			<div className='flex flex-wrap items-center gap-2'>
				{note.scribe ? <ScribeBadge /> : null}
				<NoteStatusBadge note={note} emr={emr} />
				<span className='text-xs text-muted-foreground'>{byline}</span>
			</div>

			{note.scribe ? (
				<p className='rounded-md bg-tone-accent-subtle px-3 py-2 text-sm text-foreground'>
					Drafted by AI Scribe from the camera session at {formatTime(note.scribe.sessionAt)}. Nothing is saved to the
					chart until you review, edit and sign it.
				</p>
			) : null}

			{note.status === "write-back-failed" && note.failure ? (
				<div role='alert' className='flex flex-col gap-2 rounded-md bg-destructive-subtle px-3 py-2 text-sm text-foreground'>
					<p className='flex items-start gap-2'>
						<TriangleAlertIcon aria-hidden='true' className='mt-0.5 size-4 shrink-0 text-destructive' />
						{note.failure}
					</p>
					{onRetry ? (
						<Button variant='outline' size='sm' className='self-start' onClick={onRetry}>
							<RotateCwIcon aria-hidden='true' />
							Try again
						</Button>
					) : null}
				</div>
			) : null}

			<div className='flex max-w-[72ch] flex-col gap-4 text-sm leading-6 text-foreground'>
				{note.sections.map((section, index) => (
					<div key={section.heading ?? index} className='flex flex-col gap-1'>
						{section.heading ? <h3 className='text-xs font-semibold tracking-wide text-muted-foreground uppercase'>{section.heading}</h3> : null}
						<p className='whitespace-pre-line'>{section.text}</p>
					</div>
				))}
			</div>

			{note.status === "draft" && onEdit ? (
				<div className='flex gap-2 border-t border-border-muted pt-3'>
					<Button variant='outline' onClick={onEdit}>
						<FilePenLineIcon aria-hidden='true' />
						{note.scribe ? "Review and sign" : "Continue writing"}
					</Button>
				</div>
			) : null}
		</SectionCard>
	);
}

/* -------------------------------------------------------------------------- */
/* NotesSection                                                               */
/* -------------------------------------------------------------------------- */

type NotesSectionProps = {
	notes: PatientNotes;
	/** Opens Clinical Documentation with a new note for the patient (PRD PD-071). */
	onNewNote?: () => void;
	/** Opens a draft in Clinical Documentation. */
	onEditNote?: (noteId: string) => void;
	/** Retries a failed write-back. The prototype marks it written at once. */
	onRetryWriteBack?: (noteId: string) => void;
};

/**
 * The patient's notes, newest first, filtered by type and author, with the selected note beside the list on a wide
 * canvas and under it on a narrow one. The newest note is selected first.
 */
function NotesSection({ notes: { emr, notes }, onNewNote, onEditNote, onRetryWriteBack }: NotesSectionProps) {
	const now = useCurrentMinute();
	const [type, setType] = React.useState(ALL);
	const [author, setAuthor] = React.useState(ALL);
	// A retried write-back in the prototype: written at the moment of the retry.
	const [retried, setRetried] = React.useState<Record<string, string>>({});

	const all = notes
		.map((note): PatientNote =>
			retried[note.id] ? { ...note, status: "written-back", writtenBackAt: retried[note.id], failure: undefined } : note,
		)
		.sort(byNewest);
	const types = [...new Set(all.map((note) => note.type))].sort();
	const authors = [...new Set(all.map((note) => note.author.name))].sort();
	const shown = all.filter((note) => (type === ALL || note.type === type) && (author === ALL || note.author.name === author));

	const [selectedId, setSelectedId] = React.useState(all[0]?.id);
	const selected = shown.find((note) => note.id === selectedId) ?? shown[0];

	return (
		<div className='@container'>
			<div className='grid gap-6 @min-[56rem]:grid-cols-[22rem_minmax(0,1fr)] @min-[56rem]:items-start'>
				<SectionCard
					title='Notes'
					meta={`${shown.length} of ${all.length}`}
					action={
						onNewNote ? (
							<Button size='sm' onClick={onNewNote}>
								<FilePenLineIcon aria-hidden='true' />
								New note
							</Button>
						) : undefined
					}
				>
					<div className='grid grid-cols-2 gap-2'>
						<Select value={type} onValueChange={setType}>
							<SelectTrigger size='sm' aria-label='Note type' className='w-full'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>All types</SelectItem>
								{types.map((item) => (
									<SelectItem key={item} value={item}>
										{item}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select value={author} onValueChange={setAuthor}>
							<SelectTrigger size='sm' aria-label='Author' className='w-full'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>All authors</SelectItem>
								{authors.map((item) => (
									<SelectItem key={item} value={item}>
										{item}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{shown.length ? (
						<ul aria-label='Notes, newest first' className='-mx-1 flex flex-col gap-1'>
							{shown.map((note) => (
								<NoteListItem
									key={note.id}
									note={note}
									emr={emr}
									now={now}
									selected={note.id === selected?.id}
									onSelect={() => setSelectedId(note.id)}
								/>
							))}
						</ul>
					) : all.length ? (
						<NoData>No notes match these filters.</NoData>
					) : (
						<NoData>No notes imported or written yet.</NoData>
					)}
				</SectionCard>

				{selected ? (
					<NoteDetail
						key={selected.id}
						note={selected}
						emr={emr}
						now={now}
						onEdit={onEditNote ? () => onEditNote(selected.id) : undefined}
						onRetry={() => {
							onRetryWriteBack?.(selected.id);
							setRetried((current) => ({ ...current, [selected.id]: new Date().toISOString() }));
						}}
					/>
				) : null}
			</div>
		</div>
	);
}

export { NotesSection, type NotesSectionProps, type PatientNote, type PatientNotes, type PatientNoteStatus };
