"use client";

import * as React from "react";
import { motion } from "motion/react";
import { PanelLeftIcon } from "lucide-react";

import { Logo, LogoSymbol } from "@/components/data-display/logo";
import { SidebarTooltip } from "@/components/overlays/sidebar-tooltip";
import { enterTransition, iconSwapReducedVariants, iconSwapVariants, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

type SidebarIcon = React.ComponentType<{ className?: string }>;

/** Panel-left with a short divider: the expanded Sidebar's collapse button. Figma `panel-left-alt` (intercept.ds). */
function PanelLeftAltIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={24}
			height={24}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			{...props}
		>
			<path d="M8 7V17M5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3Z" />
		</svg>
	);
}

type SidebarMenuButtonProps = React.ComponentProps<"button"> & {
	/** Leading icon, e.g. a lucide-react icon component. */
	icon: SidebarIcon;
	/** Solid icon for the Active state (Figma swaps e.g. square-activity for square-activity-solid). Optional: without it the outline `icon` stays. */
	activeIcon?: SidebarIcon;
	label: string;
	/** Trailing text after the label (Figma "Suffix"), e.g. a count. */
	suffix?: React.ReactNode;
	/** Marks the item as the current page (Figma Property 1=Active). */
	active?: boolean;
	/**
	 * Icon-only layout for the collapsed Sidebar. The label stays for screen readers (`aria-label`) and shows in a
	 * SidebarTooltip on hover and focus.
	 */
	collapsed?: boolean;
};

/**
 * One row in the sidebar's nav. Figma: intercept.ds `sidebar-menu-button`, Property 1=Default, Hover, Active.
 */
function SidebarMenuButton({
	icon: Icon,
	activeIcon: ActiveIcon,
	label,
	suffix,
	active = false,
	collapsed = false,
	className,
	...props
}: SidebarMenuButtonProps) {
	return (
		// Always mounted and only `disabled` while expanded, so collapsing the rail doesn't remount the button.
		<SidebarTooltip label={label} disabled={!collapsed}>
			<button
				type='button'
				data-slot='sidebar-menu-button'
				data-active={active || undefined}
				aria-current={active ? "page" : undefined}
				aria-label={collapsed ? label : undefined}
				className={cn(
					// Figma: row hugs its content (36px: 6px vertical padding around the 24px line), radius/menu/item (8px), 8px
					// horizontal padding, 10px gap,
					// 18px icon, base/medium label (16px on a 24px line).
					"flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-base font-medium outline-none",
					"[&_svg]:size-[18px] [&_svg]:shrink-0",
					// Fill, label and icon color fade over motionDuration.fast (160ms).
					"transition-[background-color,color] duration-160 ease-in-out [&_svg]:transition-colors [&_svg]:duration-160 [&_svg]:ease-in-out",
					"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
					active
						? // Property 1=Active: no fill; base/semibold label in foreground/foreground, solid icon in icon/foreground.
							"font-semibold text-foreground [&_svg]:text-icon"
						: // Property 1=Default: label foreground/subtle, icon icon/muted. Property 1=Hover: states/active fill;
							// label and icon go to #31373f (Figma binds the label to icon/foreground; UCL uses `foreground`,
							// like Active).
							"text-foreground-subtle hover:bg-active hover:text-foreground [&_svg]:text-icon-muted hover:[&_svg]:text-icon",
					collapsed ? "size-9 shrink-0 justify-center p-0" : "w-full",
					className,
				)}
				{...props}
			>
				{active && ActiveIcon ? <ActiveIcon /> : <Icon />}
				{collapsed ? null : (
					<>
						<span className='min-w-0 flex-1 truncate text-left'>{label}</span>
						{suffix !== undefined ? (
							// Figma "Suffix": sm/regular in foreground/muted.
							<span data-slot='sidebar-menu-button-suffix' className='shrink-0 text-sm font-normal text-muted-foreground'>
								{suffix}
							</span>
						) : null}
					</>
				)}
			</button>
		</SidebarTooltip>
	);
}

/** Line between nav groups. Figma "divider": an 8px row with a 1px input/border line centered. */
function SidebarDivider({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot='sidebar-divider'
			role='separator'
			className={cn("h-2 w-full shrink-0 bg-input bg-clip-content py-[3.5px]", className)}
			{...props}
		/>
	);
}

