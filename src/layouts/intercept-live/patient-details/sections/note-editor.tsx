import * as React from "react";
import {
	CheckIcon,
	CircleIcon,
	MenuIcon,
	MicIcon,
	MicOffIcon,
	RotateCwIcon,
	SignatureIcon,
	TriangleAlertIcon,
} from "lucide-react";

import { Button } from "@/components/buttons/button";
import { Badge } from "@/components/data-display/badge";
import { Input } from "@/components/forms/input";
import { Label } from "@/components/forms/label";
import { RadioGroup, RadioGroupItem } from "@/components/forms/radio-group";
import { Textarea } from "@/components/forms/textarea";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/overlays/dropdown-menu";
import { AiSparkleIcon } from "@/components/icons/ai-sparkle-icon";
import { useDictation } from "@/lib/hooks/use-dictation";
import { cn } from "@/lib/utils";

import { formatTime, NoData } from "../section-parts";
import type { PatientNote } from "./notes-section";
import type { NoteAuthor, NoteChart, NoteChartBlock, NoteContext } from "./note-chart";
import {
	attestationLines,
	attestationVersions,
	bestPracticeItems,
	noteTemplateFor,
	type AttestationVersion,
	type BestPracticeId,
	type NoteTemplate,
	type NoteTemplateSection,
} from "./note-templates";

// The note editor (PRD Notes NTE-004–NTE-011, NTE-016): a note of one type, written from its template in the Notes
// tab's right pane. The template's sections in order, an index of them beside it, the chart's sections filled in with
// when they were read, the clinician's sections to write (typed, dictated, or drafted by AI and then reviewed), the ICU
// best practices and the attestation. Required blanks and unreviewed AI drafts keep the note from being signed.

/* -------------------------------------------------------------------------- */
/* The draft                                                                  */
/* -------------------------------------------------------------------------- */

/** The template the editor works from: a note type's, or a draft's own headings when its type has none. */
type EditorTemplate = Pick<NoteTemplate, "name" | "sections">;

type NoteAttestation = {
	version: AttestationVersion;
	minutes: string;
	site: string;
	persons: string;
};

/** A note being written. Kept by the Notes tab while it's open and after Save draft. */
type NoteDraft = {
	id: string;
	template: EditorTemplate;
	author: NoteAuthor;
	startedAt: string;
	/** The clinician's sections, by section id. */
	texts: Record<string, string>;
	/** Sections written by AI the clinician hasn't edited or accepted yet (PRD NTE-007). */
	unverified: Record<string, boolean>;
	/** Any section was drafted by AI: the signed note says "AI-drafted, clinician-signed" (CD-05). */
	aiUsed: boolean;
	/** The chart sections as read into the note, by block. */
	chart: NoteChart;
	practices: Partial<Record<BestPracticeId, string>>;
	attestation: NoteAttestation;
};

const hasSection = (template: EditorTemplate, kind: NoteTemplateSection["kind"]) =>
	template.sections.some((section) => section.kind === kind);

/** The attestation's prefilled values: the day's logged consult minutes and who was on the calls (PRD NTE-009). */
const prefilledAttestation = (context: NoteContext): NoteAttestation => ({
	version: "critical-care",
	minutes: context.loggedMinutes ? String(context.loggedMinutes) : "",
	site: "",
	persons: context.participants?.join(", ") ?? "",
});

/** A new note of `template`'s type, its chart sections read now. */
function newNoteDraft(id: string, template: NoteTemplate, context: NoteContext): NoteDraft {
	return {
		id,
		template,
		author: context.author,
		startedAt: new Date().toISOString(),
		texts: {},
		unverified: {},
		aiUsed: false,
		chart: context.readChart(),
		practices: {},
		attestation: prefilledAttestation(context),
	};
}

/**
 * An existing draft opened in the editor: its sections land in the template's by heading (Assessment and Plan both in
 * Assessment and plan); a type with no template keeps its own headings. An AI Scribe draft's sections start unverified.
 */
