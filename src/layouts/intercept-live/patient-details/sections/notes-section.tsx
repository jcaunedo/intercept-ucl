import * as React from "react";
import { CheckIcon, FilePenLineIcon, PlusIcon, RotateCwIcon, SparklesIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import { Badge, type BadgeProps } from "@/components/data-display/badge";
import { SearchInput } from "@/components/forms/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/forms/select";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/overlays/dropdown-menu";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { cn } from "@/lib/utils";

import { formatDateTime, formatTime, NoData } from "../section-parts";
import { SourceLabel } from "../../shared/source-label";
import type { NoteContext } from "./note-chart";
import { draftFromNote, NoteEditor, newNoteDraft, noteFromDraft, type NoteDraft } from "./note-editor";
import { noteTemplates } from "./note-templates";

// The Notes section (PRD Patient details §10, PD-070–PD-072): notes imported from the hospital's record and Intercept's
// own, newest first, with where each one went. A list with type and author filters, and the selected note beside it
// (under it on a narrow canvas). New note and a draft's Continue writing open the note editor in the note's place (PRD
// Notes NTE-016, `note-editor.tsx`).

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
	/** Signed with sections an AI drafted and the clinician reviewed: "AI-drafted, clinician-signed" (PRD Notes NTE-007). */
	aiDrafted?: boolean;
	sections: { heading?: string; text: string }[];
	/**
	 * Coded fields the note records alongside its text, e.g. a social need ("Social need": "Cost-related insulin
	 * rationing", code "Z59.86"), so reports and the discharge workflow read them without parsing prose (Scenario 4,
	 * step 5).
	 */
	fields?: { label: string; value: string; code?: string }[];
};

type PatientNotes = {
	/** The hospital's record, e.g. "Epic", for "Written to Epic · 14:32". */
	emr: string;
	/** The hospital takes Intercept's signed notes into its record (PRD PD-072): a note signed here is written there. */
	writeBack?: boolean;
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

/** The nearest scrolling ancestor: the app's canvas. */
function scrollParent(element: HTMLElement): HTMLElement | null {
	for (let parent = element.parentElement; parent; parent = parent.parentElement) {
		if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) return parent;
	}
	return null;
}

/**
 * Keeps the list pane as tall as the part of the canvas it can show: from its top (or its sticky top, once the page has
 * scrolled it there) to the canvas's bottom. A pane one screen tall started under the patient header ran off the bottom,
 * and its last rows couldn't be reached by scrolling the list. Stacked (not sticky), the pane keeps its CSS height.
 */
function useFitPaneToView(ref: React.RefObject<HTMLElement | null>) {
	React.useLayoutEffect(() => {
		const pane = ref.current;
		if (!pane) return;
		const scroller = scrollParent(pane);
		let frame = 0;
		const measure = () => {
			const style = getComputedStyle(pane);
			if (style.position !== "sticky") {
				pane.style.height = "";
				return;
			}
			const view = scroller?.getBoundingClientRect() ?? { top: 0, bottom: window.innerHeight };
			const top = Math.max(pane.getBoundingClientRect().top, view.top + (parseFloat(style.top) || 0));
			pane.style.height = `${Math.max(0, view.bottom - top)}px`;
		};
		const fit = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(measure);
		};
		measure();
		const target = scroller ?? window;
		target.addEventListener("scroll", fit, { passive: true });
		window.addEventListener("resize", fit);
		const observer = new ResizeObserver(fit);
		if (pane.parentElement) observer.observe(pane.parentElement);
		return () => {
			cancelAnimationFrame(frame);
			target.removeEventListener("scroll", fit);
			window.removeEventListener("resize", fit);
			observer.disconnect();
		};
	}, [ref]);
}

/** The search matches a note's type, author and text, in any case. */
function matchesQuery(note: PatientNote, query: string) {
	const words = query.trim().toLowerCase();
	if (!words) return true;
	return [note.type, note.author.name, note.author.role, ...note.sections.flatMap((section) => [section.heading ?? "", section.text])]
		.join("\n")
		.toLowerCase()
		.includes(words);
}

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

