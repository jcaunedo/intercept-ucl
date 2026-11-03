import * as React from "react";
import { CircleCheckIcon, LoaderCircleIcon, PencilIcon, PlusIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import { Badge } from "@/components/data-display/badge";
import { Input } from "@/components/forms/input";
import { Label } from "@/components/forms/label";
import { Textarea } from "@/components/forms/textarea";
import { expandVariants, fadeVariants, useExpandClip, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { SourceLabel } from "../shared/source-label";

// Exploration (DESIGN.md "Alert modal" › "Care pathway"): Scenario 1, step 4. The platform suggests a pathway's order
// set; the intensivist reviews it, edits a dose if needed, and accepts it, which sends the orders to the local physician
// for co-signature. Once co-signed the orders are active and the bedside team carries them out. Or the intensivist
// declines it, with a reason. A suggestion never becomes an order on its own (PRD PD-061).

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

/** One order in the pathway's set. */
type CarePathwayOrder = {
	id: string;
	/** What's ordered, e.g. "Furosemide IV". */
	name: string;
	/** The dose or settings, which the intensivist can edit, e.g. "80 mg IV bolus, then 10 mg/h". */
	dose: string;
	/** Its target or the condition it depends on, e.g. "Urine output ≥ 100 mL/h over 2 h". */
	detail?: string;
	/** The values behind it, e.g. "SpO₂ 89% on 4 L, RR 26". */
	evidence?: string;
};

/** Who co-signs the accepted orders: the hospital's physician. */
type CarePathwayCosigner = { name: string; role: string };

type CarePathway = {
	/** E.g. "CHF exacerbation pathway". */
	title: string;
	/** Where the pathway comes from, e.g. "Reference protocol, CHF exacerbation (configurable per hospital)". */
	source: string;
	orders: CarePathwayOrder[];
	cosigner: CarePathwayCosigner;
};

/** Where the pathway is: suggested, declined, sent for co-signature, or co-signed and active. */
type CarePathwayStatus = "suggested" | "declined" | "pending" | "active";

/**
 * What the intensivist did: the orders as accepted (with any edited dose and a note for the co-signer), or a decline and
 * its reason.
 */
type CarePathwayDecision =
	| { type: "accept"; orders: CarePathwayOrder[]; edited: string[]; note?: string }
	| { type: "decline"; rationale: string };

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

// Stands in for the local physician co-signing from home, so the prototype shows Awaiting co-signature.
const COSIGN_DELAY_MS = 4000;

const statusBadges: Record<CarePathwayStatus, { label: string; variant: "secondary" | "amber" | "green" }> = {
	suggested: { label: "Suggested", variant: "secondary" },
	declined: { label: "Declined", variant: "secondary" },
	pending: { label: "Awaiting co-signature", variant: "amber" },
	active: { label: "Active", variant: "green" },
};

const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/* -------------------------------------------------------------------------- */
/* Parts                                                                      */
/* -------------------------------------------------------------------------- */

/** A part that opens and closes in place (Expand), so the panel's height never jumps; a fade under reduced motion. */
function Expand({ children, className }: { children: React.ReactNode; className?: string }) {
	const { prefersReducedMotion } = useMotionPreference();
	const clip = useExpandClip();
	return (
		<motion.div
			{...clip}
			variants={prefersReducedMotion ? fadeVariants : expandVariants}
			initial='initial'
			animate='animate'
			exit='exit'
			className={className}
		>
			{children}
		</motion.div>
	);
}

/** One order: its name, dose (editable while suggested), target or condition, and the values behind it. */
function OrderRow({
	order,
	dose,
	editing,
	editable,
	active,
	onEdit,
	onSave,
	onCancel,
}: {
	order: CarePathwayOrder;
	dose: string;
	editing: boolean;
	editable: boolean;
	active: boolean;
	onEdit: () => void;
	onSave: (dose: string) => void;
	onCancel: () => void;
}) {
	const [draft, setDraft] = React.useState(dose);
	const inputId = React.useId();
	const edited = dose !== order.dose;
	React.useEffect(() => {
		if (editing) setDraft(dose);
	}, [editing, dose]);
	const save = () => (draft.trim() ? onSave(draft.trim()) : onCancel());

	return (
		<li className='flex flex-col gap-1 py-3 first:pt-0 last:pb-0'>
			<div className='flex items-center gap-2'>
				<span className='text-sm font-semibold text-foreground'>{order.name}</span>
				{edited ? (
					<Badge variant='blue' size='xs'>
						Edited
					</Badge>
				) : null}
				{active ? (
					<Badge variant='green' size='xs'>
						Active
					</Badge>
				) : null}
				{editable && !editing ? (
					<Button
						variant='ghost'
						size='icon-xs'
						aria-label={`Edit ${order.name} dose`}
						onClick={onEdit}
						className='ml-auto text-muted-foreground'
					>
						<PencilIcon />
					</Button>
				) : null}
			</div>
			<AnimatePresence initial={false} mode='popLayout'>
				{editing ? (
					<Expand key='edit'>
						<form
							className='flex flex-col gap-2 pt-1'
							onSubmit={(event) => {
								event.preventDefault();
								save();
							}}
						>
							<Label htmlFor={inputId} className='sr-only'>
								{order.name} dose
							</Label>
							<Input id={inputId} value={draft} onChange={(event) => setDraft(event.target.value)} autoFocus />
							<div className='flex justify-end gap-2'>
								<Button type='button' variant='ghost' size='sm' onClick={onCancel}>
									Cancel
								</Button>
								<Button type='submit' variant='neutral' size='sm'>
									Save dose
								</Button>
							</div>
						</form>
					</Expand>
				) : (
					<motion.p
						key='dose'
						variants={fadeVariants}
						initial='initial'
						animate='animate'
						exit='exit'
						className='text-sm font-medium text-foreground'
					>
						{dose}
						{edited ? (
							<span className='block text-muted-foreground'>
								Suggested: <s>{order.dose}</s>
							</span>
						) : null}
					</motion.p>
				)}
			</AnimatePresence>
			{order.detail ? <p className='text-sm text-foreground'>{order.detail}</p> : null}
			{order.evidence ? <p className='text-xs text-muted-foreground'>Based on {order.evidence}</p> : null}
		</li>
	);
}

/* -------------------------------------------------------------------------- */
/* Care pathway                                                               */
/* -------------------------------------------------------------------------- */

/**
 * A suggested care pathway and its order set, for the intensivist to review: edit a dose, then accept (the orders go to
 * the local physician for co-signature, then become active) or decline with a reason. The title, status and source sit
 * above the order set, which is a card, dashed while it's a suggestion and solid once accepted; the decision follows it. `escapeRef` lets the modal hand Escape to an open dose edit, which it cancels, instead of closing.
 *
 * Figma: [intercept.ds › care-pathway](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1328-2054)
 */
function CarePathwayPanel({
	pathway,
	defaultStatus = "suggested",
	onDecision,
	onStatusChange,
	escapeRef,
	className,
}: {
	pathway: CarePathway;
	defaultStatus?: CarePathwayStatus;
	onDecision?: (decision: CarePathwayDecision) => void;
	onStatusChange?: (status: CarePathwayStatus) => void;
	escapeRef?: React.RefObject<(() => boolean) | null>;
	className?: string;
}) {
	const [status, setStatusState] = React.useState<CarePathwayStatus>(defaultStatus);
	const [doses, setDoses] = React.useState<Record<string, string>>({});
	const [editing, setEditing] = React.useState<string | null>(null);
	const [declining, setDeclining] = React.useState(false);
	const [rationale, setRationale] = React.useState("");
	const [declinedWith, setDeclinedWith] = React.useState("");
	const [noting, setNoting] = React.useState(false);
	const [note, setNote] = React.useState("");
	const [sentNote, setSentNote] = React.useState("");
	const [sentAt, setSentAt] = React.useState<Date | null>(null);
	const [cosignedAt, setCosignedAt] = React.useState<Date | null>(null);
	const rationaleId = React.useId();
	const noteId = React.useId();
	const setStatus = (next: CarePathwayStatus) => {
		setStatusState(next);
		onStatusChange?.(next);
	};

	React.useEffect(() => {
		if (status !== "pending") return;
		const timer = window.setTimeout(() => {
			setCosignedAt(new Date());
			setStatus("active");
		}, COSIGN_DELAY_MS);
		return () => window.clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [status]);

	// Escape cancels an open dose edit or decline, or closes an empty note, before it closes the modal.
	React.useEffect(() => {
		if (!escapeRef) return;
		escapeRef.current = () => {
			if (editing) {
				setEditing(null);
				return true;
			}
			if (declining) {
				setDeclining(false);
				return true;
			}
			if (noting && !note.trim()) {
				setNoting(false);
				return true;
			}
			return false;
		};
		return () => {
			escapeRef.current = null;
		};
	}, [escapeRef, editing, declining, noting, note]);

	const doseOf = (order: CarePathwayOrder) => doses[order.id] ?? order.dose;
	const edited = pathway.orders.filter((order) => doseOf(order) !== order.dose).map((order) => order.id);
	const { cosigner } = pathway;
	const badge = statusBadges[status];

	const accept = () => {
		const sent = noting ? note.trim() : "";
		setEditing(null);
		setNoting(false);
		setSentNote(sent);
		setSentAt(new Date());
		setStatus("pending");
		onDecision?.({
			type: "accept",
			orders: pathway.orders.map((order) => ({
				...order,
				dose: doseOf(order),
			})),
			edited,
			...(sent ? { note: sent } : {}),
		});
	};
	const removeNote = () => {
		setNote("");
		setNoting(false);
	};
	const decline = () => {
		const reason = rationale.trim();
		if (!reason) return;
		setDeclinedWith(reason);
		setDeclining(false);
		setStatus("declined");
		onDecision?.({ type: "decline", rationale: reason });
	};

	return (
		<section aria-label={pathway.title} data-status={status} className={cn("flex flex-col gap-4", className)}>
			<div className='flex flex-col gap-1'>
				<div className='flex flex-wrap items-center gap-2'>
					<h3 className='text-base font-bold text-foreground'>{pathway.title}</h3>
					<AnimatePresence mode='wait' initial={false}>
						<motion.span key={status} variants={fadeVariants} initial='initial' animate='animate' exit='exit'>
							<Badge variant={badge.variant} size='xs'>
								{badge.label}
							</Badge>
						</motion.span>
					</AnimatePresence>
				</div>
				<SourceLabel className='text-xs text-muted-foreground'>Source: {pathway.source}</SourceLabel>
			</div>

			{/* The order set: dashed while it's a suggestion, solid once accepted. */}
			<div
				className={cn(
					"rounded-card border bg-background p-4 transition-colors",
					status === "suggested" ? "border-dashed border-border" : "border-border",
				)}
			>
				<ol
					aria-label='Orders'
					className={cn("flex flex-col divide-y divide-border-muted", status === "declined" && "opacity-60")}
				>
					{pathway.orders.map((order) => (
						<OrderRow
							key={order.id}
							order={order}
							dose={doseOf(order)}
							editing={editing === order.id}
							editable={status === "suggested" && !declining}
							active={status === "active"}
							onEdit={() => setEditing(order.id)}
							onSave={(dose) => {
								setDoses((current) => ({ ...current, [order.id]: dose }));
								setEditing(null);
							}}
							onCancel={() => setEditing(null)}
						/>
					))}
				</ol>
			</div>

			{/* An optional note that goes with the orders to the co-signer, e.g. why a dose was changed. */}
			<AnimatePresence initial={false} mode='popLayout'>
				{status === "suggested" && !declining && !noting ? (
					<motion.div key='add-note' variants={fadeVariants} initial='initial' animate='animate' exit='exit'>
						<Button variant='link' size='sm' onClick={() => setNoting(true)} className='h-auto px-0'>
							<PlusIcon />
							Add note
						</Button>
					</motion.div>
				) : null}
				{status === "suggested" && !declining && noting ? (
					<Expand key='note'>
						<div className='flex flex-col gap-2'>
							<div className='flex items-center justify-between gap-2'>
								<Label htmlFor={noteId}>Note for {cosigner.name}</Label>
								<Button variant='link' size='sm' onClick={removeNote} className='h-auto px-0 text-muted-foreground'>
									Remove
								</Button>
							</div>
							<Textarea
								id={noteId}
								value={note}
								onChange={(event) => setNote(event.target.value)}
								placeholder='E.g. why you changed a dose'
								autoFocus
							/>
						</div>
					</Expand>
				) : null}
			</AnimatePresence>

			{/* The decision and what follows it sit at the bottom of the panel, which fills its column. */}
			<div className='mt-auto'>
				<AnimatePresence initial={false}>
					{status === "suggested" && !declining ? (
						<Expand key='review'>
							<div className='flex flex-col gap-3 pt-3'>
								<p className='text-sm text-muted-foreground'>
									Accepting sends the orders to{" "}
									<span className='font-medium text-foreground'>
										{cosigner.name}, {cosigner.role}
									</span>
									, for co-signature.
								</p>
								<div className='flex gap-2'>
									<Button variant='outline' size='md' onClick={() => setDeclining(true)} className='flex-1'>
										Decline
									</Button>
									<Button variant='neutral' size='md' onClick={accept} disabled={editing !== null} className='flex-1'>
										Accept and send
									</Button>
								</div>
							</div>
						</Expand>
					) : null}
					{status === "suggested" && declining ? (
						<Expand key='decline'>
							<form
								className='flex flex-col gap-2 pt-3'
								onSubmit={(event) => {
									event.preventDefault();
									decline();
								}}
							>
								<Label htmlFor={rationaleId}>Why decline?</Label>
								<Textarea
									id={rationaleId}
									value={rationale}
									onChange={(event) => setRationale(event.target.value)}
									placeholder='E.g. transferring to Scottsbluff instead'
									autoFocus
								/>
								<div className='flex justify-end gap-2'>
									<Button type='button' variant='ghost' size='md' onClick={() => setDeclining(false)}>
										Cancel
									</Button>
									<Button type='submit' variant='neutral' size='md' disabled={!rationale.trim()}>
										Decline pathway
									</Button>
								</div>
							</form>
						</Expand>
					) : null}
					{status === "declined" ? (
						<Expand key='declined'>
							<p className='pt-3 text-sm text-foreground'>
								<span className='font-medium'>Declined: </span>
								{declinedWith}
							</p>
						</Expand>
					) : null}
					{status === "pending" ? (
						<Expand key='pending'>
							<p role='status' className='flex items-start gap-2 pt-3 text-sm text-foreground'>
								<LoaderCircleIcon
									aria-hidden='true'
									className='mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none'
								/>
								<span>
									Sent to {cosigner.name} for co-signature
									{sentAt ? <span className='text-muted-foreground'> · {formatTime(sentAt)}</span> : null}
									{edited.length ? (
										<span className='block text-muted-foreground'>
											With {edited.length === 1 ? "1 edited dose" : `${edited.length} edited doses`}
										</span>
									) : null}
									{sentNote ? (
										<span className='block'>
											<span className='text-muted-foreground'>Note: </span>
											{sentNote}
										</span>
									) : null}
								</span>
							</p>
						</Expand>
					) : null}
					{status === "active" ? (
						<Expand key='active'>
							<p role='status' className='flex items-start gap-2 pt-3 text-sm text-foreground'>
								<CircleCheckIcon aria-hidden='true' className='mt-0.5 size-4 shrink-0 text-success' />
								<span>
									Co-signed by {cosigner.name}
									{cosignedAt ? <span className='text-muted-foreground'> · {formatTime(cosignedAt)}</span> : null}
									<span className='block text-muted-foreground'>Orders active. The bedside team carries them out.</span>
									{sentNote ? (
										<span className='block'>
											<span className='text-muted-foreground'>Note: </span>
											{sentNote}
										</span>
									) : null}
								</span>
							</p>
						</Expand>
					) : null}
				</AnimatePresence>
			</div>
		</section>
	);
}

export {
	CarePathwayPanel,
	type CarePathway,
	type CarePathwayCosigner,
	type CarePathwayDecision,
	type CarePathwayOrder,
	type CarePathwayStatus,
};
