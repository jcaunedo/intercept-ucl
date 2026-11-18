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

/** One view option's button: its icon, then its label, or the icon alone (`iconOnly`, the name in a tooltip). */
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
	iconOnly: boolean;
	indicatorId: string;
	onPress: () => void;
}) {
	const { resolve } = useMotionPreference();
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
				{iconOnly ? null : label}
			</span>
		</button>
	);
	if (!iconOnly) return button;
	return (
		<Tooltip>
			<TooltipTrigger asChild>{button}</TooltipTrigger>
			<TooltipContent side='bottom'>{label}</TooltipContent>
		</Tooltip>
	);
}

/**
 * One choice among a few view options: toggle buttons on the Tabs track, with Tabs' sliding raised marker. It changes
 * the view, not a panel of content, so it isn't a tablist. `iconOnly` names each button by its `aria-label` and shows
 * the name in a tooltip on hover and keyboard focus.
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
	iconOnly?: boolean;
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
 * What the cards' monitors plot, condensed or full: live waveforms or 1-hour trends (PRD MON-OD-12), icon only at every
 * width (Nov 18, 2026, user's call: the labels made the filter bar wrap). A card option, so it's disabled in List density.
 */
function MonitorPlotToggle({
	value,
	onValueChange,
	density,
	monitorView,
}: {
	value: MonitorPlot;
	onValueChange: (value: MonitorPlot) => void;
	density: PanelDensity;
	/** Minimal view's cards have no monitor, so there's nothing to plot. */
	monitorView?: MonitorView;
}) {
	return (
		<SegmentedToggle
			label='Card monitor'
			options={monitorPlots}
			value={value}
			onValueChange={onValueChange}
			disabled={density === "list" || monitorView === "minimal"}
			iconOnly
		/>
	);
}

/** Every card's monitor full or condensed. */
/**
 * How much each card shows: `full` (the four-lane monitor, the score and tags), `condensed` (the ECG strip and numerics,
 * the score and tags) or `minimal` (the Patients page's card, PatientCensusCard: no monitor; Nov 16, 2026, user's call;
 * the condensed monitor alone, without score or tags, from Oct 31, 2026).
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
	SegmentedToggle,
	type ToggleOption,
	type MonitorPlot,
	type MonitorView,
	type PanelDensity,
};
