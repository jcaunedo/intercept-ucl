import * as React from "react";
import { CircleCheckIcon, LoaderCircleIcon, PencilIcon, PlusIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import { Badge } from "@/components/data-display/badge";
import { Input } from "@/components/forms/input";
import { Label } from "@/components/forms/label";
import { Textarea } from "@/components/forms/textarea";
import {
	expandVariants,
	fadeVariants,
	scrollContainerOf,
	scrollIntoViewSmoothly,
	useExpandClip,
	useMotionPreference,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

import { SourceLabel } from "../shared/source-label";

// Exploration (DESIGN.md "Alert modal" › "Care pathway"): Scenario 1, step 4. The platform suggests a pathway's order
// set; the intensivist reviews it, edits a dose if needed, and accepts it, which sends the orders to the local physician
// for co-signature. Once co-signed the orders are active and the bedside team carries them out. Or the intensivist
// declines it, with a reason, and can then write their own pathway (Nov 3, 2026, user's call), which goes to the same
// co-signer. A suggestion never becomes an order on its own (PRD PD-061).

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
 * What the intensivist did: the orders as accepted (with any edited dose and a note for the co-signer), a decline and
 * its reason, a decline undone (the suggestion is back), or, after a decline, their own pathway sent for co-signature.
 */
type CarePathwayDecision =
	| { type: "accept"; orders: CarePathwayOrder[]; edited: string[]; note?: string }
	| { type: "decline"; rationale: string }
	| { type: "undecline" }
	| { type: "create"; title: string; orders: CarePathwayOrder[] };

/** An order being written in the intensivist's own pathway. */
type DraftOrder = { id: string; name: string; dose: string; detail: string };

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
	const opensEdit = editable && !editing;

	return (
		// While it can be edited, a click anywhere on the order opens its dose edit, as the pencil does (Nov 3, 2026, user's
		// call); the pencil stays the keyboard's way in, and takes its hover fill while the order is hovered.
		<li
			onClick={opensEdit ? onEdit : undefined}
			className={cn("group/order flex flex-col gap-1 py-3 first:pt-0 last:pb-0", opensEdit && "cursor-pointer")}
		>
			<div className='flex items-center gap-2'>
				<span className='text-sm font-bold text-foreground'>{order.name}</span>
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
						onClick={(event) => {
							// The order's own click would open it again.
							event.stopPropagation();
							onEdit();
						}}
						className='ml-auto group-hover/order:bg-accent'
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
									Save
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

/**
 * The intensivist's own pathway, written after declining the suggestion: a name, then each order's name, dose and an
 * optional target. Orders are added and removed in place; a blank one is left out when it's sent. Sent from the panel's
 * bottom (`id` is the form's, for its submit button there).
 */
function PathwayBuilder({
	id,
	title,
	orders,
	onTitleChange,
	onOrdersChange,
	onAddOrder,
	onSubmit,
}: {
	id: string;
	title: string;
	orders: DraftOrder[];
	onTitleChange: (title: string) => void;
	onOrdersChange: (orders: DraftOrder[]) => void;
	onAddOrder: () => void;
	onSubmit: () => void;
}) {
	const fieldId = React.useId();
	const change = (orderId: string, field: keyof Omit<DraftOrder, "id">, value: string) =>
		onOrdersChange(orders.map((order) => (order.id === orderId ? { ...order, [field]: value } : order)));

	return (
		<form
			id={id}
			aria-label='Your pathway'
			className='flex flex-col gap-4'
			onSubmit={(event) => {
				event.preventDefault();
				onSubmit();
			}}
		>
			<div className='flex flex-col gap-2'>
				<Label htmlFor={`${fieldId}-title`}>Pathway name</Label>
				<Input
					id={`${fieldId}-title`}
					value={title}
					onChange={(event) => onTitleChange(event.target.value)}
					placeholder='E.g. Diuresis and transfer'
					autoFocus
				/>
			</div>
			{/* Each order is its own card; the space under it is inside its Expand, so removing one closes the gap with it. */}
			<ol aria-label='Your orders' className='flex flex-col'>
				<AnimatePresence initial={false}>
					{orders.map((order, index) => {
						const label = `Order ${index + 1}`;
						const id = `${fieldId}-${order.id}`;
						return (
							// The li is AnimatePresence's child; its Expand plays the open and close.
							<li key={order.id} aria-label={label}>
								<Expand className='pb-3'>
									<div className='flex flex-col gap-2 rounded-card border border-border bg-background p-4'>
										<div className='flex items-center gap-2'>
											<span className='text-sm font-semibold text-foreground'>{label}</span>
											{orders.length > 1 ? (
												<Button
													type='button'
													variant='ghost'
													size='icon-xs'
													aria-label={`Remove ${label.toLowerCase()}`}
													onClick={() => onOrdersChange(orders.filter((other) => other.id !== order.id))}
													className='ml-auto text-muted-foreground'
												>
													<XIcon />
												</Button>
											) : null}
										</div>
										<Label htmlFor={`${id}-name`} className='text-xs text-muted-foreground'>
											Order
										</Label>
										<Input
											id={`${id}-name`}
											value={order.name}
											onChange={(event) => change(order.id, "name", event.target.value)}
											placeholder='E.g. Furosemide IV'
										/>
										<Label htmlFor={`${id}-dose`} className='text-xs text-muted-foreground'>
											Dose or settings
										</Label>
										<Input
											id={`${id}-dose`}
											value={order.dose}
											onChange={(event) => change(order.id, "dose", event.target.value)}
											placeholder='E.g. 80 mg IV bolus'
										/>
										<Label htmlFor={`${id}-detail`} className='text-xs text-muted-foreground'>
											Target or condition (optional)
										</Label>
										<Input
											id={`${id}-detail`}
											value={order.detail}
											onChange={(event) => change(order.id, "detail", event.target.value)}
											placeholder='E.g. Urine output ≥ 100 mL/h'
										/>
									</div>
								</Expand>
							</li>
						);
					})}
				</AnimatePresence>
			</ol>
			<Button
				type='button'
				variant='link'
				size='sm'
				onClick={onAddOrder}
				className='-mt-4 h-auto self-start px-0 has-[>svg]:px-0'
			>
				<PlusIcon />
				Add order
			</Button>
		</form>
	);
}

/* -------------------------------------------------------------------------- */
/* Care pathway                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Whether a sticky block at the bottom of its scrolling column has content behind it: the column isn't scrolled to its
 * end. Updates as the column scrolls, resizes or its content grows.
 */
function useStuckToBottom(ref: React.RefObject<HTMLElement | null>) {
	const [stuck, setStuck] = React.useState(false);
	React.useEffect(() => {
		const element = ref.current;
		if (!element) return;
		const column = scrollContainerOf(element);
		const update = () => setStuck(column.scrollTop + column.clientHeight < column.scrollHeight - 1);
		update();
		column.addEventListener("scroll", update, { passive: true });
		const observer = new ResizeObserver(update);
		observer.observe(column);
		for (const child of column.children) observer.observe(child);
		// Content that comes in later (keep or transfer under the pathway) changes the column's height too.
		const mutations = new MutationObserver(update);
		mutations.observe(column, { childList: true, subtree: true });
		return () => {
			column.removeEventListener("scroll", update);
			observer.disconnect();
			mutations.disconnect();
		};
	}, [ref]);
	return stuck;
}

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
	const decisionRef = React.useRef<HTMLDivElement>(null);
	const decisionStuck = useStuckToBottom(decisionRef);
	const [declinedWith, setDeclinedWith] = React.useState("");
	const [noting, setNoting] = React.useState(false);
	const [note, setNote] = React.useState("");
	const [sentNote, setSentNote] = React.useState("");
	const [sentAt, setSentAt] = React.useState<Date | null>(null);
	const [cosignedAt, setCosignedAt] = React.useState<Date | null>(null);
	// The intensivist's own pathway, after a decline: the draft keeps what was typed while the form is closed, and `custom`
	// is the pathway once sent, which the panel then shows in the suggestion's place.
	const [custom, setCustom] = React.useState<CarePathway | null>(null);
	const [building, setBuilding] = React.useState(false);
	const [draftTitle, setDraftTitle] = React.useState("");
	const nextDraftOrder = React.useRef(0);
	const newDraftOrder = (): DraftOrder => ({ id: `own-${++nextDraftOrder.current}`, name: "", dose: "", detail: "" });
	const [draftOrders, setDraftOrders] = React.useState<DraftOrder[]>(() => [newDraftOrder()]);
	const rationaleId = React.useId();
	const noteId = React.useId();
	const builderId = React.useId();
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

	// Sent (Accept, or the clinician's own pathway): the column scrolls the status line to its top, under the
	// sticky label (`scroll-mt-13`: the label's height plus the banner's 12px top margin, or the sticky footer's background
	// covers the label), and again when it's co-signed, as Keep or transfer opens under it (Nov 5, 2026, user's call), unless
	// the clinician has scrolled, clicked or typed since: then they've moved on (e.g. to keep or transfer) and the column
	// stays where they are. Not when the panel opens on a pathway already sent.
	const followStatus = React.useRef(false);
	const pendingRef = React.useRef<HTMLDivElement>(null);
	const activeRef = React.useRef<HTMLDivElement>(null);
	const { prefersReducedMotion } = useMotionPreference();
	React.useEffect(() => {
		const line = status === "pending" ? pendingRef.current : status === "active" ? activeRef.current : null;
		if (!followStatus.current || !line) return;
		const stopScroll = scrollIntoViewSmoothly(line, { reducedMotion: Boolean(prefersReducedMotion), block: "start" });
		if (status === "active") {
			followStatus.current = false;
			return stopScroll;
		}
		const movedOn = () => {
			followStatus.current = false;
		};
		const inputs = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
		for (const input of inputs) window.addEventListener(input, movedOn, { passive: true });
		return () => {
			stopScroll();
			for (const input of inputs) window.removeEventListener(input, movedOn);
		};
	}, [status, prefersReducedMotion]);

	// Escape cancels an open dose edit or decline, closes the own-pathway form (its draft is kept) or an empty note, before
	// it closes the modal.
	React.useEffect(() => {
		if (!escapeRef) return;
		escapeRef.current = () => {
			if (building) {
				setBuilding(false);
				return true;
			}
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
	}, [escapeRef, building, editing, declining, noting, note]);

	const shown = custom ?? pathway;
	const doseOf = (order: CarePathwayOrder) => doses[order.id] ?? order.dose;
	const edited = custom ? [] : pathway.orders.filter((order) => doseOf(order) !== order.dose).map((order) => order.id);
	const { cosigner } = pathway;
	const badge = statusBadges[status];

	// A blank order is left out; every other needs its name and dose, and the pathway its name.
	const filledOrders = draftOrders.filter((order) => order.name.trim() || order.dose.trim() || order.detail.trim());
	const draftReady =
		Boolean(draftTitle.trim()) && filledOrders.length > 0 && filledOrders.every((order) => order.name.trim() && order.dose.trim());
	const sendOwn = () => {
		if (!draftReady) return;
		const own: CarePathway = {
			title: draftTitle.trim(),
			source: `Created by you · Declined suggestion: ${pathway.title}`,
			orders: filledOrders.map((order) => ({
				id: order.id,
				name: order.name.trim(),
				dose: order.dose.trim(),
				...(order.detail.trim() ? { detail: order.detail.trim() } : {}),
			})),
			cosigner,
		};
		setCustom(own);
		setBuilding(false);
		setSentNote("");
		setSentAt(new Date());
		followStatus.current = true;
		setStatus("pending");
		onDecision?.({ type: "create", title: own.title, orders: own.orders });
	};

	const accept = () => {
		const sent = noting ? note.trim() : "";
		setEditing(null);
		setNoting(false);
		setSentNote(sent);
		setSentAt(new Date());
		followStatus.current = true;
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
	// Back to the suggestion, as if it had never been declined (Nov 3, 2026, user's call). The reason stays in the decline
	// form for a second decline, and an own-pathway draft is kept.
	const undoDecline = () => {
		setBuilding(false);
		setDeclinedWith("");
		setStatus("suggested");
		onDecision?.({ type: "undecline" });
	};

	return (
		<section
			aria-label={shown.title}
			data-status={status}
			data-own={custom ? "" : undefined}
			className={cn("flex flex-col gap-4", className)}
		>
			<div className='flex flex-col gap-1'>
				<div className='flex flex-wrap items-center gap-2'>
					<h3 className='text-base font-bold text-foreground'>{shown.title}</h3>
					<AnimatePresence mode='wait' initial={false}>
						<motion.span key={status} variants={fadeVariants} initial='initial' animate='animate' exit='exit'>
							<Badge variant={badge.variant} size='xs'>
								{badge.label}
							</Badge>
						</motion.span>
					</AnimatePresence>
				</div>
				<SourceLabel className='text-xs text-muted-foreground'>Source: {shown.source}</SourceLabel>
			</div>

			{/* The order set: dashed while it's a suggestion, solid once accepted or the intensivist's own. After a decline,
			    the own-pathway form takes its place while open. */}
			<AnimatePresence initial={false} mode='wait'>
				{building ? (
					<Expand key='builder'>
						<PathwayBuilder
							id={builderId}
							title={draftTitle}
							orders={draftOrders}
							onTitleChange={setDraftTitle}
							onOrdersChange={setDraftOrders}
							onAddOrder={() => setDraftOrders((current) => [...current, newDraftOrder()])}
							onSubmit={sendOwn}
						/>
					</Expand>
				) : (
					<Expand key={custom ? "own" : "suggested"}>
						<div
							className={cn(
								"rounded-card border bg-background p-4 transition-colors",
								status === "suggested" ? "border-dashed border-muted-foreground" : "border-border",
							)}
						>
							<ol
								aria-label='Orders'
								className={cn("flex flex-col divide-y divide-border", status === "declined" && "opacity-60")}
							>
								{shown.orders.map((order) => (
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
					</Expand>
				)}
			</AnimatePresence>

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

			{/* The decision and what follows it sit at the bottom of the panel, which fills its column, and stick to the
			    column's bottom while the orders scroll under them (Nov 3, 2026, user's call), on the column's background.
			    Sticky offsets count from inside the column's 24px padding, which this takes over. */}
			{/* While the orders run on under it, a rule on its top edge (Nov 3, 2026, user's call); gone once the column is
			    scrolled to its end. Transparent otherwise, so it never moves the layout. */}
			<div
				ref={decisionRef}
				data-stuck={decisionStuck || undefined}
				className='sticky -bottom-6 z-10 -mx-6 mt-auto -mb-6 border-t border-transparent bg-background px-6 pb-6 data-stuck:border-border'
			>
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
										{/* "Accept" (Nov 5, 2026, user's call; it was Accept and send). */}
										Accept
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
					{/* Declined: the reason, a way back to the suggestion, and the way to the intensivist's own pathway. */}
					{status === "declined" && !building ? (
						<Expand key='declined'>
							<div className='flex flex-col gap-3 pt-3'>
								<p className='text-sm text-foreground'>
									<span className='font-medium'>Declined: </span>
									{declinedWith}
								</p>
								<div className='flex gap-2'>
									<Button variant='ghost' size='md' onClick={undoDecline}>
										<RotateCcwIcon />
										Undo decline
									</Button>
									<Button variant='outline' size='md' onClick={() => setBuilding(true)} className='flex-1'>
										<PlusIcon />
										Create your own pathway
									</Button>
								</div>
							</div>
						</Expand>
					) : null}
					{status === "declined" && building ? (
						<Expand key='build'>
							<div className='flex flex-col gap-3 pt-3'>
								<p className='text-sm text-muted-foreground'>
									Your orders go to{" "}
									<span className='font-medium text-foreground'>
										{cosigner.name}, {cosigner.role}
									</span>
									, for co-signature.
								</p>
								<div className='flex justify-end gap-2'>
									<Button type='button' variant='ghost' size='md' onClick={() => setBuilding(false)}>
										Cancel
									</Button>
									<Button type='submit' form={builderId} variant='neutral' size='md' disabled={!draftReady}>
										Send for co-signature
									</Button>
								</div>
							</div>
						</Expand>
					) : null}
					{status === "pending" ? (
						<Expand key='pending'>
							{/* A banner, as Low-bandwidth mode's (Nov 5, 2026, user's call): neutral while it waits. */}
							<div
								ref={pendingRef}
								role='status'
								className='mt-3 flex scroll-mt-13 gap-3 rounded-xl border border-neutral-muted bg-neutral-subtle p-3 text-sm text-foreground'
							>
								<LoaderCircleIcon
									aria-hidden='true'
									className='mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none'
								/>
								<div className='flex min-w-0 flex-col gap-0.5'>
									<p className='font-semibold'>
										Sent to {cosigner.name} for co-signature
										{sentAt ? <span className='font-normal text-muted-foreground'> · {formatTime(sentAt)}</span> : null}
									</p>
									{edited.length ? (
										<p>With {edited.length === 1 ? "1 edited dose" : `${edited.length} edited doses`}</p>
									) : null}
									{sentNote ? (
										<p>
											<span className='text-muted-foreground'>Note: </span>
											{sentNote}
										</p>
									) : null}
								</div>
							</div>
						</Expand>
					) : null}
					{status === "active" ? (
						<Expand key='active'>
							{/* A banner, as Low-bandwidth mode's (Nov 5, 2026, user's call): the success tones once co-signed. */}
							<div
								ref={activeRef}
								role='status'
								className='mt-3 flex scroll-mt-13 gap-3 rounded-xl border border-success-muted bg-success-subtle p-3 text-sm text-foreground'
							>
								<CircleCheckIcon aria-hidden='true' className='mt-0.5 size-4 shrink-0 text-success' />
								<div className='flex min-w-0 flex-col gap-0.5'>
									<p className='font-semibold'>
										Co-signed by {cosigner.name}
										{cosignedAt ? (
											<span className='font-normal text-muted-foreground'> · {formatTime(cosignedAt)}</span>
										) : null}
									</p>
									<p>Orders active. The bedside team carries them out.</p>
									{sentNote ? (
										<p>
											<span className='text-muted-foreground'>Note: </span>
											{sentNote}
										</p>
									) : null}
								</div>
							</div>
						</Expand>
					) : null}
				</AnimatePresence>
			</div>
		</section>
	);
}

export {
	CarePathwayPanel,
	COSIGN_DELAY_MS,
	Expand,
	type CarePathway,
	type CarePathwayCosigner,
	type CarePathwayDecision,
	type CarePathwayOrder,
	type CarePathwayStatus,
};