/** One nav row, as configured by the app. */
type SidebarNavItem = {
	icon: SidebarIcon;
	/** Solid icon shown while the item is active. */
	activeIcon?: SidebarIcon;
	label: string;
	/** Trailing text after the label (Figma "Suffix"). */
	suffix?: React.ReactNode;
	/** Action for items that don't route. Wins over `navigateTo` when both are set. */
	onClick?: () => void;
	/** Route this item points at. Clicking passes it to `onNavigate`, so the app can run its router. */
	navigateTo?: string;
};

type SidebarProps = Omit<
	React.ComponentProps<"div">,
	"onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd"
> & {
	/** Nav items in groups, with a divider between groups (Figma: three groups). */
	groups: SidebarNavItem[][];
	/** Items pinned to the bottom of the rail (Figma: Documentation, Support). */
	footerItems?: SidebarNavItem[];
	/**
	 * Which item is active on first render (its label). Defaults to the first item. The Sidebar owns the active state
	 * after that; use `onNavigate` to react to clicks.
	 */
	defaultActiveItem?: string;
	/**
	 * Controlled active item (its label). Pass it when the app changes page on its own. Clicks still call `onNavigate`,
	 * and the app updates it.
	 */
	activeItem?: string;
	/** Called with a clicked item's `navigateTo`. Items without one never fire it. */
	onNavigate?: (navigateTo: string) => void;
	/** Controlled collapsed state (icon rail, Figma "New Collapsed"). Pass it with `onCollapsedChange`. */
	collapsed?: boolean;
	/** Whether the Sidebar starts collapsed when uncontrolled. Defaults to expanded. */
	defaultCollapsed?: boolean;
	/** Called with the new collapsed state whenever the user toggles it, controlled or not. */
	onCollapsedChange?: (collapsed: boolean) => void;
};

/**
 * The app's navigation rail. Figma: intercept.ds `sidebar`, Property 1=New Default (280px) and New Collapsed (72px).
 * Behavior and motion match bethere-ucl's Sidebar: the width animates on `enterTransition`, clicking anywhere on the
 * rail's empty space toggles it, and hovering the collapsed rail swaps the mark for an expand icon.
 */
