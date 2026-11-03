"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import { exitTransition, motionDistance, overlayVariants, standardTransition, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

// A modal window in the middle of the screen, over a scrim that covers the whole app (shadcn's Dialog on Radix). Radix
// traps focus inside, closes on Escape or a click on the scrim, and returns focus to what opened it.

const DialogOpenContext = React.createContext(false);

/**
 * The dialog's state. Controlled (`open` / `onOpenChange`) or not (`defaultOpen`); the content reads it, so it can
 * animate out before it unmounts.
 */
function Dialog({ open: openProp, defaultOpen = false, onOpenChange, ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
	const [ownOpen, setOwnOpen] = React.useState(defaultOpen);
	const open = openProp ?? ownOpen;

	return (
		<DialogOpenContext.Provider value={open}>
			<DialogPrimitive.Root
				data-slot='dialog'
				open={open}
				onOpenChange={(next) => {
					if (openProp === undefined) setOwnOpen(next);
					onOpenChange?.(next);
				}}
				{...props}
			/>
		</DialogOpenContext.Provider>
	);
}

/** Opens the dialog. Use `asChild` to keep your own button. */
function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
	return <DialogPrimitive.Trigger data-slot='dialog-trigger' {...props} />;
}

/** Closes the dialog. Use `asChild` to keep your own button. */
function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
	return <DialogPrimitive.Close data-slot='dialog-close' {...props} />;
}

type DialogContentProps = Omit<React.ComponentProps<typeof DialogPrimitive.Content>, "forceMount"> & {
	/** A close button in the top-right corner (default). Turn it off when the content has its own. */
	showCloseButton?: boolean;
	/** The close button's accessible name. */
	closeLabel?: string;
};

/**
 * A modal window in the middle of the screen, over a scrim that covers the whole app: 560px wide by default (set another
 * width in `className`), never wider than the screen less 16px a side, and never taller, scrolling inside. The scrim
 * fades and the window rises a short way into place (MOTION.md Dialogs/overlays: `overlayVariants`, and a small
 * distance); both fade only under reduced motion. Name it with a DialogTitle.
 */
function DialogContent({ className, children, showCloseButton = true, closeLabel = "Close", ...props }: DialogContentProps) {
	const open = React.useContext(DialogOpenContext);
	const { prefersReducedMotion, resolve } = useMotionPreference();
	const offset = prefersReducedMotion ? {} : { y: motionDistance.small };

	return (
		<AnimatePresence>
			{open ? (
				<DialogPrimitive.Portal forceMount>
					<DialogPrimitive.Overlay asChild forceMount>
						<motion.div
							data-slot='dialog-overlay'
							variants={overlayVariants}
							initial='initial'
							animate='animate'
							exit='exit'
							className='fixed inset-0 z-50 bg-overlay'
						/>
					</DialogPrimitive.Overlay>
					{/* Centered by a full-screen flex wrapper, so the motion's transform doesn't fight a translate. */}
					<div className='pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4'>
						<DialogPrimitive.Content asChild forceMount {...props}>
							<motion.div
								data-slot='dialog-content'
								initial={{ opacity: 0, ...offset }}
								animate={{ opacity: 1, y: 0, transition: resolve(standardTransition) }}
								exit={{ opacity: 0, ...offset, transition: resolve(exitTransition) }}
								className={cn(
									"pointer-events-auto relative flex max-h-full w-[560px] max-w-full flex-col overflow-hidden rounded-card bg-background shadow-2xl outline-none",
									className,
								)}
							>
								{children}
								{showCloseButton ? (
									<DialogPrimitive.Close asChild>
										<Button
											variant='ghost'
											size='icon-sm'
											aria-label={closeLabel}
											className='absolute top-5 right-5 rounded-button-md'
										>
											<XIcon />
										</Button>
									</DialogPrimitive.Close>
								) : null}
							</motion.div>
						</DialogPrimitive.Content>
					</div>
				</DialogPrimitive.Portal>
			) : null}
		</AnimatePresence>
	);
}

/** The title and description at the top, 24px in from the window's edges. */
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
	return <div data-slot='dialog-header' className={cn("flex shrink-0 flex-col gap-2 px-6 pt-6 pb-4", className)} {...props} />;
}

/** Actions at the bottom, 24px in from the window's edges, right-aligned. */
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot='dialog-footer'
			className={cn("mt-auto flex shrink-0 flex-wrap justify-end gap-2 px-6 pt-4 pb-6", className)}
			{...props}
		/>
	);
}

/** The dialog's accessible name. Leave room for the close button on its right. */
function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title
			data-slot='dialog-title'
			className={cn("pr-10 text-lg font-semibold text-foreground", className)}
			{...props}
		/>
	);
}

/** A line under the title, read with it by screen readers. */
function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
	return (
		<DialogPrimitive.Description
			data-slot='dialog-description'
			className={cn("text-sm text-muted-foreground", className)}
			{...props}
		/>
	);
}

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	type DialogContentProps,
};
