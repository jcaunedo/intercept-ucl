import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircleIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// Solid fills change on hover under a 20% layer, the same blend as Figma's overlay: white over the neutral fill, which
// lightens it, black over the others. Disabled, every fill is `disabled` and every label `foreground-subtle`, with no opacity.

// The brand fill, shared with its deprecated alias (`default`).
const brandVariant =
	"bg-primary text-primary-foreground hover:bg-[color-mix(in_srgb,var(--primary)_80%,black)] disabled:bg-disabled";

// The md sizes, shared with their deprecated aliases (`default`, `icon`) so the two never drift apart: 14px to the
// label's side and 10px to an icon's, 6px between them (the outline variant's 1px border is inside those, see
// compoundVariants).
const mdSize = "h-9 gap-1.5 rounded-button-md px-3.5 font-semibold has-[>svg]:pl-2.5";
const iconMdSize = "size-9 rounded-button-md [&_svg:not([class*='size-'])]:size-4.5";

const buttonVariants = cva(
	"inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:text-foreground-subtle [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				// Solid · Neutral, the default (Nov 2, 2026): a dark fill, lighter on hover. The label is `neutral-foreground`,
				// which turns dark with the fill in dark mode.
				neutral:
					"bg-neutral text-neutral-foreground hover:bg-[color-mix(in_srgb,var(--neutral)_80%,white)] disabled:bg-disabled",
				// The brand fill, for the rare action that should carry the brand.
				brand: brandVariant,
				/** @deprecated Use `brand`; the default is now `neutral`. */
				default: brandVariant,
				destructive:
					"bg-destructive text-destructive-foreground hover:bg-[color-mix(in_srgb,var(--destructive)_80%,black)] disabled:bg-disabled",
				// Solid · Success (Nov 4, 2026): accepting something that's waiting, e.g. Answer on an incoming consult call. The
				// label is bound to `neutral-foreground` in intercept.ds (alert-toast Consult request).
				success:
					"bg-success text-neutral-foreground hover:bg-[color-mix(in_srgb,var(--success)_80%,black)] disabled:bg-disabled",
				// Hover darkens the border on text buttons only (icon buttons keep theirs, see compoundVariants).
				outline:
					"border border-input bg-background shadow-xs hover:border-input-ring hover:bg-accent hover:text-accent-foreground disabled:border-input-disabled disabled:shadow-none",
				// The flat fills: a pale tone, a step darker on hover.
				secondary: "bg-neutral-subtle text-neutral hover:bg-neutral-muted disabled:bg-disabled",
				"destructive-secondary":
					"bg-destructive-subtle text-destructive hover:bg-destructive-muted disabled:bg-disabled",
				ghost: "hover:bg-accent hover:text-accent-foreground",
				// The brand color (Nov 11, 2026), underlined on hover, so an inline link without padding still reads as one.
				link: "text-brand underline-offset-4 hover:underline",
				// A white, fully round button for floating over a dark surface (e.g. a monitor), so it keeps the same light
				// look in both modes. Usually icon only; round at every size (see compoundVariants).
				circle: "rounded-full bg-(--white) text-(--gray-700) hover:bg-(--gray-100)",
			},
			// The control size scale (SIZE-SCALE.md): xs 24, sm 32, md 36, lg 40, and an icon-only square at each height.
			// UCL names its 36px step `md` where shadcn says `default`. A button with an icon child gets less padding on
			// the icon's side, which these assume is the left.
			size: {
				// Radii follow archielabs.ds `radius/button/*`: 8px at 24px, 12px from 32px up (`radius/3`).
				xs: "h-6 gap-1 rounded-lg px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
				sm: "h-8 gap-[5px] rounded-button-md px-3 font-semibold has-[>svg]:pl-2",
				md: mdSize,
				lg: "h-10 gap-1.5 rounded-button-md px-4.5 font-semibold has-[>svg]:pl-3",
				"icon-xs": "size-6 rounded-lg [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-8 rounded-button-md",
				"icon-md": iconMdSize,
				"icon-lg": "size-10 rounded-button-md [&_svg:not([class*='size-'])]:size-5",
				/** @deprecated Use `md`. */
				default: mdSize,
				/** @deprecated Use `icon-md`. */
				icon: iconMdSize,
			},
			// A spinner in place of the label, with more room around it (see compoundVariants). Not disabled-looking:
			// `Button` swallows the click instead.
			loading: {
				true: "pointer-events-none",
				false: "",
			},
		},
		compoundVariants: [
			// The outline border takes 1px of the padding, so its label and icon land where the other variants' do.
			{ variant: "outline", size: "xs", className: "px-[7px]" },
			{ variant: "outline", size: "sm", className: "px-[11px] has-[>svg]:pl-[7px]" },
			{ variant: "outline", size: ["md", "default"], className: "px-[13px] has-[>svg]:pl-[9px]" },
			{ variant: "outline", size: "lg", className: "px-[17px] has-[>svg]:pl-[11px]" },
			{ variant: "outline", size: ["icon-xs", "icon-sm", "icon-md", "icon-lg", "icon"], className: "hover:border-input" },
			// Loading: the spinner 16px from each side at 24px, 19px at 32px and 28px from 36px up.
			{ loading: true, size: "xs", className: "px-4 has-[>svg]:px-4" },
			{ loading: true, size: "sm", className: "px-[19px] has-[>svg]:px-[19px]" },
			{ loading: true, size: ["md", "default", "lg"], className: "px-7 has-[>svg]:px-7" },
			{ loading: true, variant: "outline", size: "xs", className: "px-[15px] has-[>svg]:px-[15px]" },
			{ loading: true, variant: "outline", size: "sm", className: "px-[18px] has-[>svg]:px-[18px]" },
			{ loading: true, variant: "outline", size: ["md", "default", "lg"], className: "px-[27px] has-[>svg]:px-[27px]" },
			// The sizes set their own radius; the circle stays round at all of them.
			{ variant: "circle", className: "rounded-full" },
		],
		defaultVariants: {
			variant: "neutral",
			size: "md",
			loading: false,
		},
	},
);

type ButtonProps = React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	};

/**
 * Triggers an action or event, such as submitting a form or moving to the next step. Neutral (dark) by default.
 * `loading` shows a spinner in place of the label (still read by screen readers) and ignores clicks until it's done.
 *
 * Figma: [intercept.ds › Button](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1018-4405)
 */
function Button({
	className,
	variant = "neutral",
	size = "md",
	asChild = false,
	loading = false,
	children,
	onClick,
	...props
}: ButtonProps) {
	const Component = asChild ? Slot : "button";

	return (
		<Component
			data-slot='button'
			// Deprecated aliases report their current name, so styling hooks only need `brand`, `md` and `icon-md`.
			data-variant={variant === "default" ? "brand" : variant}
			data-size={size === "default" ? "md" : size === "icon" ? "icon-md" : size}
			data-loading={loading || undefined}
			className={cn(buttonVariants({ variant, size, loading, className }))}
			{...props}
			aria-busy={loading || props["aria-busy"]}
			aria-disabled={loading || props["aria-disabled"]}
			// While loading the button keeps its look, so a click or Enter is dropped here rather than by `disabled`.
			onClick={loading ? (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault() : onClick}
		>
			{loading && !asChild ? (
				<>
					<LoaderCircleIcon aria-hidden='true' className='animate-spin motion-reduce:animate-none' />
					<span className='sr-only'>{children}</span>
				</>
			) : (
				children
			)}
		</Component>
	);
}

export { Button, buttonVariants, type ButtonProps };