function Sidebar({
	groups,
	footerItems = [],
	defaultActiveItem,
	activeItem: activeItemProp,
	onNavigate,
	collapsed: collapsedProp,
	defaultCollapsed = false,
	onCollapsedChange,
	className,
	...props
}: SidebarProps) {
	const homeItem = groups[0]?.[0];
	const [uncontrolledActiveItem, setActiveItem] = React.useState(defaultActiveItem ?? homeItem?.label);
	const activeItem = activeItemProp ?? uncontrolledActiveItem;
	const [uncontrolledCollapsed, setUncontrolledCollapsed] = React.useState(defaultCollapsed);
	const collapsed = collapsedProp ?? uncontrolledCollapsed;
	const [isRailHovered, setIsRailHovered] = React.useState(false);
	const { resolve, prefersReducedMotion } = useMotionPreference();
	const iconSwapMotion = prefersReducedMotion ? iconSwapReducedVariants : iconSwapVariants;

	const handleItemClick = (item: SidebarNavItem) => {
		setActiveItem(item.label);
		if (item.onClick) {
			item.onClick();
		} else if (item.navigateTo) {
			onNavigate?.(item.navigateTo);
		}
	};

	const handleToggleCollapsed = () => {
		const next = !collapsed;
		setUncontrolledCollapsed(next);
		onCollapsedChange?.(next);
	};

	const renderItem = (item: SidebarNavItem) => (
		<SidebarMenuButton
			key={item.label}
			icon={item.icon}
			activeIcon={item.activeIcon}
			label={item.label}
			suffix={item.suffix}
			active={activeItem === item.label}
			collapsed={collapsed}
			onClick={() => handleItemClick(item)}
		/>
	);

	return (
		<motion.div
			data-slot='sidebar'
			data-collapsed={collapsed}
			// `initial={false}`: mount at the target width. Without it Motion animates from the natural width on every
			// mount, so the rail would slide in on each page load.
			initial={false}
			// Figma widths: New Collapsed 72px, New Default 280px.
			animate={{ width: collapsed ? 72 : 280 }}
			transition={resolve(enterTransition)}
			className={cn(
				"relative flex h-screen shrink-0 flex-col justify-between overflow-hidden bg-sidebar",
				// Figma's 1px input/border right stroke doesn't take layout space, so it's drawn over the edge instead of
				// as a border (which would narrow the rows to 247px).
				"after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-input",
				// Figma: collapsed 8px sides / 16px top and bottom; expanded spacing/4 (16px) all round.
				collapsed ? "items-center px-2 py-4" : "items-start p-4",
				className,
			)}
			{...props}
		>
			{/* The rail's empty space toggles it. Mouse only: the logo and collapse buttons are the keyboard path. */}
			<button
				type='button'
				data-slot='sidebar-rail-toggle'
				tabIndex={-1}
				aria-hidden='true'
				onClick={handleToggleCollapsed}
				onMouseEnter={() => setIsRailHovered(true)}
				onMouseLeave={() => setIsRailHovered(false)}
				className={cn("absolute inset-0 z-0 outline-none", collapsed ? "cursor-e-resize" : "cursor-w-resize")}
			/>

			{/* Figma "Content-Top": logo, then the nav, 16px apart. Collapsed it's a 36px column. */}
			<div
				data-slot='sidebar-header'
				className={cn("relative z-10 flex flex-col gap-4", collapsed ? "w-9 items-center" : "w-full items-start")}
			>
				{collapsed ? (
					// Figma "Logo Container", collapsed: 48px tall, the mark centered.
					<div className='flex h-12 items-center'>
						<button
							type='button'
							data-slot='sidebar-expand'
							aria-label='Expand sidebar'
							onClick={handleToggleCollapsed}
							onMouseEnter={() => setIsRailHovered(true)}
							onMouseLeave={() => setIsRailHovered(false)}
							className='relative flex size-8 shrink-0 items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar'
						>
							{/* Hovering the rail swaps the mark for the expand icon in place (iconSwapVariants: the leaving one
							    dissolves while the arriving one fades in and grows). Instant under reduced motion. */}
							<motion.span
								aria-hidden='true'
								variants={iconSwapMotion}
								initial={false}
								animate={isRailHovered ? "hidden" : "shown"}
								className='pointer-events-none absolute inset-0 flex items-center justify-center'
							>
								<LogoSymbol />
							</motion.span>
							<motion.span
								aria-hidden='true'
								variants={iconSwapMotion}
								initial={false}
								animate={isRailHovered ? "shown" : "hidden"}
								className='pointer-events-none absolute inset-0 flex items-center justify-center'
							>
								<PanelLeftIcon className='size-4 text-icon' />
							</motion.span>
						</button>
					</div>
				) : (
					// Figma "Logo Container", expanded: 48px tall, 2px left / 4px right / 8px vertical padding.
					<div className='flex h-12 w-full items-center justify-between py-2 pr-1 pl-0.5'>
						{homeItem ? (
							<button
								type='button'
								data-slot='sidebar-home'
								aria-label={`Go to ${homeItem.label}`}
								onClick={() => handleItemClick(homeItem)}
								className='flex shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar'
							>
								<Logo aria-hidden='true' />
							</button>
						) : (
							<Logo />
						)}
						{/* Figma "Button / Icon": 24px, panel-left-alt 16px in icon/subtle. Hover is Button's ghost hover
						    (`accent` fill, `accent-foreground` icon). Pointer cursor, from the global button rule. */}
						<button
							type='button'
							data-slot='sidebar-collapse'
							aria-label='Collapse sidebar'
							onClick={handleToggleCollapsed}
							className='flex size-6 shrink-0 items-center justify-center rounded-md text-icon-subtle outline-none transition-colors duration-160 ease-in-out hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar'
						>
							<PanelLeftAltIcon className='size-4' />
						</button>
					</div>
				)}

				{/* Figma "Primary Navigation": items and dividers 12px apart (spacing/3). */}
				<nav aria-label='Main' className={cn("flex w-full flex-col gap-3", collapsed ? "items-center" : "items-start")}>
					{groups.map((group, index) => (
						<React.Fragment key={group[0]?.label ?? index}>
							{index > 0 ? <SidebarDivider /> : null}
							{group.map(renderItem)}
						</React.Fragment>
					))}
				</nav>
			</div>

			{footerItems.length > 0 ? (
				// Figma "Footer": 12px apart, pinned to the bottom.
				<div
					data-slot='sidebar-footer'
					className={cn("relative z-10 flex w-full flex-col gap-3", collapsed ? "items-center" : "items-start")}
				>
					{footerItems.map(renderItem)}
				</div>
			) : null}
		</motion.div>
	);
}

export {
	Sidebar,
	SidebarDivider,
	SidebarMenuButton,
	type SidebarMenuButtonProps,
	type SidebarNavItem,
	type SidebarProps,
};
