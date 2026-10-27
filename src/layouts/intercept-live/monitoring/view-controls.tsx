import * as React from "react";
import { ActivityIcon, ChartSplineIcon, Grid3x3Icon, LayoutGridIcon, Rows3Icon } from "lucide-react";
import { motion } from "motion/react";

import { tabsIndicatorVariants, tabsListVariants, tabsTriggerVariants } from "@/components/navigation/tabs";
import { MonitorViewExpandedIcon } from "@/components/icons/monitor-view-expanded-icon";
import { MonitorViewMinimizedIcon } from "@/components/icons/monitor-view-minimized-icon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/overlays/tooltip";
import { layoutSpring, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

// The Monitoring page's view controls (PRD Monitoring SV-015): how the panel looks, never who's on it.

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
	const { resolve } = useMotionPreference();
	const indicatorId = React.useId();

	return (
		<TooltipProvider>
			{/* Tabs' 36px list height comes from a Tabs root (group-data), which this isn't inside, so it's set here. */}
			<div role='group' aria-label={label} className={cn(tabsListVariants({ variant: "default", size: "md" }), "h-9")}>
				{options.map(({ id, label: optionLabel, icon: Icon }) => {
					const pressed = value === id;
					const button = (
						<button
							type='button'
							aria-label={iconOnly ? optionLabel : undefined}
							aria-pressed={pressed}
							data-state={pressed ? "active" : "inactive"}
							disabled={disabled}
							onClick={() => onValueChange(id)}
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
								{iconOnly ? null : optionLabel}
							</span>
						</button>
					);
					return iconOnly ? (
						<Tooltip key={id}>
							<TooltipTrigger asChild>{button}</TooltipTrigger>
							<TooltipContent side='bottom'>{optionLabel}</TooltipContent>
						</Tooltip>
					) : (
						<React.Fragment key={id}>{button}</React.Fragment>
					);
				})}
			</div>
		</TooltipProvider>
	);
}

/** Comfortable, Compact or List (PRD SV-012), icon only. */
function DensityToggle({ value, onValueChange }: { value: PanelDensity; onValueChange: (value: PanelDensity) => void }) {
	return <SegmentedToggle label='Density' options={densities} value={value} onValueChange={onValueChange} iconOnly />;
}

/**
 * What the cards' monitors plot, condensed or full: live waveforms or 1-hour trends (PRD SV-OD-12), with icon and label.
 * A card option, so it's disabled in List density.
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
		/>
	);
}

/** Every card's monitor condensed or full. Neither is pressed while some cards are expanded and others aren't. */
type MonitorView = "condensed" | "full";

const monitorViews: ToggleOption<MonitorView>[] = [
	{ id: "condensed", label: "Condensed monitors", icon: MonitorViewMinimizedIcon },
	{ id: "full", label: "Full monitors", icon: MonitorViewExpandedIcon },
];

/**
 * Condensed or full monitors on every card, icon only (archielabs.ds's custom monitor-view icons). Each card's own
 * button still toggles it alone. A card option, so it's disabled in List density.
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

export { DensityToggle, MonitorPlotToggle, MonitorViewToggle, type MonitorPlot, type MonitorView, type PanelDensity };