/** One row of the list: a button that selects the note. Rows sit between rules; the selected one is filled. */
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
		<li className='shrink-0 border-b border-border'>
			<button
				type='button'
				aria-current={selected ? "true" : undefined}
				onClick={onSelect}
				className={cn(
					"flex w-full flex-col gap-1 px-2 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
					selected ? "bg-background-subtle" : "hover:bg-accent",
				)}
			>
				<span className='flex items-end justify-between gap-2'>
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
	const headingId = React.useId();
	const byline = [`${note.author.name}, ${note.author.role}`, note.author.organization, formatNoteTime(note.at, now)]
		.filter(Boolean)
		.join(" · ");

	return (
		<section aria-labelledby={headingId} className='flex min-w-0 flex-col gap-3 bg-card p-6'>
			<div className='flex flex-col gap-3'>
				{/* The source sits under the title, 4px below it (it was at the row's right end until Nov 13, 2026). */}
				<div className='flex flex-col gap-1'>
					<div className='flex flex-wrap items-center gap-[10px]'>
						<h2 id={headingId} className='font-display text-2xl font-semibold text-foreground'>
							{note.type}
						</h2>
						<span className='flex flex-wrap gap-1'>
							{note.scribe ? <ScribeBadge /> : null}
							<NoteStatusBadge note={note} emr={emr} />
						</span>
					</div>
					<p className='text-xs text-muted-foreground'>
						<SourceLabel>{note.origin === "hospital" ? `From ${emr}` : "Intercept note"}</SourceLabel>
					</p>
				</div>
				<p className='text-sm text-muted-foreground'>{byline}</p>
			</div>

			{note.scribe ? (
				<p className='rounded-md bg-tone-accent-subtle px-3 py-2 text-sm text-foreground'>
					Drafted by AI Scribe from the camera session at {formatTime(note.scribe.sessionAt)}. Nothing is saved to the
					chart until you review, edit and sign it.
				</p>
			) : null}

			{note.aiDrafted && note.status !== "draft" ? (
				<p className='flex items-center gap-1.5 text-xs text-muted-foreground'>
					<SparklesIcon aria-hidden='true' className='size-3.5' />
					AI-drafted, clinician-signed
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

			<div className='flex max-w-[900px] flex-col gap-3 text-sm leading-6 text-foreground'>
				{note.sections.map((section, index) => (
					<div key={section.heading ?? index} className='flex flex-col gap-1'>
						{section.heading ? <h3 className='text-base font-semibold text-foreground'>{section.heading}</h3> : null}
						<p className='whitespace-pre-line'>{section.text}</p>
					</div>
				))}
			</div>

			{note.fields?.length ? (
				<div className='flex max-w-[72ch] flex-col gap-2 rounded-lg border border-border bg-background-subtle p-3'>
					<h3 className='text-xs font-semibold tracking-wide text-muted-foreground uppercase'>Structured fields</h3>
					<dl className='flex flex-col gap-1.5 text-sm'>
						{note.fields.map((field) => (
							<div key={field.label} className='flex flex-wrap items-baseline gap-x-2'>
								<dt className='text-muted-foreground'>{field.label}</dt>
								<dd className='font-medium text-foreground'>
									{field.value}
									{field.code ? <span className='ml-1.5 font-mono text-xs font-normal text-muted-foreground'>{field.code}</span> : null}
								</dd>
							</div>
						))}
					</dl>
				</div>
			) : null}

			{note.status === "draft" && onEdit ? (
				<div className='flex gap-2 border-t border-border-muted pt-3'>
					<Button variant='outline' onClick={onEdit}>
						<FilePenLineIcon aria-hidden='true' />
						{note.scribe ? "Review and sign" : "Continue writing"}
					</Button>
				</div>
			) : null}
		</section>
	);
}

/* -------------------------------------------------------------------------- */
/* NotesSection                                                               */
/* -------------------------------------------------------------------------- */

type NotesSectionProps = {
	notes: PatientNotes;
	/**
	 * What a new note fills in from the patient's page: its author, chart, AI drafts and consult time (`noteContextFrom`).
	 * With it, New note opens a menu of note types and the editor; without it, New note only reports the click.
	 */
	context?: NoteContext | null;
	/** A new note started, with its type's name (PRD PD-071). */
	onNewNote?: (type?: string) => void;
	/** A draft opened in the editor. */
	onEditNote?: (noteId: string) => void;
	/** A note signed in the editor, as the list now shows it. The prototype keeps it in the tab. */
	onSignNote?: (note: PatientNote) => void;
	/** Retries a failed write-back. The prototype marks it written at once. */
	onRetryWriteBack?: (noteId: string) => void;
};

/**
 * The patient's notes, newest first, filtered by type and author, with the selected note beside the list on a wide
 * canvas and under it on a narrow one. The newest note is selected first.
 */
function NotesSection({
	notes: { emr, writeBack, notes },
	context,
	onNewNote,
	onEditNote,
	onSignNote,
	onRetryWriteBack,
}: NotesSectionProps) {
	const now = useCurrentMinute();
	const [type, setType] = React.useState(ALL);
	const [author, setAuthor] = React.useState(ALL);
	const [query, setQuery] = React.useState("");
	// The search field is open while focused or holding text (SearchInput's own rule); the filters fold away meanwhile.
	const [searchFocused, setSearchFocused] = React.useState(false);
	const searchOpen = searchFocused || query !== "";
	const listHeadingId = React.useId();
	const listPaneRef = React.useRef<HTMLElement>(null);
	useFitPaneToView(listPaneRef);
	// A retried write-back in the prototype: written at the moment of the retry.
	const [retried, setRetried] = React.useState<Record<string, string>>({});
	// Notes written or changed in the editor, over the record's (the app would save them; the prototype keeps them here),
	// the drafts being written, and the one open in the editor.
	const [written, setWritten] = React.useState<Record<string, PatientNote>>({});
	const [drafts, setDrafts] = React.useState<Record<string, NoteDraft>>({});
	const [editingId, setEditingId] = React.useState<string | null>(null);

	const all = [...notes.filter((note) => !written[note.id]), ...Object.values(written)]
		.map((note): PatientNote =>
			retried[note.id] ? { ...note, status: "written-back", writtenBackAt: retried[note.id], failure: undefined } : note,
		)
		.sort(byNewest);
	const types = [...new Set(all.map((note) => note.type))].sort();
	const authors = [...new Set(all.map((note) => note.author.name))].sort();
	const shown = all.filter(
		(note) =>
			(type === ALL || note.type === type) && (author === ALL || note.author.name === author) && matchesQuery(note, query),
	);

	const [selectedId, setSelectedId] = React.useState(all[0]?.id);
	const selected = shown.find((note) => note.id === selectedId) ?? shown[0];

	const keepDraft = (draft: NoteDraft, base?: PatientNote) => {
		setDrafts((current) => ({ ...current, [draft.id]: draft }));
		setWritten((current) => {
			const note = current[draft.id] ?? base ?? notes.find((item) => item.id === draft.id);
			return note ? { ...current, [draft.id]: { ...note, ...noteFromDraft(draft) } } : current;
		});
	};

	// A new note of a type: it joins the list as a Draft, selected, with the editor open. Filters that would hide it clear.
	const startNote = (templateId: string) => {
		const template = noteTemplates.find((item) => item.id === templateId);
		if (!template || !context) return;
		const draft = newNoteDraft(`new-${Date.now()}`, template, context);
		const note: PatientNote = {
			id: draft.id,
			at: draft.startedAt,
			origin: "intercept",
			status: "draft",
			...noteFromDraft(draft),
		};
		setDrafts((current) => ({ ...current, [draft.id]: draft }));
		setWritten((current) => ({ ...current, [draft.id]: note }));
		setType(ALL);
		setAuthor(ALL);
		setQuery("");
		setSelectedId(draft.id);
		setEditingId(draft.id);
		onNewNote?.(template.name);
	};

	const editNote = (note: PatientNote) => {
		if (!context) return onEditNote?.(note.id);
		if (!drafts[note.id]) keepDraft(draftFromNote(note, context), note);
		setEditingId(note.id);
		onEditNote?.(note.id);
	};

	const signNote = (draft: NoteDraft) => {
		const at = new Date().toISOString();
		const base = written[draft.id] ?? notes.find((item) => item.id === draft.id);
		if (!base) return;
		const signed: PatientNote = {
			...base,
			...noteFromDraft(draft),
			at,
			scribe: undefined,
			...(writeBack ? { status: "written-back", writtenBackAt: at } : { status: "signed" }),
		};
		setWritten((current) => ({ ...current, [draft.id]: signed }));
		setDrafts(({ [draft.id]: _signed, ...rest }) => rest);
		setEditingId(null);
		onSignNote?.(signed);
	};

	const editing = selected && selected.id === editingId ? drafts[selected.id] : undefined;

	return (
		<div className='@container flex flex-1'>
			<div className='grid flex-1 @min-[56rem]:grid-cols-[22rem_minmax(0,1fr)]'>
				{/* The list scrolls in its pane, its header (search, filters, New note) staying put. Beside the note, the pane
				    sticks under the page's header, compact while the page scrolls (52px), and is as tall as the canvas shows
				    under its top (`useFitPaneToView`), so its last row can always be scrolled to; stacked, it stops at 60% of
				    the screen. */}
				<section
					ref={listPaneRef}
					aria-labelledby={listHeadingId}
					className='flex max-h-[60dvh] min-w-0 flex-col border-b border-border bg-card @min-[56rem]:sticky @min-[56rem]:top-[52px] @min-[56rem]:h-[calc(100dvh-52px)] @min-[56rem]:max-h-none @min-[56rem]:self-start @min-[56rem]:border-r @min-[56rem]:border-b-0'
				>
					<h2 id={listHeadingId} className='sr-only'>
						Notes
					</h2>
					{/* The header's rule runs edge to edge, and is the first row's top rule: it stays while the rows pass under it. */}
					<div className='flex shrink-0 items-center gap-2 border-b border-border p-3'>
						{/* The search opens across the row, over the filters (Expand); the filters fold away and leave the tab
						    order while it's open. */}
						<div
							className='flex min-w-0 flex-1 items-center'
							onFocus={() => setSearchFocused(true)}
							onBlur={(event) => {
								if (!event.currentTarget.contains(event.relatedTarget)) setSearchFocused(false);
							}}
						>
							<SearchInput
								value={query}
								onValueChange={setQuery}
								placeholder='Search notes'
								expandedWidth='100%'
							/>
							<div
								inert={searchOpen}
								aria-hidden={searchOpen || undefined}
								className={cn(
									"grid min-w-0 flex-1 grid-cols-2 gap-3 pl-2 transition-[opacity,padding] duration-200",
									searchOpen && "pl-0 opacity-0",
								)}
							>
								<Select value={type} onValueChange={setType}>
									<SelectTrigger aria-label='Note type' className='w-full min-w-0'>
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
									<SelectTrigger aria-label='Author' className='w-full min-w-0'>
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
						</div>
						{context ? (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button size='icon-sm' aria-label='New note'>
										<PlusIcon aria-hidden='true' />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align='end' className='w-64'>
									<DropdownMenuLabel>New note</DropdownMenuLabel>
									{noteTemplates.map((template) => (
										<DropdownMenuItem key={template.id} onSelect={() => startNote(template.id)} className='flex-col items-start gap-0'>
											<span className='font-medium'>{template.name}</span>
											<span className='text-xs text-muted-foreground'>{template.description}</span>
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						) : onNewNote ? (
							<Button size='icon-sm' aria-label='New note' onClick={() => onNewNote()}>
								<PlusIcon aria-hidden='true' />
							</Button>
						) : null}
					</div>
					{shown.length ? (
						<ul aria-label='Notes, newest first' className='scrollbar-soft flex min-h-0 flex-1 flex-col overflow-y-auto px-4'>
							{shown.map((note) => (
								<NoteListItem
									key={note.id}
									note={note}
									emr={emr}
									now={now}
									selected={note.id === selected?.id}
									onSelect={() => {
										setSelectedId(note.id);
										// The draft open in the editor stays as written; selecting it again shows it, Continue writing reopens it.
										if (note.id !== editingId) setEditingId(null);
									}}
								/>
							))}
						</ul>
					) : (
						<div className='px-4 py-6'>
							{all.length ? (
								<NoData>{query.trim() ? `No notes match “${query.trim()}”.` : "No notes match these filters."}</NoData>
							) : (
								<NoData>No notes imported or written yet.</NoData>
							)}
						</div>
					)}
				</section>

				{selected && editing && context ? (
					<NoteEditor
						key={selected.id}
						draft={editing}
						context={context}
						onChange={(draft) => keepDraft(draft)}
						onSaveDraft={() => setEditingId(null)}
						onSign={() => signNote(editing)}
					/>
				) : selected ? (
					<NoteDetail
						key={selected.id}
						note={selected}
						emr={emr}
						now={now}
						onEdit={context || onEditNote ? () => editNote(selected) : undefined}
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
