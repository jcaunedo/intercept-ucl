"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import { motion } from "motion/react";

import { enterTransition, motionDistance, motionScale, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

type MenuSide = "top" | "bottom" | "left" | "right";

// The surface Radix positions, as Select's: it fades in and grows from `motionScale.popIn`, moving
// `motionDistance.subtle` in from the trigger's side (MOTION.md "Menus/dropdowns"). Reduced motion keeps the fade only.
// Radix unmounts it on close, so the exit is instant.
function MenuSurface(props: React.ComponentProps<typeof motion.div> & { "data-side"?: MenuSide }) {
	const { prefersReducedMotion, resolve } = useMotionPreference();
	const side = props["data-side"];
	const distance = motionDistance.subtle;
	const from = side
		? { top: { y: distance }, bottom: { y: -distance }, left: { x: distance }, right: { x: -distance } }[side]
		: {};

	return (
		<motion.div
			initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: motionScale.popIn, ...from }}
			animate={{ opacity: 1, scale: 1, x: 0, y: 0, transition: resolve(enterTransition) }}
			{...props}
		/>
	);
}

// The list surface, shared with the submenu: Select's 10px radius, border, 4px padding, 2px between rows and `shadow-xl`.
const menuSurfaceClassName =
	"z-50 min-w-[200px] origin-(--radix-dropdown-menu-content-transform-origin) flex flex-col gap-0.5 overflow-x-hidden overflow-y-auto rounded-input border border-border bg-popover p-1 text-popover-foreground shadow-xl";

// Items sit 4px inside the 10px list, so their 6px radius stays concentric with it, and icons are 16px, as in Select.
// No `cursor-default` (shadcn's): items are clickable, so they take the global pointer.
const menuItemClassName =
	"relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

/**
 * shadcn's DropdownMenu on Radix: a button that opens a menu of actions or options (checkbox and radio items).
 * Styled and animated like Select's list.
 *
 * Figma: none yet. intercept.ds has no menu, so the list follows Select (DESIGN.md "DropdownMenu").
 */
function DropdownMenu(props: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
	return <DropdownMenuPrimitive.Root data-slot='dropdown-menu' {...props} />;
}

function DropdownMenuPortal(props: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
	return <DropdownMenuPrimitive.Portal data-slot='dropdown-menu-portal' {...props} />;
}

/** The button that opens the menu. Use `asChild` with a Button. */
function DropdownMenuTrigger(props: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
	return <DropdownMenuPrimitive.Trigger data-slot='dropdown-menu-trigger' {...props} />;
}

function DropdownMenuContent({
	className,
	sideOffset = 4,
	children,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
	return (
		<DropdownMenuPrimitive.Portal>
			<DropdownMenuPrimitive.Content
				asChild
				data-slot='dropdown-menu-content'
				sideOffset={sideOffset}
				className={cn("max-h-(--radix-dropdown-menu-content-available-height)", menuSurfaceClassName, className)}
				{...props}
			>
				<MenuSurface>{children}</MenuSurface>
			</DropdownMenuPrimitive.Content>
		</DropdownMenuPrimitive.Portal>
	);
}

// Rows inside a group keep the list's 2px gap.
function DropdownMenuGroup({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
	return (
		<DropdownMenuPrimitive.Group
			data-slot='dropdown-menu-group'
			className={cn("flex flex-col gap-0.5", className)}
			{...props}
		/>
	);
}

/** An action. `destructive` for one that deletes or removes; `inset` lines its label up with checkbox and radio items. */
function DropdownMenuItem({
	className,
	inset,
	variant = "default",
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & { inset?: boolean; variant?: "default" | "destructive" }) {
	return (
		<DropdownMenuPrimitive.Item
			data-slot='dropdown-menu-item'
			data-inset={inset}
			data-variant={variant}
			className={cn(
				menuItemClassName,
				"[&_svg:not([class*='text-'])]:text-icon data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive-subtle data-[variant=destructive]:*:[svg]:text-destructive!",
				className,
			)}
			{...props}
		/>
	);
}

// Checkbox and radio items are laid out like SelectItem: the label at the item's edge, and the check at the right when
// the option is on (a radio item uses the same check, as Select marks its chosen value).
const menuOptionClassName = "pr-8 [&_svg:not([class*='text-'])]:text-icon";

function MenuOptionIndicator() {
	return (
		<span className='pointer-events-none absolute right-2 flex size-3.5 items-center justify-center'>
			<DropdownMenuPrimitive.ItemIndicator>
				<CheckIcon className='size-4' />
			</DropdownMenuPrimitive.ItemIndicator>
		</span>
	);
}

/** An option that's on or off, with a check when on. */
function DropdownMenuCheckboxItem({
	className,
	children,
	checked,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
	return (
		<DropdownMenuPrimitive.CheckboxItem
			data-slot='dropdown-menu-checkbox-item'
			className={cn(menuItemClassName, menuOptionClassName, className)}
			checked={checked}
			{...props}
		>
			<MenuOptionIndicator />
			{children}
		</DropdownMenuPrimitive.CheckboxItem>
	);
}

/** One choice among several; wrap DropdownMenuRadioItems, with `value` and `onValueChange`. */
function DropdownMenuRadioGroup({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
	return (
		<DropdownMenuPrimitive.RadioGroup
			data-slot='dropdown-menu-radio-group'
			className={cn("flex flex-col gap-0.5", className)}
			{...props}
		/>
	);
}

function DropdownMenuRadioItem({
	className,
	children,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
	return (
		<DropdownMenuPrimitive.RadioItem
			data-slot='dropdown-menu-radio-item'
			className={cn(menuItemClassName, menuOptionClassName, className)}
			{...props}
		>
			<MenuOptionIndicator />
			{children}
		</DropdownMenuPrimitive.RadioItem>
	);
}

/** A group's heading, as Select's labels. */
function DropdownMenuLabel({
	className,
	inset,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & { inset?: boolean }) {
	return (
		<DropdownMenuPrimitive.Label
			data-slot='dropdown-menu-label'
			data-inset={inset}
			className={cn("px-2 pt-1.5 pb-1 text-xs text-muted-foreground data-[inset]:pl-8", className)}
			{...props}
		/>
	);
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
	return (
		<DropdownMenuPrimitive.Separator
			data-slot='dropdown-menu-separator'
			className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
			{...props}
		/>
	);
}

/** A keyboard shortcut at the end of an item, e.g. "⌘K". */
function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span
			data-slot='dropdown-menu-shortcut'
			className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}
			{...props}
		/>
	);
}

function DropdownMenuSub(props: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
	return <DropdownMenuPrimitive.Sub data-slot='dropdown-menu-sub' {...props} />;
}

function DropdownMenuSubTrigger({
	className,
	inset,
	children,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & { inset?: boolean }) {
	return (
		<DropdownMenuPrimitive.SubTrigger
			data-slot='dropdown-menu-sub-trigger'
			data-inset={inset}
			className={cn(
				menuItemClassName,
				"data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg:not([class*='text-'])]:text-icon",
				className,
			)}
			{...props}
		>
			{children}
			<ChevronRightIcon className='ml-auto size-4' />
		</DropdownMenuPrimitive.SubTrigger>
	);
}

function DropdownMenuSubContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
	return (
		<DropdownMenuPrimitive.SubContent
			asChild
			data-slot='dropdown-menu-sub-content'
			className={cn(menuSurfaceClassName, className)}
			{...props}
		>
			<MenuSurface>{children}</MenuSurface>
		</DropdownMenuPrimitive.SubContent>
	);
}

export {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
};