function draftFromNote(note: PatientNote, context: NoteContext): NoteDraft {
	const known = noteTemplateFor(note.type);
	const template: EditorTemplate = known ?? {
		name: note.type,
		sections: note.sections.map((section, index) => ({
			kind: "text" as const,
			id: `section-${index}`,
			heading: section.heading ?? "Note",
		})),
	};
	const texts: Record<string, string> = {};
	const textSections = template.sections.filter((section) => section.kind === "text");
	note.sections.forEach((section, index) => {
		const heading = section.heading?.toLowerCase() ?? "";
		const target = known
			? (textSections.find((item) => item.kind === "text" && item.aliases?.includes(heading)) ??
				textSections.find((item) => item.id === "ap") ??
				textSections[textSections.length - 1])
			: textSections[index];
		if (!target) return;
		// A heading that isn't the section's own stays as a label inside it ("Assessment: …").
		const text =
			known && section.heading && section.heading.toLowerCase() !== target.heading.toLowerCase()
				? `${section.heading}: ${section.text}`
				: section.text;
		texts[target.id] = texts[target.id] ? `${texts[target.id]}\n\n${text}` : text;
	});
	return {
		id: note.id,
		template,
		author: note.author,
		startedAt: note.at,
		texts,
		unverified: note.scribe ? Object.fromEntries(Object.keys(texts).map((key) => [key, true])) : {},
		aiUsed: Boolean(note.scribe),
		chart: hasSection(template, "chart") ? context.readChart() : {},
		practices: {},
		attestation: prefilledAttestation(context),
	};
}

/** A blank or unreviewed part that keeps the note from being signed, and the field to take the clinician to. */
type SignBlocker = {
	label: string;
	fieldId: string;
	reason: "required" | "unverified";
};

const fieldId = (draft: NoteDraft, part: string) => `note-${draft.id}-${part}`;

function signBlockers(draft: NoteDraft): SignBlocker[] {
	const blockers: SignBlocker[] = [];
	for (const section of draft.template.sections) {
		if (section.kind === "text") {
			if (section.required && !draft.texts[section.id]?.trim())
				blockers.push({
					label: section.heading,
					fieldId: fieldId(draft, section.id),
					reason: "required",
				});
			else if (draft.unverified[section.id])
				blockers.push({
					label: `${section.heading} (AI draft)`,
					fieldId: fieldId(draft, section.id),
					reason: "unverified",
				});
		} else if (section.kind === "best-practices") {
			for (const item of bestPracticeItems)
				if (!draft.practices[item.id]?.trim())
					blockers.push({
						label: item.label,
						fieldId: fieldId(draft, `practice-${item.id}`),
						reason: "required",
					});
		} else if (section.kind === "attestation") {
			const { minutes, site, persons } = draft.attestation;
			if (!(Number(minutes) > 0))
				blockers.push({
					label: "Minutes",
					fieldId: fieldId(draft, "minutes"),
					reason: "required",
				});
			if (!site.trim())
				blockers.push({
					label: "Provider distant site",
					fieldId: fieldId(draft, "site"),
					reason: "required",
				});
			if (!persons.trim())
				blockers.push({
					label: "Persons involved",
					fieldId: fieldId(draft, "persons"),
					reason: "required",
				});
		}
	}
	return blockers;
}

/** A chart section as text, for the signed note: its lines, or its table row by row, then when and where it was read. */
function chartText(block: NoteChartBlock) {
	const body = block.table
		? [
				`Time: ${block.table.columns.join(" · ")}`,
				...block.table.rows.map(
					(row) =>
						`${row.label}: ${row.cells.map((cell) => (cell.value ? `${cell.abnormal ? "(!) " : ""}${cell.value}` : "--")).join(" · ")}`,
				),
			]
		: (block.lines ?? []);
	return [...body, `As of ${formatTime(block.asOf)} · ${block.source}`].join("\n");
}

