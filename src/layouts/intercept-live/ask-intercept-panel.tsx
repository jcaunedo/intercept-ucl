import * as React from "react";
import { SparklesIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import { EmptyState } from "@/components/feedback/empty-state";
import { Typography } from "@/components/typography/typography";
import { enterTransition, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

// The Ask Intercept Live chat (Intercept-Live "Chat open", `129:14814`): a global panel of the Provider Desktop, opened
// from the Sidebar's Ask Intercept Live on any page. Figma draws its frame only; the conversation isn't designed yet.

const PANEL_WIDTH = 400;

/**
 * A 400px panel between the Sidebar and the canvas. It slides open from the left by growing its width, as the Sidebar
 * does (`enterTransition`), so the page narrows beside it instead of being covered; instant under reduced motion.
 * `carded` gives it the canvas's card edge (16px left radius and soft shadow), for when the Sidebar is collapsed.
 * Escape inside it, or the close button, closes it.
 */
function AskInterceptPanel({
	open,
	onOpenChange,
	carded,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	carded: boolean;
}) {
	const { resolve } = useMotionPreference();
	const headingRef = React.useRef<HTMLHeadingElement>(null);

	return (
		<AnimatePresence initial={false}>
			{open ? (
				<motion.aside
					key='ask-intercept'
					aria-labelledby='ask-intercept-title'
					initial={{ width: 0 }}
					animate={{ width: PANEL_WIDTH }}
					exit={{ width: 0 }}
					transition={resolve(enterTransition)}
					// Focus moves into the panel once it's open, so keyboard and screen reader users land in it.
					onAnimationComplete={() => headingRef.current?.focus()}
					onKeyDown={(event) => {
						if (event.key === "Escape") onOpenChange(false);
					}}
					className={cn(
						"relative h-full shrink-0 overflow-hidden bg-background transition-[border-radius,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
						carded && "rounded-l-2xl shadow-[0_0_26px_0_oklch(0_0_0/8%)]",
					)}
				>
					{/* Fixed at the open width, so the content doesn't reflow while the panel grows or shrinks. */}
					<div className='flex h-full flex-col' style={{ width: PANEL_WIDTH }}>
						<div className='flex items-center justify-between gap-2 px-6 py-5'>
							<Typography
								ref={headingRef}
								id='ask-intercept-title'
								as='h2'
								size='lg'
								weight='semibold'
								tabIndex={-1}
								className='outline-none'
							>
								Ask Intercept Live
							</Typography>
							<Button variant='ghost' size='icon-md' aria-label='Close Ask Intercept Live' onClick={() => onOpenChange(false)}>
								<XIcon />
							</Button>
						</div>
						{/* Placeholder until the conversation is designed. */}
						<EmptyState
							className='flex-1 px-6'
							headingLevel='h3'
							icon={<SparklesIcon aria-hidden='true' />}
							title='Ask about your patients'
							description='Ask Intercept Live answers questions about the patients on your census.'
						/>
					</div>
				</motion.aside>
			) : null}
		</AnimatePresence>
	);
}

export { AskInterceptPanel };
