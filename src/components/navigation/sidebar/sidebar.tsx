"use client";

import * as React from "react";
import { motion } from "motion/react";
import { PanelLeftIcon } from "lucide-react";

import { Logo, LogoSymbol } from "@/components/data-display/logo";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/overlays/dropdown-menu";
import { SidebarTooltip } from "@/components/overlays/sidebar-tooltip";
import { enterTransition, iconSwapReducedVariants, iconSwapVariants, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

type SidebarIcon = React.ComponentType<{ className?: string }>;

/** Panel-left with a short divider: the expanded Sidebar's collapse button. Not in lucide. */
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
	/** Solid icon for the active state, e.g. `SquareActivitySolidIcon`. Optional: without it the outline `icon` stays. */
	activeIcon?: SidebarIcon;
	label: string;
	/** Trailing text after the label, e.g. a count. */
	suffix?: React.ReactNode;
	/** Marks the item as the current page. */
	active?: boolean;
	/**
	 * Icon-only layout for the collapsed Sidebar. The label stays for screen readers (`aria-label`) and shows in a
	 * SidebarTooltip on hover and focus.
	 */
	collapsed?: boolean;
	/** A menu the row opens above itself instead of acting: DropdownMenu items (DropdownMenuItem, DropdownMenuLabel…). */
	menu?: React.ReactNode;
};

/**
 * One row in the sidebar's nav.
 *
 * Figma: [intercept.ds › sidebar-menu-button](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1001-501)
 */
function SidebarMenuButton({
	icon: Icon,
	activeIcon: ActiveIcon,
	label,
	suffix,
	active = false,
	collapsed = false,
	menu,
	className,
	...props
}: SidebarMenuButtonProps) {
	const button = (
		<button
			type='button'
			data-slot='sidebar-menu-button'
			data-active={active || undefined}
			aria-current={active ? "page" : undefined}
			aria-label={collapsed ? label : undefined}
			className={cn(
				// The row hugs its content: 32px tall (6px vertical padding around the 20px label line).
				"flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-medium outline-none",
				"[&_svg]:size-4.5 [&_svg]:shrink-0",
				// Fill, label and icon color fade over motionDuration.fast (160ms).
				"transition-[background-color,color] duration-160 ease-in-out [&_svg]:transition-colors [&_svg]:duration-160 [&_svg]:ease-in-out",
				"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
				active
					? // Active has no fill; the weight and the solid icon mark it.
						"font-semibold text-foreground [&_svg]:text-icon"
					: // Hover darkens the label to the Active color, so the two states match.
						"text-muted-foreground hover:bg-active hover:text-foreground [&_svg]:text-icon-muted hover:[&_svg]:text-icon",
				// The collapsed rail is `background-subtle`, the same as `bg-active`, so its hover fill is `sidebar-hover`.
				collapsed ? "size-8 shrink-0 justify-center p-0 hover:bg-sidebar-hover" : "w-full",
				// While its menu is open, the row keeps its hover look. `aria-expanded`, not `data-state`: the tooltip sets its
				// own `data-state` on the same button.
				menu && "aria-expanded:text-foreground aria-expanded:[&_svg]:text-icon",
				menu && (collapsed ? "aria-expanded:bg-sidebar-hover" : "aria-expanded:bg-active"),
				className,
			)}
			{...props}
		>
			{active && ActiveIcon ? <ActiveIcon /> : <Icon />}
			{collapsed ? null : (
				<>
					<span className='min-w-0 flex-1 truncate text-left'>{label}</span>
					{suffix !== undefined ? (
						<span data-slot='sidebar-menu-button-suffix' className='shrink-0 text-sm font-normal text-muted-foreground'>
							{suffix}
						</span>
					) : null}
				</>
			)}
		</button>
	);

	if (!menu) {
		return (
			// Always mounted and only `disabled` while expanded, so collapsing the rail doesn't remount the button.
			<SidebarTooltip label={label} disabled={!collapsed}>
				{button}
			</SidebarTooltip>
		);
	}

	// The menu opens above the row, from its left edge, so it doesn't cover the rail's other footer items.
	return (
		<DropdownMenu>
			<SidebarTooltip label={label} disabled={!collapsed}>
				<DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger>
			</SidebarTooltip>
			<DropdownMenuContent side='top' align='start' className='min-w-56'>
				{menu}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/** Line between nav groups: an 8px row with a 1px line centered. */
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
	/** Trailing text after the label, e.g. a count. */
	suffix?: React.ReactNode;
	/** Action for items that don't route. Wins over `navigateTo` when both are set. */
	onClick?: () => void;
	/** Route this item points at. Clicking passes it to `onNavigate`, so the app can run its router. */
	navigateTo?: string;
	/**
	 * A menu the item opens above itself (DropdownMenu items), e.g. the prototype's scenarios. Wins over `onClick` and
	 * `navigateTo`, and the item never becomes active.
	 */
	menu?: React.ReactNode;
};

type SidebarProps = Omit<
	React.ComponentProps<"div">,
	"onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd"
> & {
	/** Nav items in groups, with a divider between groups. */
	groups: SidebarNavItem[][];
	/** Items pinned to the bottom of the rail, e.g. Documentation and Support. */
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
	/** Controlled collapsed state (the 64px icon rail). Pass it with `onCollapsedChange`. */
	collapsed?: boolean;
	/** Whether the Sidebar starts collapsed when uncontrolled. Defaults to expanded. */
	defaultCollapsed?: boolean;
	/** Called with the new collapsed state whenever the user toggles it, controlled or not. */
	onCollapsedChange?: (collapsed: boolean) => void;
};

/**
 * The app's navigation rail, 280px expanded and 64px collapsed. The width animates on `enterTransition`, clicking
 * anywhere on the rail's empty space toggles it, and hovering the collapsed rail swaps the mark for an expand icon.
 *
 * Figma: [intercept.ds › sidebar](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1001-544)
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
			menu={item.menu}
			onClick={item.menu ? undefined : () => handleItemClick(item)}
		/>
	);

	return (
		<motion.div
			data-slot='sidebar'
			data-collapsed={collapsed}
			// `initial={false}`: mount at the target width. Without it Motion animates from the natural width on every
			// mount, so the rail would slide in on each page load.
			initial={false}
			animate={{ width: collapsed ? 64 : 280 }}
			transition={resolve(enterTransition)}
			className={cn(
				// Collapsed, the rail takes the page's subtle fill. The fill change runs with the width (motionDuration.slow).
				"relative flex h-screen shrink-0 flex-col justify-between overflow-hidden transition-[background-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
				collapsed ? "bg-background-subtle" : "bg-sidebar",
				// Expanded only: the 1px right stroke, drawn over the edge rather than as a border so it doesn't narrow the
				// rows to 247px. The collapsed rail has none; its subtle fill separates it from the page.
				!collapsed && "after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-input",
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

			<div
				data-slot='sidebar-header'
				className={cn("relative z-10 flex flex-col gap-4", collapsed ? "w-9 items-center" : "w-full items-start")}
			>
				{collapsed ? (
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
						{/* Hover matches Button's ghost variant. */}
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

				<nav aria-label='Main' className={cn("flex w-full flex-col gap-2.5", collapsed ? "items-center" : "items-start")}>
					{groups.map((group, index) => (
						<React.Fragment key={group[0]?.label ?? index}>
							{index > 0 ? <SidebarDivider /> : null}
							{group.map(renderItem)}
						</React.Fragment>
					))}
				</nav>
			</div>

			{footerItems.length > 0 ? (
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
