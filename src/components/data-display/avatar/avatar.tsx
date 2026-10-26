"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";
import { PlusIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// The root isn't clipped (no overflow-hidden, unlike shadcn), so AvatarBadge can sit on the corner of the circle
// without being cut. The image and fallback round themselves instead.
const avatarVariants = cva("group/avatar relative flex shrink-0 rounded-full select-none", {
	variants: {
		size: {
			xs: "size-6",
			sm: "size-8",
			md: "size-9",
			lg: "size-10",
		},
	},
	defaultVariants: {
		size: "sm",
	},
});

type AvatarProps = React.ComponentProps<typeof AvatarPrimitive.Root> & VariantProps<typeof avatarVariants>;

/**
 * A person's picture, with their initials while it loads or when there's none. Compose with AvatarImage,
 * AvatarFallback and an optional AvatarBadge.
 *
 * Figma: [intercept.ds › avatar](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1112-4118)
 */
function Avatar({ className, size = "sm", ...props }: AvatarProps) {
	return (
		<AvatarPrimitive.Root
			data-slot='avatar'
			data-size={size}
			className={cn(avatarVariants({ size }), className)}
			{...props}
		/>
	);
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
	return (
		<AvatarPrimitive.Image
			data-slot='avatar-image'
			className={cn("aspect-square size-full rounded-full object-cover", className)}
			{...props}
		/>
	);
}

// Initials keep Figma's proportion at every size: 11px in the 32px avatar.
const avatarFallbackVariants = cva(
	"flex size-full items-center justify-center rounded-full text-[11px] leading-none font-bold group-data-[size=xs]/avatar:text-[8.25px] group-data-[size=md]/avatar:text-[12.375px] group-data-[size=lg]/avatar:text-[13.75px]",
	{
		variants: {
			tone: {
				none: "bg-muted text-muted-foreground",
				1: "bg-avatar-1 text-primary-foreground",
				2: "bg-avatar-2 text-primary-foreground",
				3: "bg-avatar-3 text-primary-foreground",
				4: "bg-avatar-4 text-primary-foreground",
				5: "bg-avatar-5 text-primary-foreground",
				6: "bg-avatar-6 text-primary-foreground",
				7: "bg-avatar-7 text-primary-foreground",
				8: "bg-avatar-8 text-primary-foreground",
				9: "bg-avatar-9 text-primary-foreground",
				10: "bg-avatar-10 text-primary-foreground",
			},
		},
		defaultVariants: {
			tone: "none",
		},
	},
);

type AvatarFallbackProps = React.ComponentProps<typeof AvatarPrimitive.Fallback> &
	VariantProps<typeof avatarFallbackVariants>;

/** Initials, shown until the image loads or when it fails. `tone` (1–10) picks the person's color. */
function AvatarFallback({ className, tone = "none", ...props }: AvatarFallbackProps) {
	return (
		<AvatarPrimitive.Fallback
			data-slot='avatar-fallback'
			data-tone={tone}
			className={cn(avatarFallbackVariants({ tone }), className)}
			{...props}
		/>
	);
}

/**
 * A status dot on the avatar's bottom-right corner, ringed in the background color. Green (online) by default. It's
 * decorative: say the status in text too (e.g. in the avatar's alt or a label).
 */
function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span
			data-slot='avatar-badge'
			aria-hidden='true'
			className={cn(
				"absolute right-0 bottom-0 z-10 size-2 rounded-full bg-success ring-2 ring-background group-data-[size=xs]/avatar:size-1.5 group-data-[size=md]/avatar:size-[9px] group-data-[size=lg]/avatar:size-2.5",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * Avatars overlapping in a row, each ringed in the background color. The first one sits on top, as in Figma.
 * Set the size on each Avatar.
 */
function AvatarGroup({ className, children, ...props }: React.ComponentProps<"div">) {
	const items = React.Children.toArray(children).filter(React.isValidElement<{ style?: React.CSSProperties }>);

	return (
		<div
			data-slot='avatar-group'
			className={cn(
				"group/avatar-group isolate flex -space-x-1.5 *:data-[slot=avatar]:border-[2.7px] *:data-[slot=avatar]:border-background",
				className,
			)}
			{...props}
		>
			{items.map((child, index) =>
				React.cloneElement(child, { style: { zIndex: items.length - index, ...child.props.style } }),
			)}
		</div>
	);
}

const avatarAddVariants = cva(
	"inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-background text-icon outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			size: {
				xs: "size-6 [&_svg]:size-3",
				sm: "size-8 [&_svg]:size-4",
				md: "size-9 [&_svg]:size-[18px]",
				lg: "size-10 [&_svg]:size-5",
			},
		},
		defaultVariants: {
			size: "sm",
		},
	},
);

type AvatarAddProps = React.ComponentProps<"button"> &
	VariantProps<typeof avatarAddVariants> & {
		/** What the button adds, for screen readers. */
		label?: string;
	};

/** An avatar-shaped "add" button, e.g. at the end of an AvatarGroup to add a person. */
function AvatarAdd({ className, size = "sm", label = "Add", type = "button", ...props }: AvatarAddProps) {
	return (
		<button
			data-slot='avatar-add'
			data-size={size}
			type={type}
			aria-label={label}
			className={cn(avatarAddVariants({ size }), className)}
			{...props}
		>
			<PlusIcon aria-hidden='true' />
		</button>
	);
}

export {
	Avatar,
	AvatarAdd,
	AvatarBadge,
	AvatarFallback,
	AvatarGroup,
	AvatarImage,
	avatarAddVariants,
	avatarFallbackVariants,
	avatarVariants,
	type AvatarAddProps,
	type AvatarFallbackProps,
	type AvatarProps,
};
