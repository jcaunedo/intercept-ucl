import * as React from "react";
import {
	CheckIcon,
	CircleSlashIcon,
	InfoIcon,
	PencilIcon,
	ShieldCheckIcon,
	SparklesIcon,
	UserRoundCheckIcon,
	XIcon,
	type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/buttons/button";
import { Badge, type BadgeProps } from "@/components/data-display/badge";
import { Label } from "@/components/forms/label";
import { Textarea } from "@/components/forms/textarea";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { formatRelativeDate } from "@/lib/relative-date";

import { formatDateTime, formatTime, freshness, NoData, SectionCard } from "../section-parts";

// The Orders section (PRD Patient details PD-060–PD-062): order recommendations first, then the active orders from the
// hospital's EMR, read-only. A recommendation is never an order (dashed edge, agent chip, "Recommendation"), never
// places itself, and records its outcome as taken, declined with rationale, or elapsed. Accepting sends it to the EMR
// through write-back for signature (Integrated, PD-134). Insulin dosing is never proposed here (Spec §8.5).

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

/** The v1 recommendation classes (PRD PD-061). */
type OrderRecommendationKind = "sepsis-bundle" | "electrolyte" | "vent-order" | "glucose";

type OrderRecommendationOutcome =
	| {
			kind: "taken";
			at: string;
			by: string;
			/** The order as accepted, when the clinician changed it (Modify). */
			modified?: string;
			/** Where write-back is: sent for signature, or signed in the EMR. */
			writeBack?: { status: "sent" | "signed"; by?: string; at: string };
	  }
	| { kind: "declined"; at: string; by: string; rationale?: string }
	/** No one acted within its window. */
	| { kind: "elapsed"; at: string };

type OrderRecommendation = {
	id: string;
	/** "Order-Entry Suggestion", "Vent-Order Mismatch". */
	agent: string;
	kind: OrderRecommendationKind;
	/** The proposed order, short. */
	title: string;
	/** The order in full, as it would be written. */
	order: string;
	/** When the order should happen by, e.g. the bundle's 6-hour mark. */
	dueAt?: string;
	/** Why, in a sentence. */
	reason: string;
	/** The values that triggered it, each with its source and time. */
	evidence: { label: string; source: string; at: string }[];
	protocol: { kind: "hospital" | "intercept" | "sep-1" | "glycemic"; name: string };
	suggestedAt: string;
	/** For an APP, the supervising intensivist co-signs it (PRD PD-062). */
	needsCosign?: boolean;
	outcome?: OrderRecommendationOutcome;
};

/** An agent that checked and has nothing to recommend, and why (silence has a reason). */
type OrderAgentCheck = { agent: string; result: string; detail: string; at: string };

type ActiveOrder = {
	id: string;
	type: "medication" | "lab" | "imaging" | "respiratory" | "nursing" | "diet";
	name: string;
	details: string;
	orderedBy: string;
	orderedAt: string;
	/** As the EMR names it: "Active", "Collected", "Scheduled", "Pending". */
	status: string;
};

type PatientOrders = {
	hospital: string;
	/** The EMR the orders come from, e.g. "Epic". */
	source: string;
	updatedAt: string;
	/** The hospital permits write-back, so an accepted recommendation goes to the EMR for signature. */
	writeBack: boolean;
	/** The supervising intensivist, who co-signs an APP's accepted recommendations. */
	supervisor?: string;
	recommendations: OrderRecommendation[];
	checks?: OrderAgentCheck[];
	active: ActiveOrder[];
};

/** What the clinician did to a recommendation. The app records it, with who and when. */
type OrderRecommendationAction = { type: "accept" } | { type: "modify"; order: string } | { type: "decline"; rationale: string };

type OrdersSectionProps = {
	orders: PatientOrders;
	/** Who's signed in. An APP sees co-signature before accepting; an RN sees recommendations read-only (PD-062). */
	role?: "intensivist" | "app" | "rn";
	onRecommendationAction?: (recommendationId: string, action: OrderRecommendationAction) => void;
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

const kindLabels: Record<OrderRecommendationKind, string> = {
	"sepsis-bundle": "Sepsis bundle",
	electrolyte: "Electrolyte replacement",
	"vent-order": "Vent-order alignment",
	glucose: "Glycemic management",
};

const protocolLabels: Record<OrderRecommendation["protocol"]["kind"], string> = {
	hospital: "Hospital protocol",
	intercept: "Intercept protocol",
	"sep-1": "CMS measure",
	glycemic: "Glycemic system criteria",
};

const orderTypes: { type: ActiveOrder["type"]; label: string }[] = [
	{ type: "medication", label: "Medications" },
	{ type: "lab", label: "Labs" },
	{ type: "imaging", label: "Imaging" },
	{ type: "respiratory", label: "Respiratory" },
	{ type: "nursing", label: "Nursing" },
	{ type: "diet", label: "Diet" },
];

const statusVariants: Record<string, BadgeProps["variant"]> = {
	Active: "green",
	Collected: "blue",
	Scheduled: "secondary",
	Pending: "yellow",
};

/** Today's times read "2:14 PM"; older ones carry their date. */
const formatWhen = (iso: string, now: number | null) =>
	now !== null && now - Date.parse(iso) < 12 * 3_600_000 ? formatTime(iso) : formatDateTime(iso);

/* -------------------------------------------------------------------------- */
/* Recommendation                                                             */
/* -------------------------------------------------------------------------- */

/** An inline form under the actions, like the triage queue's. */
function InlineForm({
	submitLabel,
	submitDisabled,
	onSubmit,
	onCancel,
	children,
}: {
	submitLabel: string;
	submitDisabled?: boolean;
	onSubmit: () => void;
	onCancel: () => void;
	children: React.ReactNode;
}) {
	return (
		<form
			className='flex flex-col gap-3 border-t border-border-muted pt-3'
			onSubmit={(event) => {
				event.preventDefault();
				if (!submitDisabled) onSubmit();
			}}
		>
			{children}
			<div className='flex justify-end gap-2'>
				<Button type='button' variant='ghost' size='sm' onClick={onCancel}>
					Cancel
				</Button>
				<Button type='submit' size='sm' disabled={submitDisabled}>
					{submitLabel}
				</Button>
			</div>
		</form>
	);
}

/** The outcome in words: who did what and when, and where write-back is. */
function outcomeLine(
	outcome: OrderRecommendationOutcome,
	source: string,
	cosigner?: string,
): { icon: LucideIcon; text: string; detail?: string } {
	switch (outcome.kind) {
		case "taken": {
			const writeBack = outcome.writeBack
				? outcome.writeBack.status === "signed"
					? `Signed in ${source}${outcome.writeBack.by ? ` by ${outcome.writeBack.by}` : ""} · ${formatTime(outcome.writeBack.at)}`
					: `Sent to ${source} for ${cosigner ? `co-signature by ${cosigner}` : "signature"} · ${formatTime(outcome.writeBack.at)}`
				: undefined;
			return {
				icon: CheckIcon,
				text: `${outcome.modified ? "Accepted with changes" : "Accepted"} by ${outcome.by} · ${formatTime(outcome.at)}`,
				detail: [outcome.modified, writeBack].filter(Boolean).join(" · ") || undefined,
			};
		}
		case "declined":
			return {
				icon: XIcon,
				text: `Declined by ${outcome.by} · ${formatTime(outcome.at)}`,
				detail: outcome.rationale ? `“${outcome.rationale}”` : undefined,
			};
		default:
			return { icon: CircleSlashIcon, text: `Elapsed · no action by ${formatTime(outcome.at)}` };
	}
}

function EvidenceList({ evidence, now }: { evidence: OrderRecommendation["evidence"]; now: number | null }) {
	return (
		<div className='flex flex-wrap items-center gap-1.5'>
			<span className='text-xs text-muted-foreground'>Evidence</span>
			<ul className='contents'>
				{evidence.map((item) => (
					<li
						key={item.label}
						className='inline-flex items-baseline gap-1.5 rounded-md border border-border bg-background-subtle px-2 py-0.5'
					>
						<span className='font-mono text-xs text-foreground'>{item.label}</span>
						<span className='text-xs text-muted-foreground'>{freshness(item.source, item.at, now)}</span>
					</li>
				))}
			</ul>
		</div>
	);
}

/** An open recommendation: what, why, the evidence and protocol, and Accept, Modify, Decline. */
function RecommendationCard({
	recommendation,
	now,
	role,
	supervisor,
	writeBack,
	source,
	onAction,
}: {
	recommendation: OrderRecommendation;
	now: number | null;
	role: NonNullable<OrdersSectionProps["role"]>;
	supervisor?: string;
	writeBack: boolean;
	source: string;
	onAction: (action: OrderRecommendationAction) => void;
}) {
	const id = React.useId();
	const [form, setForm] = React.useState<"modify" | "decline" | null>(null);
	const [order, setOrder] = React.useState(recommendation.order);
	const [rationale, setRationale] = React.useState("");
	const cosign = role === "app" && recommendation.needsCosign && supervisor;

	return (
		// A recommendation, never an order (PRD PD-061): the dashed edge sets it apart, as AI rows in the triage queue.
		<li className='flex flex-col gap-3 rounded-lg border border-dashed border-badge-purple-foreground/50 bg-card p-4'>
			<div className='flex flex-wrap items-center gap-2'>
				<Badge variant='purple' size='xs'>
					<SparklesIcon aria-hidden='true' />
					AI · {recommendation.agent}
				</Badge>
				<span className='text-xs font-semibold text-badge-purple-foreground'>Recommendation</span>
				{now !== null ? (
					<span className='ml-auto text-xs text-muted-foreground'>{freshness("Suggested", recommendation.suggestedAt, now)}</span>
				) : null}
			</div>

			<div className='flex flex-col gap-1'>
				<h3 className='text-base font-semibold text-foreground'>{recommendation.title}</h3>
				<p className='font-mono text-xs text-foreground'>
					{recommendation.order}
					{recommendation.dueAt ? ` · by ${formatTime(recommendation.dueAt)}` : null}
				</p>
			</div>
			<p className='text-sm text-foreground'>{recommendation.reason}</p>
			<EvidenceList evidence={recommendation.evidence} now={now} />
			<p className='text-xs text-muted-foreground'>
				{kindLabels[recommendation.kind]} · {protocolLabels[recommendation.protocol.kind]}:{" "}
				<span className='font-medium text-foreground'>{recommendation.protocol.name}</span>
			</p>

			{cosign ? (
				<p className='flex items-start gap-1.5 rounded-md bg-background-subtle px-3 py-2 text-xs text-foreground'>
					<UserRoundCheckIcon aria-hidden='true' className='mt-px size-3.5 shrink-0' />
					Needs co-signature by {supervisor}, your supervising intensivist. Accepting routes it to them.
				</p>
			) : null}

			{role === "rn" ? null : form === "modify" ? (
				<InlineForm
					submitLabel='Accept with changes'
					submitDisabled={!order.trim() || order.trim() === recommendation.order}
					onCancel={() => setForm(null)}
					onSubmit={() => onAction({ type: "modify", order: order.trim() })}
				>
					<div className='flex flex-col gap-1.5'>
						<Label htmlFor={`${id}-order`}>Order</Label>
						<Textarea id={`${id}-order`} rows={2} value={order} onChange={(event) => setOrder(event.target.value)} />
					</div>
				</InlineForm>
			) : form === "decline" ? (
				<InlineForm
					submitLabel='Decline recommendation'
					submitDisabled={!rationale.trim()}
					onCancel={() => setForm(null)}
					onSubmit={() => onAction({ type: "decline", rationale: rationale.trim() })}
				>
					<div className='flex flex-col gap-1.5'>
						<Label htmlFor={`${id}-rationale`}>Why decline?</Label>
						<Textarea id={`${id}-rationale`} rows={2} value={rationale} onChange={(event) => setRationale(event.target.value)} />
					</div>
				</InlineForm>
			) : (
				<div className='flex flex-wrap items-center gap-2'>
					<Button size='sm' onClick={() => onAction({ type: "accept" })}>
						<CheckIcon aria-hidden='true' />
						{cosign ? "Accept and route" : "Accept"}
					</Button>
					<Button variant='outline' size='sm' onClick={() => setForm("modify")}>
						<PencilIcon aria-hidden='true' />
						Modify
					</Button>
					<Button variant='ghost' size='sm' onClick={() => setForm("decline")}>
						<XIcon aria-hidden='true' />
						Decline
					</Button>
					{writeBack && !cosign ? (
						<span className='text-xs text-muted-foreground'>Goes to {source} for signature</span>
					) : null}
				</div>
			)}
		</li>
	);
}

/** An addressed recommendation, compact: what it was, and its outcome. */
function AddressedRow({
	recommendation,
	source,
	cosigner,
}: {
	recommendation: OrderRecommendation & { outcome: OrderRecommendationOutcome };
	source: string;
	cosigner?: string;
}) {
	const line = outcomeLine(recommendation.outcome, source, cosigner);
	return (
		<li data-outcome={recommendation.outcome.kind} className='flex items-start gap-3 py-2.5'>
			<line.icon aria-hidden='true' className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
			<div className='flex min-w-0 flex-1 flex-col gap-0.5'>
				<p className='text-sm text-foreground'>
					<span className='font-medium'>{recommendation.title}</span>
					<span className='text-muted-foreground'> · {kindLabels[recommendation.kind]}</span>
				</p>
				<p className='text-xs text-muted-foreground'>{line.text}</p>
				{line.detail ? <p className='text-xs text-muted-foreground'>{line.detail}</p> : null}
			</div>
		</li>
	);
}

/* -------------------------------------------------------------------------- */
/* OrdersSection                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The patient's orders (PRD PD-060–PD-062): open recommendations with their evidence and actions, the agents that
 * checked and found nothing, the ones addressed this shift, then the EMR's active orders by type. Outcomes are kept
 * here for the prototype and reported through `onRecommendationAction`.
 */
function OrdersSection({ orders, role = "intensivist", onRecommendationAction }: OrdersSectionProps) {
	const now = useCurrentMinute();
	const [outcomes, setOutcomes] = React.useState<Record<string, OrderRecommendationOutcome>>({});
	const cosigner = role === "app" ? orders.supervisor : undefined;
	const recommendations = orders.recommendations.map((item) =>
		outcomes[item.id] ? { ...item, outcome: outcomes[item.id] } : item,
	);
	const open = recommendations.filter((item) => !item.outcome);
	const addressed = recommendations
		.filter((item): item is OrderRecommendation & { outcome: OrderRecommendationOutcome } => Boolean(item.outcome))
		.sort((a, b) => b.outcome.at.localeCompare(a.outcome.at));
	const groups = orderTypes
		.map((group) => ({ ...group, orders: orders.active.filter((order) => order.type === group.type) }))
		.filter((group) => group.orders.length);

	const act = (recommendation: OrderRecommendation, action: OrderRecommendationAction) => {
		const at = new Date().toISOString();
		setOutcomes((current) => ({
			...current,
			[recommendation.id]:
				action.type === "decline"
					? { kind: "declined", at, by: "you", rationale: action.rationale }
					: {
							kind: "taken",
							at,
							by: "you",
							modified: action.type === "modify" ? action.order : undefined,
							writeBack: orders.writeBack ? { status: "sent", at } : undefined,
						},
		}));
		onRecommendationAction?.(recommendation.id, action);
	};

	return (
		<div className='@container'>
			<div className='flex flex-col gap-6'>
				<SectionCard title='Recommendations' meta={open.length ? `${open.length} open` : undefined}>
					{role === "rn" ? (
						<p className='flex items-start gap-1.5 text-sm text-muted-foreground'>
							<InfoIcon aria-hidden='true' className='mt-0.5 size-4 shrink-0' />
							View only. An intensivist or APP accepts or declines recommendations.
						</p>
					) : null}

					{open.length ? (
						<ul className='grid gap-3 @min-[60rem]:grid-cols-2'>
							{open.map((recommendation) => (
								<RecommendationCard
									key={recommendation.id}
									recommendation={recommendation}
									now={now}
									role={role}
									supervisor={orders.supervisor}
									writeBack={orders.writeBack}
									source={orders.source}
									onAction={(action) => act(recommendation, action)}
								/>
							))}
						</ul>
					) : (
						<NoData>No open recommendations for this patient.</NoData>
					)}

					{orders.checks?.length ? (
						<ul className='flex flex-col gap-2'>
							{orders.checks.map((check) => (
								<li key={check.agent} className='flex items-start gap-2 rounded-md bg-background-subtle px-3 py-2'>
									<ShieldCheckIcon aria-hidden='true' className='mt-0.5 size-4 shrink-0 text-success' />
									<p className='text-sm text-foreground'>
										<span className='font-medium'>{check.agent}</span> · {check.result}
										<span className='block text-xs text-muted-foreground'>
											{check.detail}
											{now !== null ? ` Checked ${formatRelativeDate(check.at, now).label.toLowerCase()}.` : null}
										</span>
									</p>
								</li>
							))}
						</ul>
					) : null}

					{addressed.length ? (
						<div className='flex flex-col'>
							<h3 className='border-b border-border-muted pb-1.5 text-sm font-semibold text-foreground'>Addressed</h3>
							<ul className='flex flex-col divide-y divide-border-muted'>
								{addressed.map((recommendation) => (
									<AddressedRow key={recommendation.id} recommendation={recommendation} source={orders.source} cosigner={cosigner} />
								))}
							</ul>
						</div>
					) : null}
				</SectionCard>

				<SectionCard title='Active orders' meta={freshness(orders.source, orders.updatedAt, now)}>
					<p className='flex items-start gap-1.5 text-sm text-muted-foreground'>
						<InfoIcon aria-hidden='true' className='mt-0.5 size-4 shrink-0' />
						Orders from {orders.hospital} are read-only here.
					</p>
					{groups.length ? (
						<div className='-mx-4 -mb-4 overflow-x-auto'>
							<table className='w-full border-collapse text-left text-sm'>
								<caption className='sr-only'>Active orders from {orders.source}, by type</caption>
								<thead className='text-xs text-muted-foreground'>
									<tr className='border-b border-border'>
										<th scope='col' className='px-4 py-2 font-medium'>
											Order
										</th>
										<th scope='col' className='hidden px-4 py-2 font-medium @min-[44rem]:table-cell'>
											Ordered by
										</th>
										<th scope='col' className='px-4 py-2 font-medium whitespace-nowrap'>
											Ordered
										</th>
										<th scope='col' className='px-4 py-2 text-right font-medium'>
											Status
										</th>
									</tr>
								</thead>
								{groups.map((group) => (
									<tbody key={group.type}>
										<tr className='bg-background-subtle'>
											<th scope='rowgroup' colSpan={4} className='px-4 py-1.5 text-xs font-semibold text-foreground'>
												{group.label} <span className='font-normal text-muted-foreground'>· {group.orders.length}</span>
											</th>
										</tr>
										{group.orders.map((order) => (
											<tr key={order.id} className='border-b border-border-muted last:border-b-0'>
												<td className='px-4 py-2.5 align-top'>
													<span className='block font-medium text-foreground'>{order.name}</span>
													<span className='block text-xs text-muted-foreground'>{order.details}</span>
													<span className='block text-xs text-muted-foreground @min-[44rem]:hidden'>{order.orderedBy}</span>
												</td>
												<td className='hidden px-4 py-2.5 align-top text-foreground @min-[44rem]:table-cell'>{order.orderedBy}</td>
												<td className='px-4 py-2.5 align-top whitespace-nowrap text-muted-foreground tabular-nums'>
													{formatWhen(order.orderedAt, now)}
												</td>
												<td className='px-4 py-2.5 text-right align-top'>
													<Badge variant={statusVariants[order.status] ?? "secondary"} size='xs'>
														{order.status}
													</Badge>
												</td>
											</tr>
										))}
									</tbody>
								))}
							</table>
						</div>
					) : (
						<NoData>No active orders from {orders.hospital}.</NoData>
					)}
				</SectionCard>
			</div>
		</div>
	);
}

export {
	OrdersSection,
	type ActiveOrder,
	type OrderAgentCheck,
	type OrderRecommendation,
	type OrderRecommendationAction,
	type OrderRecommendationKind,
	type OrderRecommendationOutcome,
	type OrdersSectionProps,
	type PatientOrders,
};
