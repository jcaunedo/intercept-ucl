import * as React from "react";
import { ActivityIcon, ChartSplineIcon, Grid3x3Icon, LayoutGridIcon, Rows3Icon } from "lucide-react";
import { motion } from "motion/react";

import { tabsIndicatorVariants, tabsListVariants, tabsTriggerVariants } from "@/components/navigation/tabs";
import { MonitorViewExpandedIcon } from "@/components/icons/monitor-view-expanded-icon";
import { MonitorViewMinimalIcon } from "@/components/icons/monitor-view-minimal-icon";
import { MonitorViewMinimizedIcon } from "@/components/icons/monitor-view-minimized-icon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/overlays/tooltip";
import { layoutSpring, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

// The Monitoring page's view controls (PRD Monitoring MON-015): how the panel looks, never who's on it.

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

type PanelDensity = "comfortable" | "compact" | "list";

type MonitorPlot = "waveform" | "trends";

type ToggleOption<Value extends string> = {
	id: Value;
	label: string;
	icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const densities: ToggleOption<PanelDensity>[] = [
	{ id: "comfortable", label: "Comfortable", icon: LayoutGridIcon },
	{ id: "compact", label: "Compact", icon: Grid3x3Icon },
	{ id: "list", label: "List", icon: Rows3Icon },
];

const monitorPlots: ToggleOption<MonitorPlot>[] = [
	{ id: "waveform", label: "ECG strip", icon: ActivityIcon },
	{ id: "trends", label: "1 h trends", icon: ChartSplineIcon },
];

/* -------------------------------------------------------------------------- */
/* SegmentedToggle                                                            */
/* -------------------------------------------------------------------------- */

/**
 * One view option's button. Its icon, then its label: always, never (`iconOnly`, the name in a tooltip), or only when the
 * page is wide (`"narrow"`: from 1600px of page width, the page's container query; narrower, the icon alone and the
 * name in a tooltip, which only opens while the label is hidden).
 */
function SegmentedButton({
	label,
	icon: Icon,
	pressed,
	disabled,
	iconOnly,
	indicatorId,
	onPress,
}: {
	label: string;
	icon: ToggleOption<string>["icon"];
	pressed: boolean;
	disabled: boolean;
	iconOnly: boolean | "narrow";
	indicatorId: string;
	onPress: () => void;
}) {
	const { resolve } = useMotionPreference();
	const labelRef = React.useRef<HTMLSpanElement>(null);
	const [tooltipOpen, setTooltipOpen] = React.useState(false);
	const button = (
		<button
			type='button'
			aria-label={iconOnly ? label : undefined}
			aria-pressed={pressed}
			data-state={pressed ? "active" : "inactive"}
			disabled={disabled}
			onClick={onPress}
			className={tabsTriggerVariants({ variant: "default", size: "md" })}
		>
			{pressed ? (
				<motion.span
					aria-hidden='true'
					layoutId={`${indicatorId}-indicator`}
					transition={resolve(layoutSpring)}
					className={tabsIndicatorVariants({ variant: "default" })}
				/>
			) : null}
			<span className='relative inline-flex items-center gap-1.5'>
				<Icon aria-hidden='true' />
				{iconOnly === true ? null : iconOnly === "narrow" ? (
					// The button's name is its aria-label, so the label is only for the eye.
					<span ref={labelRef} aria-hidden='true' className='hidden @min-[1600px]:inline'>
						{label}
					</span>
				) : (
					label
				)}
			</span>
		</button>
	);
	if (!iconOnly) return button;
	// A label on screen already names the button: no tooltip then.
	const labelShown = () => iconOnly === "narrow" && (labelRef.current?.getClientRects().length ?? 0) > 0;
	return (
		<Tooltip open={tooltipOpen} onOpenChange={(open) => setTooltipOpen(open && !labelShown())}>
			<TooltipTrigger asChild>{button}</TooltipTrigger>
			<TooltipContent side='bottom'>{label}</TooltipContent>
		</Tooltip>
	);
}

/**
 * One choice among a few view options: toggle buttons on the Tabs track, with Tabs' sliding raised marker. It changes
 * the view, not a panel of content, so it isn't a tablist. `iconOnly` names each button by its `aria-label` and shows
 * the name in a tooltip on hover and keyboard focus; `"narrow"` does so only below 1600px of page width, where the bar
 * would otherwise wrap (Nov 3, 2026, user's call), and shows the labels from there.
 */
function SegmentedToggle<Value extends string>({
	label,
	options,
	value,
	onValueChange,
	iconOnly = false,
	disabled = false,
}: {
	label: string;
	options: ToggleOption<Value>[];
	/** `null` presses none (a mixed state). */
	value: Value | null;
	onValueChange: (value: Value) => void;
	iconOnly?: boolean | "narrow";
	disabled?: boolean;
}) {
	const indicatorId = React.useId();

	return (
		<TooltipProvider>
			{/* Tabs' 36px list height comes from a Tabs root (group-data), which this isn't inside, so it's set here. */}
			<div role='group' aria-label={label} className={cn(tabsListVariants({ variant: "default", size: "md" }), "h-9")}>
				{options.map(({ id, label: optionLabel, icon }) => (
					<SegmentedButton
						key={id}
						label={optionLabel}
						icon={icon}
						pressed={value === id}
						disabled={disabled}
						iconOnly={iconOnly}
						indicatorId={indicatorId}
						onPress={() => onValueChange(id)}
					/>
				))}
			</div>
		</TooltipProvider>
	);
}

/** Comfortable, Compact or List (PRD MON-012), icon only. */
function DensityToggle({ value, onValueChange }: { value: PanelDensity; onValueChange: (value: PanelDensity) => void }) {
	return <SegmentedToggle label='Density' options={densities} value={value} onValueChange={onValueChange} iconOnly />;
}

/**
 * What the cards' monitors plot, condensed or full: live waveforms or 1-hour trends (PRD MON-OD-12), with icon and label
 * from 1600px of page width, the icon alone below it (Nov 3, 2026, user's call: the filter bar fit on one row). A card
 * option, so it's disabled in List density.
 */
function MonitorPlotToggle({
	value,
	onValueChange,
	density,
}: {
	value: MonitorPlot;
	onValueChange: (value: MonitorPlot) => void;
	density: PanelDensity;
}) {
	return (
		<SegmentedToggle
			label='Card monitor'
			options={monitorPlots}
			value={value}
			onValueChange={onValueChange}
			disabled={density === "list"}
			iconOnly='narrow'
		/>
	);
}

/** Every card's monitor full or condensed. */
/**
 * How much each card shows: `full` (the four-lane monitor, the score and tags), `condensed` (the ECG strip and numerics,
 * the score and tags) or `minimal` (the condensed monitor alone: no score, no tags; Oct 31, 2026, user's call).
 */
type MonitorView = "full" | "condensed" | "minimal";

// Full first: it's the default view.
const monitorViews: ToggleOption<MonitorView>[] = [
	{ id: "full", label: "Full view", icon: MonitorViewExpandedIcon },
	{ id: "condensed", label: "Condensed view", icon: MonitorViewMinimizedIcon },
	{ id: "minimal", label: "Minimal view", icon: MonitorViewMinimalIcon },
];

/**
 * Full, condensed or minimal view on every card, icon only (archielabs.ds's custom monitor-view icons); the cards have
 * no toggle of their own. A card option, so it's disabled in List density.
 */
function MonitorViewToggle({
	value,
	onValueChange,
	density,
}: {
	value: MonitorView | null;
	onValueChange: (value: MonitorView) => void;
	density: PanelDensity;
}) {
	return (
		<SegmentedToggle
			label='Monitor view'
			options={monitorViews}
			value={value}
			onValueChange={onValueChange}
			disabled={density === "list"}
			iconOnly
		/>
	);
}

export {
	DensityToggle,
	MonitorPlotToggle,
	MonitorViewToggle,
	type MonitorPlot,
	type MonitorView,
	type PanelDensity,
};