/** The note as the list and the reader show it, from the draft. */
function noteFromDraft(draft: NoteDraft): Pick<PatientNote, "type" | "author" | "sections" | "aiDrafted"> {
	const sections = draft.template.sections.flatMap((section): PatientNote["sections"] => {
		switch (section.kind) {
			case "text": {
				const text = draft.texts[section.id]?.trim();
				return text ? [{ heading: section.heading, text }] : [];
			}
			case "chart": {
				const block = draft.chart[section.block];
				return block ? [{ heading: section.heading, text: chartText(block) }] : [];
			}
			case "best-practices": {
				const lines = bestPracticeItems
					.filter((item) => draft.practices[item.id]?.trim())
					.map((item) => `${item.label}: ${draft.practices[item.id]?.trim()}`);
				return lines.length ? [{ heading: section.heading, text: lines.join("\n") }] : [];
			}
			case "attestation": {
				const { version, minutes, site, persons } = draft.attestation;
				return [
					{
						heading: section.heading,
						text: [
							attestationVersions[version].text(minutes || "___"),
							attestationLines.consent,
							`Provider distant site: ${site.trim().toUpperCase() || "___"}`,
							`Persons involved: Patient${persons.trim() ? `, ${persons.trim()}` : ""}`,
							attestationLines.audiovisual,
						].join("\n"),
					},
				];
			}
		}
	});
	return {
		type: draft.template.name,
		author: draft.author,
		sections,
		aiDrafted: draft.aiUsed || undefined,
	};
}

/* -------------------------------------------------------------------------- */
/* Parts                                                                      */
/* -------------------------------------------------------------------------- */

/** "Required" beside a heading, red once signing was tried with it blank. */
function RequiredMark({ missing }: { missing: boolean }) {
	return <span className={cn("text-xs", missing ? "font-medium text-destructive" : "text-muted-foreground")}>Required</span>;
}

