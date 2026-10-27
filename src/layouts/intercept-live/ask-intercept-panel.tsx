import { SparklesIcon } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { cn } from "@/lib/utils";

import { SidePanel } from "./side-panel";

// The Ask Intercept Live chat (Intercept-Live "Chat open", `129:14814`): a global panel of the Provider Desktop, opened
// from the Sidebar's Ask Intercept Live on any page. Figma draws its frame only; the conversation isn't designed yet.

/**
 * The chat, a SidePanel between the Sidebar and the canvas: it slides open from the left and resizes from its right
 * edge. `carded` gives it the canvas's card edge (16px left radius and soft shadow), for when the Sidebar is collapsed.
 */
function AskInterceptPanel({
	open,
	onOpenChange,
	carded,
	width,
	onWidthChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	carded: boolean;
	width: number;
	onWidthChange: (width: number) => void;
}) {
	return (
		<SidePanel
			id='ask-intercept'
			side='left'
			title='Ask Intercept Live'
			open={open}
			onOpenChange={onOpenChange}
			width={width}
			onWidthChange={onWidthChange}
			className={cn(
				"transition-[border-radius,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
				carded && "rounded-l-2xl shadow-[0_0_26px_0_oklch(0_0_0/8%)]",
			)}
		>
			{/* Placeholder until the conversation is designed. */}
			<EmptyState
				className='flex-1 px-6'
				headingLevel='h3'
				icon={<SparklesIcon aria-hidden='true' />}
				title='Ask about your patients'
				description='Ask Intercept Live answers questions about the patients on your census.'
			/>
		</SidePanel>
	);
}

export { AskInterceptPanel };
