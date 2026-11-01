"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import { exitTransition, motionDistance, overlayVariants, standardTransition, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

// A modal panel from an edge of the screen, over the whole app and a scrim (shadcn's Sheet on Radix Dialog). Radix
// traps focus inside, closes on Escape or a click on the scrim, and returns focus to what opened it.

const SheetOpenContext = React.createContext(false);

/**
 * The sheet's state. Controlled (`open` / `onOpenChange`) or not (`defaultOpen`); the content reads it, so it can
 * animate out before it unmounts.
 */
function Sheet({ open: openProp, defaultOpen = false, onOpenChange, ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
	const [ownOpen, setOwnOpen] = React.useState(defaultOpen);
	const open = openProp ?? ownOpen;

	return (
		<SheetOpenContext.Provider value={open}>
			<SheetPrimitive.Root
				data-slot='sheet'
				open={open}
				onOpenChange={(next) => {
					if (openProp === undefined) setOwnOpen(next);
					onOpenChange?.(next);
				}}
				{...props}
			/>
		</SheetOpenContext.Provider>
	);
}

/** Opens the sheet. Use `asChild` to keep your own button. */
function SheetTrigger(props: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
	return <SheetPrimitive.Trigger data-slot='sheet-trigger' {...props} />;
}

/** Closes the sheet. Use `asChild` to keep your own button. */
function SheetClose(props: React.ComponentProps<typeof SheetPrimitive.Close>) {
	return <SheetPrimitive.Close data-slot='sheet-close' {...props} />;
}

const sheetContentVariants = cva("fixed z-50 flex flex-col bg-background outline-none", {
	variants: {
		side: {
			right: "inset-y-0 right-0 h-full w-[400px] max-w-full rounded-l-card shadow-sheet",
			left: "inset-y-0 left-0 h-full w-[400px] max-w-full rounded-r-card shadow-2xl",
			top: "inset-x-0 top-0 max-h-full rounded-b-card shadow-2xl",
			bottom: "inset-x-0 bottom-0 max-h-full rounded-t-card shadow-2xl",
		},
	},
	defaultVariants: {
		side: "right",
	},
});

type SheetSide = NonNullable<VariantProps<typeof sheetContentVariants>["side"]>;

// Where the surface comes from: `panelVariants`' distance and timing, from the sheet's own edge.
const sheetOffset: Record<SheetSide, { x?: number; y?: number }> = {
	right: { x: motionDistance.medium },
	left: { x: -motionDistance.medium },
	top: { y: -motionDistance.medium },
	bottom: { y: motionDistance.medium },
};

type SheetContentProps = Omit<React.ComponentProps<typeof SheetPrimitive.Content>, "forceMount"> &
	VariantProps<typeof sheetContentVariants> & {
		/** A close button in the top-right corner (default). Turn it off when the content has its own. */
		showCloseButton?: boolean;
		/** The close button's accessible name. */
		closeLabel?: string;
	};

/**
 * A modal panel from an edge of the screen, over a scrim that covers the whole app. `side`: `right` (default) | `left`
 * | `top` | `bottom`; a side panel is 400px wide. The scrim fades and the panel slides a short way in from its edge
 * (MOTION.md Dialogs/overlays: `overlayVariants`, and `panelVariants`' distance and timing); both fade only under reduced
 * motion. Name it with a SheetTitle.
 *
 * Figma: [Intercept-Live › Filter example](https://www.figma.com/design/EKg9ovtsHlQoK3DAS0F5IM/Intercept-Live?node-id=205-5447)
 */
function SheetContent({
	className,
	children,
	side = "right",
	showCloseButton = true,
	closeLabel = "Close",
	...props
}: SheetContentProps) {
	const open = React.useContext(SheetOpenContext);
	const { prefersReducedMotion, resolve } = useMotionPreference();
	const sheetSide = side ?? "right";
	// Under reduced motion, a fade only.
	const offset = prefersReducedMotion ? {} : sheetOffset[sheetSide];

	return (
		<AnimatePresence>
			{open ? (
				<SheetPrimitive.Portal forceMount>
					<SheetPrimitive.Overlay asChild forceMount>
						<motion.div
							data-slot='sheet-overlay'
							variants={overlayVariants}
							initial='initial'
							animate='animate'
							exit='exit'
							className='fixed inset-0 z-50 bg-overlay'
						/>
					</SheetPrimitive.Overlay>
					<SheetPrimitive.Content asChild forceMount {...props}>
						<motion.div
							data-slot='sheet-content'
							data-side={sheetSide}
							initial={{ opacity: 0, ...offset }}
							animate={{ opacity: 1, x: 0, y: 0, transition: resolve(standardTransition) }}
							exit={{ opacity: 0, ...offset, transition: resolve(exitTransition) }}
							className={cn(sheetContentVariants({ side: sheetSide }), className)}
						>
							{children}
							{showCloseButton ? (
								<SheetPrimitive.Close asChild>
									<Button
										variant='ghost'
										size='icon-sm'
										aria-label={closeLabel}
										className='absolute top-7 right-6 rounded-button-md'
									>
										<XIcon />
									</Button>
								</SheetPrimitive.Close>
							) : null}
						</motion.div>
					</SheetPrimitive.Content>
				</SheetPrimitive.Portal>
			) : null}
		</AnimatePresence>
	);
}

/** The title and description at the top, 32px in from the sheet's edges. */
function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
	return <div data-slot='sheet-header' className={cn("flex shrink-0 flex-col gap-2 px-8 pt-8 pb-4", className)} {...props} />;
}

/** Actions at the bottom, 32px in from the sheet's edges. */
function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
	return <div data-slot='sheet-footer' className={cn("mt-auto flex shrink-0 gap-2 px-8 pt-4 pb-8", className)} {...props} />;
}

/** The sheet's accessible name. Leave room for the close button on its right. */
function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
	return (
		<SheetPrimitive.Title
			data-slot='sheet-title'
			className={cn("pr-10 text-base font-semibold text-foreground", className)}
			{...props}
		/>
	);
}

/** A line under the title, read with it by screen readers. */
function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
	return (
		<SheetPrimitive.Description
			data-slot='sheet-description'
			className={cn("text-sm text-muted-foreground", className)}
			{...props}
		/>
	);
}

export {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
	sheetContentVariants,
	type SheetContentProps,
	type SheetSide,
};
