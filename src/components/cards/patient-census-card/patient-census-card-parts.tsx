"use client";

import * as React from "react";
import { EllipsisIcon, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/overlays/dropdown-menu";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import {
	exitTransition,
	motionDistance,
	motionDuration,
	standardTransition,
	urgencyRingVariants,
	useMotionPreference,
	useUrgencyPhase,
	type UrgencyPhase,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

import type { PatientCardAlertStatus, PatientCardAlertVariant } from "./patient-census-card";

// Pieces shared by the patient cards (PatientCensusCard, PatientMonitoringCard), so a patient with an alert looks and behaves
// the same on every surface.

/**
 * The open control's class: the patient's name, whose ::after covers the card, so a click anywhere opens the patient
 * while buttons raised above it (`relative z-10`) keep their own target.
 */
const patientCardOpenTargetClassName =
	"block outline-none after:absolute after:inset-0 after:rounded-card after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-background";

/**
 * A card's hover, for cards that open the patient: a 2px `foreground` border (the alert ring hides meanwhile) and
 * `shadow-lg`, with the padding down to 14px so content stays put.
 */
const patientCardInteractiveClassName = "hover:border-2 hover:border-foreground hover:p-[14px] hover:shadow-lg";

// Severity alerts ring the card in their color, over a 5% tint of it, and a just-resolved alert in green; messages
// don't.
const alertRingClassNames: Partial<Record<PatientCardAlertVariant, string>> = {
	critical: "border-severity-critical bg-severity-critical/5",
	high: "border-severity-high bg-severity-high/5",
	medium: "border-severity-medium bg-severity-medium/5",
	low: "border-severity-low bg-severity-low/5",
	resolved: "border-success bg-success/5",
};

// One Urgency pulse: fade in, rest, fade back. The same length as a pulse of the shared clock.
const blinkMs = (motionDuration.slow + motionDuration.urgencyRest) * 1000;

/** The phase for a ring that pulses once when it appears, then stays calm. */
function useUrgencyBlink(): UrgencyPhase {
	const [phase, setPhase] = React.useState<UrgencyPhase>("urgent");
	React.useEffect(() => {
		const timer = window.setTimeout(() => setPhase("calm"), blinkMs);
		return () => window.clearTimeout(timer);
	}, []);
	return phase;
}

/**
 * The alert's 2px ring and 5% background tint, drawn over the card's 1px border and white background so nothing
 * shifts, and behind the content (the card is `isolate`, the ring `-z-10`), so text isn't tinted. It pulses (Urgency
 * pattern: fades in on a spring, rests, fades back), in step with every other active ring, while the alert is active,
 * and rests at 2px once it's `addressed`. A resolved alert's green ring blinks once instead, as its "Resolved" pill
 * appears. Hidden while an interactive card is hovered, so the hover border shows. Still under reduced motion, except
 * the resolved ring, which shows at once and fades back.
 */
function AlertRing({
	severity,
	addressed,
	interactive,
}: {
	severity: PatientCardAlertVariant;
	addressed: boolean;
	interactive: boolean;
}) {
	const { prefersReducedMotion } = useMotionPreference();
	const resolved = severity === "resolved";
	// One shared clock: every active alert ring on the page pulses at the same time.
	const pulse = useUrgencyPhase(!resolved && !addressed && !prefersReducedMotion);
	const blink = useUrgencyBlink();

	return (
		<span
			aria-hidden='true'
			className={cn(
				"absolute inset-0 rounded-card transition-opacity duration-160 ease-in-out",
				interactive && "group-hover/card:opacity-0",
			)}
		>
			<motion.span
				initial={resolved && !prefersReducedMotion ? "calm" : false}
				animate={resolved ? blink : pulse}
				variants={urgencyRingVariants}
				className={cn("absolute inset-0 rounded-card border-2", alertRingClassNames[severity])}
			/>
		</span>
	);
}

/**
 * A card's alert ring and its state. Render `ring` first inside the card (which needs `group/card relative isolate`),
 * and call `markSeen` from the card's `onClickCapture`: the ring pulses until the card is clicked or the alert is
 * acknowledged or escalated (a new severity pulses again). When the alert becomes `resolved`, the severity ring fades
 * out as the green one blinks once. With `show` false, there's no ring: the card keeps its default look.
 */
function usePatientCardAlertRing({
	alert,
	interactive,
	show = true,
}: {
	alert?: { variant: PatientCardAlertVariant; status?: PatientCardAlertStatus; since?: string };
	interactive: boolean;
	show?: boolean;
}) {
	const { resolve } = useMotionPreference();
	// The green ring marks the moment an alert resolves: one that resolved a while ago (`since`, e.g. a Resolved bar
	// kept for the day) has none, so cards don't all blink when the page opens.
	const settled = alert?.variant === "resolved" && alert.since !== undefined && Date.now() - Date.parse(alert.since) > blinkMs;
	const severity = show && alert && alertRingClassNames[alert.variant] && !settled ? alert.variant : undefined;
	// The severity the user clicked the card for. A click stops the pulse for that severity; a new one pulses again.
	const [seenSeverity, setSeenSeverity] = React.useState<PatientCardAlertVariant | undefined>(undefined);
	const addressed =
		alert?.status === "acknowledged" ||
		alert?.status === "escalated" ||
		(severity !== undefined && seenSeverity === severity);

	const ring = (
		<AnimatePresence>
			{severity ? (
				<motion.span
					key={severity}
					aria-hidden='true'
					initial={false}
					exit={{ opacity: 0, transition: resolve(standardTransition) }}
					className='pointer-events-none absolute -inset-px -z-10'
				>
					<AlertRing severity={severity} addressed={addressed} interactive={interactive} />
				</motion.span>
			) : null}
		</AnimatePresence>
	);

	return { ring, markSeen: () => setSeenSeverity(severity) };
}

/** An item in a card's "…" menu. `divider` draws a separator under it, setting it apart from the items below. */
type PatientCardAction = { label: string; icon?: LucideIcon; onSelect?: () => void; divider?: boolean };

type CardRevealHandlers = Pick<React.ComponentProps<"article">, "onPointerEnter" | "onPointerLeave" | "onFocus" | "onBlur">;

/**
 * Whether a card's "…" menu shows: while the pointer is on the card, keyboard focus is in it or its menu is open; always
 * where the device can't hover. Spread `handlers` on the card (they call the card's own handlers too) and pass
 * `shown` and `onMenuOpenChange` to PatientCardMoreActions.
 */
function usePatientCardActionsReveal({ onPointerEnter, onPointerLeave, onFocus, onBlur }: CardRevealHandlers) {
	const [hovered, setHovered] = React.useState(false);
	const [focused, setFocused] = React.useState(false);
	const [menuOpen, setMenuOpen] = React.useState(false);
	const canHover = useMediaQuery("(hover: hover)");
	const handlers: CardRevealHandlers = {
		onPointerEnter: (event) => {
			setHovered(true);
			onPointerEnter?.(event);
		},
		onPointerLeave: (event) => {
			setHovered(false);
			onPointerLeave?.(event);
		},
		onFocus: (event) => {
			setFocused(true);
			onFocus?.(event);
		},
		onBlur: (event) => {
			if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
			onBlur?.(event);
		},
	};
	return { shown: hovered || focused || menuOpen || !canHover, onMenuOpenChange: setMenuOpen, handlers };
}

/**
 * A card's "…" menu, raised above its open target. Its slot opens as it shows, so what sits left of it glides aside
 * rather than jumps (as SearchInput opens: `standardTransition` in, `exitTransition` out), and the button fades in from
 * the right. Hidden, it's only clipped, so Tab still reaches it (and shows it). The slot's 8px gap is built in, and it
 * reaches 4px past the button on three sides (offset by negative margins) so its focus ring isn't clipped.
 */
function PatientCardMoreActions({
	actions,
	name,
	shown,
	onMenuOpenChange,
}: {
	actions: PatientCardAction[];
	/** The patient's name, for the button's label: "More actions for Miller, Sarah". */
	name: string;
	shown: boolean;
	onMenuOpenChange: (open: boolean) => void;
}) {
	const { resolve } = useMotionPreference();
	const transition = resolve(shown ? standardTransition : exitTransition);

	return (
		<motion.div
			initial={false}
			animate={shown ? { width: 48, opacity: 1 } : { width: 0, opacity: 0 }}
			transition={transition}
			className='-my-1 -mr-1 flex shrink-0 justify-end overflow-hidden py-1 pr-1'
		>
			<DropdownMenu onOpenChange={onMenuOpenChange}>
				<DropdownMenuTrigger asChild>
					<Button
						asChild
						variant='ghost'
						size='icon-md'
						aria-label={`More actions for ${name}`}
						className='relative z-10 text-foreground'
					>
						<motion.button
							type='button'
							initial={false}
							animate={{ x: shown ? 0 : motionDistance.subtle }}
							transition={transition}
						>
							<EllipsisIcon aria-hidden='true' />
						</motion.button>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='end'>
					{actions.map(({ label, icon: Icon, onSelect, divider }, index) => (
						<React.Fragment key={label}>
							<DropdownMenuItem onSelect={onSelect}>
								{Icon ? <Icon aria-hidden='true' /> : null}
								{label}
							</DropdownMenuItem>
							{divider && index < actions.length - 1 ? <DropdownMenuSeparator /> : null}
						</React.Fragment>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</motion.div>
	);
}

export {
	PatientCardMoreActions,
	patientCardInteractiveClassName,
	patientCardOpenTargetClassName,
	usePatientCardActionsReveal,
	usePatientCardAlertRing,
	type PatientCardAction,
};
