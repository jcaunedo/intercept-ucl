import * as React from "react";
import { CircleCheckIcon, ClockIcon, TriangleAlertIcon, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Badge, type BadgeProps } from "@/components/data-display/badge";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { confirmPattern, fadeVariants, iconSwapReducedVariants, iconSwapVariants, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { SourceLabel } from "../shared/source-label";

// Exploration (DESIGN.md "Alert panel" › "Bedside task list"): Scenario 3, step 5. The intensivist's accepted orders
// become the bedside nurses' tasks, e.g. the peripheral norepinephrine's IV site check every hour. One list, shared: the
// nurses check tasks off at the bedside and the hub sees the same status (Requirements CC-06; design update spec DU-25).
// The hub doesn't check bedside tasks off. A task left open 10 min past its due time is overdue (DU-25).

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

/**
 * One task for the bedside, from an order or a protocol. Status from the data contract (design update spec §4): open,
 * done, cancelled; overdue isn't stored, it's an open task 10 min past `dueAt`.
 */
type BedsideTask = {
	id: string;
	/** What to do, e.g. "IV site check, norepinephrine". */
	title: string;
	/** How, e.g. "18 g, right antecubital: redness, swelling, blanching, pain". */
	detail?: string;
	/** How often, e.g. "Every hour". */
	every?: string;
	/** The order or protocol it comes from, e.g. "Norepinephrine, peripheral". */
	from: string;
	/** Who it's for, e.g. "Ashley Brooks, RN". */
	assignee: string;
	status: "open" | "done" | "cancelled";
	/** When it's next due (ISO 8601). */
	dueAt?: string;
	/** Who did it last, when, and what they found, e.g. "Site clean, no swelling". */
	done?: { by: string; at: string; result?: string };
};

type BedsideTasks = {
	/** Who sees the same list, e.g. "Sidney ED nurses". */
	sharedWith: string;
	/** Where the tasks come from, e.g. "The accepted orders and the hospital's peripheral vasopressor protocol". */
	source: string;
	tasks: BedsideTask[];
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

// A task becomes overdue 10 min past its due time (DU-25).
const OVERDUE_AFTER_MS = 10 * 60_000;

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const isOverdue = (task: BedsideTask, now: number | null) =>
	task.status === "open" && Boolean(task.dueAt) && now !== null && now > Date.parse(task.dueAt!) + OVERDUE_AFTER_MS;

type TaskLook = { icon: LucideIcon; label: string; className: string };

function taskLook(task: BedsideTask, now: number | null): TaskLook {
	if (isOverdue(task, now)) return { icon: TriangleAlertIcon, label: "Overdue", className: "text-severity-critical" };
	if (task.status === "done") return { icon: CircleCheckIcon, label: "Done", className: "text-success" };
	return { icon: ClockIcon, label: task.status === "cancelled" ? "Cancelled" : "Due", className: "text-icon" };
}

function listBadge(tasks: BedsideTask[], now: number | null): { label: string; variant: BadgeProps["variant"] } {
	const overdue = tasks.filter((task) => isOverdue(task, now)).length;
	if (overdue) return { label: `${overdue} overdue`, variant: "red" };
	const open = tasks.filter((task) => task.status === "open").length;
	return open ? { label: `${open} open`, variant: "secondary" } : { label: "All done", variant: "green" };
}

/* -------------------------------------------------------------------------- */
/* Bedside task list                                                          */
/* -------------------------------------------------------------------------- */

function TaskRow({ task, now }: { task: BedsideTask; now: number | null }) {
	const { prefersReducedMotion } = useMotionPreference();
	const look = taskLook(task, now);
	const overdue = isOverdue(task, now);
	return (
		<li data-status={overdue ? "overdue" : task.status} className='flex items-start gap-3 py-3 first:pt-0 last:pb-0'>
			<AnimatePresence mode='wait' initial={false}>
				<motion.span
					key={look.label}
					variants={prefersReducedMotion ? iconSwapReducedVariants : iconSwapVariants}
					initial='hidden'
					animate='shown'
					exit='hidden'
					className='flex h-[1lh] shrink-0 items-center text-sm'
				>
					<motion.span className='flex' {...(task.status === "done" && !prefersReducedMotion ? confirmPattern : {})}>
						<look.icon aria-hidden='true' className={cn("size-4", look.className)} />
					</motion.span>
				</motion.span>
			</AnimatePresence>
			<div className='flex min-w-0 flex-1 flex-col gap-0.5'>
				<span className='text-sm font-semibold text-foreground'>
					<span className='sr-only'>{look.label}: </span>
					{task.title}
				</span>
				{task.detail ? <span className='text-sm text-foreground'>{task.detail}</span> : null}
				<span className='text-xs text-muted-foreground'>
					{[task.every, task.assignee, `From: ${task.from}`].filter(Boolean).join(" · ")}
				</span>
				{task.done ? (
					<motion.span
						key={task.done.at}
						variants={fadeVariants}
						initial='initial'
						animate='animate'
						className='text-xs text-success'
					>
						Done {formatTime(task.done.at)} by {task.done.by}
						{task.done.result ? `: ${task.done.result}` : ""}
					</motion.span>
				) : null}
			</div>
			{task.dueAt && task.status === "open" ? (
				<span className={cn("shrink-0 text-xs font-medium", overdue ? "text-severity-critical" : "text-muted-foreground")}>
					{overdue ? "Overdue" : "Due"} {formatTime(task.dueAt)}
				</span>
			) : null}
		</li>
	);
}

/**
 * The bedside nurses' tasks from the accepted orders, shared with them: each task's status as they check it off, who it's
 * for and the order it comes from. Read-only here.
 */
function BedsideTaskList({
	tasks,
	headingLevel = "h3",
	className,
}: {
	tasks: BedsideTasks;
	headingLevel?: "h2" | "h3";
	className?: string;
}) {
	const now = useCurrentMinute();
	const badge = listBadge(tasks.tasks, now);
	const Heading = headingLevel;
	return (
		<section aria-label='Bedside tasks' className={cn("flex flex-col gap-4", className)}>
			<div className='flex flex-col gap-1'>
				<div className='flex flex-wrap items-center gap-2'>
					<Heading className='text-base font-bold text-foreground'>Bedside tasks</Heading>
					<AnimatePresence mode='wait' initial={false}>
						<motion.span key={badge.label} variants={fadeVariants} initial='initial' animate='animate' exit='exit'>
							<Badge variant={badge.variant} size='xs'>
								{badge.label}
							</Badge>
						</motion.span>
					</AnimatePresence>
				</div>
				<SourceLabel className='text-xs text-muted-foreground'>Source: {tasks.source}</SourceLabel>
				<p className='text-xs text-muted-foreground'>Shared with {tasks.sharedWith}: they check tasks off at the bedside.</p>
			</div>
			<ul aria-label='Tasks' className='flex flex-col divide-y divide-border rounded-card border border-border bg-background p-4'>
				{tasks.tasks.map((task) => (
					<TaskRow key={task.id} task={task} now={now} />
				))}
			</ul>
		</section>
	);
}

export { BedsideTaskList, type BedsideTask, type BedsideTasks };