/** A chart section's content: the table or the lines, with when it was read and a way to read it again. */
function ChartBlock({ block, heading, onRefresh }: { block?: NoteChartBlock; heading: string; onRefresh: () => void }) {
	return (
		<div className='flex flex-col gap-2 rounded-lg border border-border-muted bg-background-subtle p-3'>
			<div className='flex flex-wrap items-center justify-between gap-2'>
				<p className='text-xs text-muted-foreground'>
					{block ? `As of ${formatTime(block.asOf)} · ${block.source}` : "Not in the patient's record"}
				</p>
				<Button variant='ghost' size='xs' onClick={onRefresh} aria-label={`Refresh ${heading}`}>
					<RotateCwIcon aria-hidden='true' />
					Refresh
				</Button>
			</div>
			{!block ? (
				<NoData>Nothing to insert. Write it in the assessment if it matters.</NoData>
			) : block.table ? (
				<div className='scrollbar-soft overflow-x-auto'>
					<table className='w-full text-left text-xs tabular-nums'>
						<thead>
							<tr className='text-muted-foreground'>
								<th scope='col' className='py-1 pr-3 font-medium'>
									<span className='sr-only'>Vital</span>
								</th>
								{block.table.columns.map((column, index) => (
									<th key={`${column}-${index}`} scope='col' className='px-2 py-1 font-medium whitespace-nowrap'>
										{column}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{block.table.rows.map((row) => (
								<tr key={row.label} className='border-t border-border-muted'>
									<th scope='row' className='py-1 pr-3 font-medium text-muted-foreground'>
										{row.label}
									</th>
									{row.cells.map((cell, index) => (
										<td
											key={index}
											className={cn(
												"px-2 py-1 whitespace-nowrap",
												cell.abnormal ? "font-semibold text-destructive" : "text-foreground",
											)}
										>
											{cell.value ? (
												<>
													{cell.abnormal ? (
														<>
															<span aria-hidden='true'>(!) </span>
															<span className='sr-only'>Out of range: </span>
														</>
													) : null}
													{cell.value}
												</>
											) : (
												<span className='text-muted-foreground'>--</span>
											)}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<ul className='flex flex-col gap-1 text-sm text-foreground'>
					{block.lines?.map((line, index) => (
						<li key={index}>{line}</li>
					))}
				</ul>
			)}
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/* NoteEditor                                                                 */
/* -------------------------------------------------------------------------- */

type NoteEditorProps = {
	draft: NoteDraft;
	context: NoteContext;
	onChange: (draft: NoteDraft) => void;
	/** Keeps the draft and closes the editor. */
	onSaveDraft: () => void;
	/** Signs the note. Called only once nothing blocks it. */
	onSign: () => void;
};

/**
 * A note being written, from its type's template (PRD Notes NTE-016): its sections in order with an index beside them,
 * Save draft and Sign. Signing with blanks or unreviewed AI drafts lists them and takes focus to the first.
 */
function NoteEditor({ draft, context, onChange, onSaveDraft, onSign }: NoteEditorProps) {
	const headingId = React.useId();
	const [attempted, setAttempted] = React.useState(false);
	const blockers = signBlockers(draft);
	const blockerIds = new Set(blockers.map((blocker) => blocker.fieldId));
	const missing = (part: string) => attempted && blockerIds.has(fieldId(draft, part));
	const hasUnverified = Object.values(draft.unverified).some(Boolean);

	const update = (change: Partial<NoteDraft>) => onChange({ ...draft, ...change });
	const setText = (id: string, text: string) =>
		update({
			texts: { ...draft.texts, [id]: text },
			unverified: { ...draft.unverified, [id]: false },
		});

	// Dictation into one section at a time (CD-08): what's heard is added after what the section held when it started.
	const dictating = React.useRef<{ id: string; base: string } | null>(null);
	const draftRef = React.useRef(draft);
	draftRef.current = draft;
	const [dictatingId, setDictatingId] = React.useState<string | null>(null);
	const dictation = useDictation({
		onHeard: ({ final, interim }) => {
			const target = dictating.current;
			if (!target) return;
			const heard = `${final}${interim}`.trim();
			const current = draftRef.current;
			onChange({
				...current,
				texts: {
					...current.texts,
					[target.id]: [target.base, heard].filter(Boolean).join(target.base.endsWith("\n") ? "" : " "),
				},
				unverified: { ...current.unverified, [target.id]: false },
			});
		},
	});
	const toggleDictation = (id: string) => {
		if (dictatingId === id) {
			dictation.stop();
			dictating.current = null;
			setDictatingId(null);
			return;
		}
		if (dictatingId) dictation.stop();
		dictating.current = { id, base: draft.texts[id] ?? "" };
		setDictatingId(id);
		dictation.reset();
		dictation.start();
	};
	React.useEffect(() => {
		if (!dictation.listening && dictatingId && dictation.error) setDictatingId(null);
	}, [dictation.listening, dictation.error, dictatingId]);

	// The section picked in the Sections menu, jumped to once the menu has closed (it returns focus to its button first).
	const jumpTo = React.useRef<string | null>(null);
	const goToSection = (id: string) => {
		const element = document.getElementById(fieldId(draft, `section-${id}`));
		element?.scrollIntoView({ behavior: "smooth", block: "start" });
		element?.querySelector<HTMLElement>("textarea, input, button[role='radio']")?.focus({ preventScroll: true });
	};

	const focusField = (id: string) => {
		const field = document.getElementById(id);
		field?.scrollIntoView({ block: "center", behavior: "smooth" });
		field?.focus({ preventScroll: true });
	};

	const sign = () => {
		if (blockers.length) {
			setAttempted(true);
			// After the list renders, so the first blank is announced with it.
			requestAnimationFrame(() => focusField(blockers[0].fieldId));
			return;
		}
		if (dictatingId) dictation.stop();
		onSign();
	};

	const refresh = (block: NoteTemplateSection & { kind: "chart" }) => {
		const read = context.readChart()[block.block];
		const chart = { ...draft.chart };
		if (read) chart[block.block] = read;
		else delete chart[block.block];
		update({ chart });
	};

	// The index marks each section: a clinician section done or still blank, an AI draft to review.
	const sectionState = (section: NoteTemplateSection): "done" | "blank" | "ai" | undefined => {
		switch (section.kind) {
			case "text":
				if (draft.unverified[section.id]) return "ai";
				if (draft.texts[section.id]?.trim()) return "done";
				return section.required ? "blank" : undefined;
			case "best-practices":
				return bestPracticeItems.every((item) => draft.practices[item.id]?.trim()) ? "done" : "blank";
			case "attestation":
				return blockers.some(
					(blocker) =>
						blocker.fieldId.endsWith("-minutes") || blocker.fieldId.endsWith("-site") || blocker.fieldId.endsWith("-persons"),
				)
					? "blank"
					: "done";
			default:
				return undefined;
		}
	};

	const minutes = Number(draft.attestation.minutes);

	return (
		<section aria-labelledby={headingId} className='flex min-w-0 flex-col bg-card'>
			{/* The note's header stays under the page's header while the sections scroll (52px compact, as the list). */}
			<div className='sticky top-[52px] z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-card px-6 py-3'>
				<div className='flex min-w-0 flex-col gap-1'>
					<div className='flex flex-wrap items-center gap-[10px]'>
						<h2 id={headingId} className='font-display text-2xl font-semibold text-foreground'>
							{draft.template.name}
						</h2>
						<span className='flex flex-wrap gap-1'>
							{hasUnverified ? (
								<Badge variant='purple' size='xs'>
									<AiSparkleIcon aria-hidden='true' />
									Unverified
								</Badge>
							) : null}
							<Badge variant='yellow' size='xs'>
								Draft
							</Badge>
						</span>
					</div>
					<p className='text-sm text-muted-foreground'>
						{draft.author.name}, {draft.author.role} · Started {formatTime(draft.startedAt)}
					</p>
				</div>
				<div className='flex gap-2'>
					{/* The note's sections, to jump to; each marked done, blank (red once signing was tried) or an AI draft to
					    review. Picking one scrolls to it and puts focus in its first field once the menu has closed. */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant='outline' size='icon-sm' aria-label='Note sections'>
								<MenuIcon aria-hidden='true' />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align='end'
							className='w-64'
							onCloseAutoFocus={(event) => {
								const target = jumpTo.current;
								if (!target) return;
								jumpTo.current = null;
								event.preventDefault();
								goToSection(target);
							}}
						>
							<DropdownMenuLabel>Sections</DropdownMenuLabel>
							{draft.template.sections.map((section) => {
								const state = sectionState(section);
								return (
									<DropdownMenuItem key={section.id} onSelect={() => (jumpTo.current = section.id)}>
										<span aria-hidden='true' className='flex size-4 shrink-0 items-center justify-center'>
											{state === "done" ? (
												<CheckIcon className='size-4 text-success' />
											) : state === "ai" ? (
												<AiSparkleIcon className='size-3.5' />
											) : state === "blank" ? (
												<CircleIcon className={cn("size-3", attempted ? "text-destructive" : "text-icon-muted")} />
											) : null}
										</span>
										<span className='truncate'>{section.heading}</span>
										<span className='sr-only'>
											{state === "done"
												? ", done"
												: state === "ai"
													? ", AI draft to review"
													: state === "blank"
														? ", required"
														: ""}
										</span>
									</DropdownMenuItem>
								);
							})}
						</DropdownMenuContent>
					</DropdownMenu>
					<Button variant='outline' size='sm' onClick={onSaveDraft}>
						Save draft
					</Button>
					<Button size='sm' onClick={sign}>
						<SignatureIcon aria-hidden='true' />
						Sign
					</Button>
				</div>
			</div>

			{/* A size container for the sections' own two-column rows (best practices, attestation). The sections are centered in
			    the pane, at most 1000px wide. */}
			<div className='@container/note p-6'>
				<div className='mx-auto flex w-full max-w-[1000px] min-w-0 flex-col gap-6'>
					{attempted && blockers.length ? (
						<div role='alert' className='flex flex-col gap-2 rounded-md bg-destructive-subtle px-3 py-2 text-sm text-foreground'>
							<p className='flex items-start gap-2 font-medium'>
								<TriangleAlertIcon aria-hidden='true' className='mt-0.5 size-4 shrink-0 text-destructive' />
								Before signing, fill in or review:
							</p>
							<ul className='flex flex-wrap gap-x-3 gap-y-1 pl-6'>
								{blockers.map((blocker) => (
									<li key={blocker.fieldId}>
										<button
											type='button'
											onClick={() => focusField(blocker.fieldId)}
											className='underline underline-offset-2 outline-none hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring'
										>
											{blocker.label}
										</button>
									</li>
								))}
							</ul>
						</div>
					) : null}

					{draft.template.sections.map((section) => {
						const sectionId = fieldId(draft, `section-${section.id}`);
						const headingRow = (tools?: React.ReactNode, required?: boolean, isMissing?: boolean) => (
							<div className='flex flex-wrap items-center justify-between gap-2'>
								<div className='flex items-baseline gap-2'>
									<h3 className='text-base font-semibold text-foreground'>{section.heading}</h3>
									{required ? <RequiredMark missing={Boolean(isMissing)} /> : null}
								</div>
								{tools ? <div className='flex items-center gap-1'>{tools}</div> : null}
							</div>
						);

						if (section.kind === "chart")
							return (
								<div key={section.id} id={sectionId} className='flex scroll-mt-36 flex-col gap-2'>
									{headingRow()}
									<ChartBlock block={draft.chart[section.block]} heading={section.heading} onRefresh={() => refresh(section)} />
								</div>
							);

						if (section.kind === "best-practices")
							return (
								<div key={section.id} id={sectionId} className='flex scroll-mt-36 flex-col gap-2'>
									{headingRow(
										undefined,
										true,
										bestPracticeItems.some((item) => missing(`practice-${item.id}`)),
									)}
									<div className='grid gap-x-4 gap-y-2 @min-[36rem]/note:grid-cols-[14rem_minmax(0,1fr)] @min-[36rem]/note:items-center'>
										{bestPracticeItems.map((item) => {
											const id = fieldId(draft, `practice-${item.id}`);
											return (
												<React.Fragment key={item.id}>
													<Label htmlFor={id} className='text-sm font-normal text-muted-foreground'>
														{item.label}
													</Label>
													<Input
														id={id}
														value={draft.practices[item.id] ?? ""}
														aria-invalid={missing(`practice-${item.id}`) || undefined}
														aria-required='true'
														onChange={(event) =>
															update({
																practices: {
																	...draft.practices,
																	[item.id]: event.target.value,
																},
															})
														}
													/>
												</React.Fragment>
											);
										})}
									</div>
								</div>
							);

						if (section.kind === "attestation") {
							const { version, site, persons } = draft.attestation;
							const setAttestation = (change: Partial<NoteAttestation>) =>
								update({ attestation: { ...draft.attestation, ...change } });
							return (
								<div key={section.id} id={sectionId} className='flex scroll-mt-36 flex-col gap-3'>
									{headingRow(undefined, true, missing("minutes") || missing("site") || missing("persons"))}
									<RadioGroup
										value={version}
										onValueChange={(value) => setAttestation({ version: value as AttestationVersion })}
										aria-label='Attestation'
										className='grid gap-2 @min-[36rem]/note:grid-cols-2'
									>
										{(Object.keys(attestationVersions) as AttestationVersion[]).map((key) => {
											const id = fieldId(draft, `version-${key}`);
											return (
												<Label
													key={key}
													htmlFor={id}
													className={cn(
														"flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal",
														version === key ? "border-foreground" : "border-border hover:bg-accent",
													)}
												>
													<RadioGroupItem id={id} value={key} className='mt-0.5' />
													<span className='flex flex-col gap-0.5'>
														<span className='text-sm font-medium text-foreground'>{attestationVersions[key].label}</span>
														<span className='text-xs text-muted-foreground'>{attestationVersions[key].description}</span>
													</span>
												</Label>
											);
										})}
									</RadioGroup>

									<div className='flex flex-col gap-1.5'>
										<div className='flex items-center gap-2'>
											<Label htmlFor={fieldId(draft, "minutes")} className='text-sm font-normal text-muted-foreground'>
												Minutes
											</Label>
											<Input
												id={fieldId(draft, "minutes")}
												type='number'
												inputMode='numeric'
												min={1}
												className='w-24'
												value={draft.attestation.minutes}
												aria-invalid={missing("minutes") || undefined}
												aria-required='true'
												aria-describedby={fieldId(draft, "minutes-help")}
												onChange={(event) => setAttestation({ minutes: event.target.value })}
											/>
										</div>
										{/* Only ever what the documentation lacks for work done, never a push to a higher code (Spec §8.12). */}
										<p id={fieldId(draft, "minutes-help")} className='text-xs text-muted-foreground'>
											{context.loggedMinutes
												? `${context.loggedMinutes} min of video consult logged today for this patient. Add your chart review and other time.`
												: "No video consult logged today for this patient."}
											{version === "critical-care" && minutes > 0 && minutes < 30
												? " Critical care time needs 30 minutes or more; under that, use Standard."
												: ""}
										</p>
									</div>

									<p className='rounded-md bg-background-subtle px-3 py-2 text-sm text-foreground'>
										{attestationVersions[version].text(draft.attestation.minutes || "___")}
									</p>

									<div className='grid gap-x-4 gap-y-2 text-sm @min-[36rem]/note:grid-cols-[14rem_minmax(0,1fr)] @min-[36rem]/note:items-center'>
										<span className='text-muted-foreground'>Telemedicine consent</span>
										<span className='text-foreground'>In chart</span>
										<Label htmlFor={fieldId(draft, "site")} className='text-sm font-normal text-muted-foreground'>
											Provider distant site (state abbreviation)
										</Label>
										<Input
											id={fieldId(draft, "site")}
											value={site}
											maxLength={2}
											className='w-20 uppercase'
											aria-invalid={missing("site") || undefined}
											aria-required='true'
											onChange={(event) =>
												setAttestation({
													site: event.target.value.toUpperCase(),
												})
											}
										/>
										<Label htmlFor={fieldId(draft, "persons")} className='text-sm font-normal text-muted-foreground'>
											Persons involved
										</Label>
										<div className='flex items-center gap-2'>
											<span className='text-foreground'>Patient,</span>
											<Input
												id={fieldId(draft, "persons")}
												value={persons}
												placeholder='Bedside RN, family…'
												aria-invalid={missing("persons") || undefined}
												aria-required='true'
												onChange={(event) => setAttestation({ persons: event.target.value })}
											/>
										</div>
									</div>
									<p className='text-sm text-muted-foreground'>{attestationLines.audiovisual}</p>
								</div>
							);
						}

						// A section the clinician writes: typed, dictated, or drafted by AI.
						const id = fieldId(draft, section.id);
						const text = draft.texts[section.id] ?? "";
						const ai = section.ai ? context.ai?.[section.ai] : undefined;
						const listening = dictatingId === section.id && dictation.listening;
						return (
							<div key={section.id} id={sectionId} className='flex scroll-mt-36 flex-col gap-2'>
								{headingRow(
									<>
										{ai && !text.trim() ? (
											<Button
												variant='outline'
												size='xs'
												onClick={() =>
													update({
														texts: { ...draft.texts, [section.id]: ai },
														unverified: {
															...draft.unverified,
															[section.id]: true,
														},
														aiUsed: true,
													})
												}
											>
												<AiSparkleIcon aria-hidden='true' />
												Draft with AI
											</Button>
										) : null}
										{dictation.supported ? (
											<Button
												variant={listening ? "destructive-secondary" : "ghost"}
												size='icon-sm'
												aria-pressed={listening}
												aria-label={listening ? `Stop dictating ${section.heading}` : `Dictate ${section.heading}`}
												onClick={() => toggleDictation(section.id)}
											>
												{listening ? <MicOffIcon aria-hidden='true' /> : <MicIcon aria-hidden='true' />}
											</Button>
										) : null}
									</>,
									section.required,
									missing(section.id) && !text.trim(),
								)}
								<Textarea
									id={id}
									value={text}
									rows={3}
									placeholder={section.placeholder}
									aria-label={section.heading}
									aria-required={section.required || undefined}
									aria-invalid={(missing(section.id) && !text.trim()) || undefined}
									className={cn(draft.unverified[section.id] && "border-tone-accent-muted bg-tone-accent-subtle")}
									onChange={(event) => setText(section.id, event.target.value)}
								/>
								{draft.unverified[section.id] ? (
									<div className='flex flex-wrap items-center gap-2'>
										<Badge variant='purple' size='xs'>
											<AiSparkleIcon aria-hidden='true' />
											AI draft · Unverified
										</Badge>
										<span className='text-xs text-muted-foreground'>Review it, then edit or accept it before signing.</span>
										<Button
											variant='outline'
											size='xs'
											onClick={() =>
												update({
													unverified: {
														...draft.unverified,
														[section.id]: false,
													},
												})
											}
										>
											<CheckIcon aria-hidden='true' />
											Accept
										</Button>
									</div>
								) : null}
								{listening ? (
									<p role='status' className='text-xs text-muted-foreground'>
										Listening… press the microphone again to stop.
									</p>
								) : null}
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}

export { draftFromNote, newNoteDraft, NoteEditor, noteFromDraft, signBlockers, type NoteDraft, type NoteEditorProps };
