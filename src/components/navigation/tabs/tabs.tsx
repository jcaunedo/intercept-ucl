"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";

import { layoutSpring, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

// The active value and a per-instance id, so each trigger knows whether it holds the sliding indicator and two Tabs
// on one page never share a `layoutId`.
const TabsContext = React.createContext<{ value?: string; indicatorId: string } | null>(null);

type TabsProps = React.ComponentProps<typeof TabsPrimitive.Root>;

/**
 * shadcn's Tabs on Radix. Works controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`).
 *
 * Figma: [intercept.ds › Tabs Groups](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1091-94)
 */
function Tabs({
	className,
	orientation = "horizontal",
	value: valueProp,
	defaultValue,
	onValueChange,
	...props
}: TabsProps) {
	const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
	const value = valueProp ?? uncontrolledValue;
	const indicatorId = React.useId();

	const handleValueChange = (next: string) => {
		setUncontrolledValue(next);
		onValueChange?.(next);
	};

	return (
		<TabsContext.Provider value={{ value, indicatorId }}>
			<TabsPrimitive.Root
				data-slot='tabs'
				data-orientation={orientation}
				orientation={orientation}
				value={value}
				onValueChange={handleValueChange}
				className={cn("group/tabs flex gap-2 data-[orientation=horizontal]:flex-col", className)}
				{...props}
			/>
		</TabsContext.Provider>
	);
}

const tabsListVariants = cva(
	"group/tabs-list inline-flex w-fit items-center justify-center text-muted-foreground group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
	{
		variants: {
			variant: {
				default: "rounded-lg bg-background-subtle p-[3px]",
				// No track: the active tab is marked by its underline.
				line: "gap-1",
			},
			// The control size scale (SIZE-SCALE.md). Triggers take their padding and label size from the list.
			size: {
				// Figma "ms - 36 (default)"
				md: "group-data-[orientation=horizontal]/tabs:h-9",
				// Figma "lg - 40"
				lg: "group-data-[orientation=horizontal]/tabs:h-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "md",
		},
	},
);

type TabsListVariant = NonNullable<VariantProps<typeof tabsListVariants>["variant"]>;
type TabsListSize = NonNullable<VariantProps<typeof tabsListVariants>["size"]>;

// The list's variant and size, read by its triggers.
const TabsListContext = React.createContext<{ variant: TabsListVariant; size: TabsListSize }>({
	variant: "default",
	size: "md",
});

type TabsListProps = React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>;

/**
 * The row of triggers. `default` is a track with a raised active tab; `line` underlines the active tab.
 *
 * Figma: [intercept.ds › Tabs Groups](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1091-94)
 */
function TabsList({ className, variant = "default", size = "md", ...props }: TabsListProps) {
	const resolvedVariant = variant ?? "default";
	const resolvedSize = size ?? "md";

	return (
		<TabsListContext.Provider value={{ variant: resolvedVariant, size: resolvedSize }}>
			<TabsPrimitive.List
				data-slot='tabs-list'
				data-variant={resolvedVariant}
				data-size={resolvedSize}
				className={cn(tabsListVariants({ variant: resolvedVariant, size: resolvedSize }), className)}
				{...props}
			/>
		</TabsListContext.Provider>
	);
}

const tabsTriggerVariants = cva(
	[
		"relative inline-flex h-full flex-1 items-center justify-center font-semibold whitespace-nowrap text-muted-foreground transition-colors outline-none",
		"hover:text-foreground data-[state=active]:text-foreground",
		"focus-visible:not-data-pointer-focus:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none",
		"group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start",
		"[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	],
	{
		variants: {
			variant: {
				default: "rounded-lg py-1 disabled:opacity-50",
				// A transparent 2px edge reserves the underline's space, so labels don't shift when the active tab
				// changes. Disabled is a lighter label, not opacity.
				line: "border-transparent px-2.5 group-data-[orientation=horizontal]/tabs:border-b-2 group-data-[orientation=vertical]/tabs:border-r-2 disabled:text-foreground-subtle",
			},
			size: {
				md: "text-sm",
				lg: "text-base",
			},
		},
		compoundVariants: [
			{ variant: "default", size: "md", className: "px-2.5" },
			{ variant: "default", size: "lg", className: "px-3" },
		],
		defaultVariants: {
			variant: "default",
			size: "md",
		},
	},
);

// The sliding active marker: the raised fill for `default`, the underline for `line` (on the right edge when vertical).
const tabsIndicatorVariants = cva("absolute", {
	variants: {
		variant: {
			default: "inset-0 rounded-lg bg-background shadow-xs",
			line: "bg-foreground group-data-[orientation=horizontal]/tabs:inset-x-0 group-data-[orientation=horizontal]/tabs:-bottom-0.5 group-data-[orientation=horizontal]/tabs:h-0.5 group-data-[orientation=vertical]/tabs:inset-y-0 group-data-[orientation=vertical]/tabs:-right-0.5 group-data-[orientation=vertical]/tabs:w-0.5",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

type TabsTriggerProps = React.ComponentProps<typeof TabsPrimitive.Trigger>;

/**
 * One tab. Put a 16px icon before the label if needed.
 *
 * Figma: [intercept.ds › Tabs Items](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1090-54)
 */
function TabsTrigger({ className, value, children, onPointerDown, onKeyDown, onBlur, ...props }: TabsTriggerProps) {
	const context = React.useContext(TabsContext);
	const { variant, size } = React.useContext(TabsListContext);
	const { resolve } = useMotionPreference();
	const active = context?.value === value;
	// The focus ring is for keyboard users. Chrome sometimes matches :focus-visible on a mouse click here (Radix's roving
	// focus), so a click marks the trigger and hides the ring until the next key press or blur.
	const [pointerFocus, setPointerFocus] = React.useState(false);

	return (
		<TabsPrimitive.Trigger
			data-slot='tabs-trigger'
			value={value}
			data-pointer-focus={pointerFocus ? "" : undefined}
			className={cn(tabsTriggerVariants({ variant, size }), className)}
			onPointerDown={(event) => {
				setPointerFocus(true);
				onPointerDown?.(event);
			}}
			onKeyDown={(event) => {
				setPointerFocus(false);
				onKeyDown?.(event);
			}}
			onBlur={(event) => {
				setPointerFocus(false);
				onBlur?.(event);
			}}
			{...props}
		>
			{/* The active marker is one shared element that slides to the selected tab (MOTION.md "Tabs"), instant under
			    reduced motion. Outside a Tabs (no context) the trigger has no marker. */}
			{active && context ? (
				<motion.span
					aria-hidden='true'
					layoutId={`${context.indicatorId}-indicator`}
					transition={resolve(layoutSpring)}
					className={tabsIndicatorVariants({ variant })}
				/>
			) : null}
			<span className='relative inline-flex items-center gap-1.5'>{children}</span>
		</TabsPrimitive.Trigger>
	);
}

type TabsContentProps = React.ComponentProps<typeof TabsPrimitive.Content>;

/** The panel for one tab. */
function TabsContent({ className, ...props }: TabsContentProps) {
	return <TabsPrimitive.Content data-slot='tabs-content' className={cn("flex-1 outline-none", className)} {...props} />;
}

export {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
	tabsListVariants,
	tabsTriggerVariants,
	type TabsContentProps,
	type TabsListProps,
	type TabsProps,
	type TabsTriggerProps,
};
