import { GitBranchIcon, XIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/buttons/button";
import { AiSparkleIcon } from "@/components/icons/ai-sparkle-icon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/overlays/tooltip";
import { motionDelay } from "@/lib/motion";
import { cn } from "@/lib/utils";

type AiClinicalSummaryBannerProps = Omit<React.ComponentProps<"section">, "title" | "children"> & {
	/** What wrote it: the banner's tooltip on hover and its name for screen readers. Defaults to "AI clinical summary". */
	label?: string;
	/** The summary's headline, bold before it: "Worsening hemodynamic and respiratory status: MAP decreased…". */
	title?: string;
	/** The summary itself, after the headline on the same line. */
	children: React.ReactNode;
	/** Where it comes from and how fresh it is, e.g. "17 sources · 3 h 10 min ago", after the source icon. */
	source?: React.ReactNode;
	/** Makes the summary one click target, e.g. to ask Intercept Live what's behind it. */
	onOpen?: () => void;
	/** The click target's name for screen readers, read after the summary. Defaults to "Ask Intercept Live for more". */
	openLabel?: string;
	/** Shows × at the end, which calls this, e.g. to hide the banner. */
	onClose?: () => void;
	/** The × button's name. Defaults to "Dismiss summary". */
	closeLabel?: string;
};

/**
 * A summary written by Intercept's AI, marked by its sparkle: one line, the headline in bold then the summary, cut off
 * with an ellipsis (the full text for screen readers), then its sources and freshness, and an optional ×. Hovering it
 * names it in a tooltip ("AI clinical summary"). With `onOpen` the whole banner is one click target, except ×.
 *
 * Figma: [intercept.ds › AI clinical summary banner](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1497-14439)
 */
function AiClinicalSummaryBanner({
	label = "AI clinical summary",
	title,
	children,
	source,
	onOpen,
	openLabel = "Ask Intercept Live for more",
	onClose,
	closeLabel = "Dismiss summary",
	className,
	...props
}: AiClinicalSummaryBannerProps) {
	const tooltip = usePointerTooltip();
	const content = (
		<>
			<AiSparkleIcon aria-hidden='true' className='size-4 shrink-0' />
			<span className='min-w-0 flex-1 truncate text-sm text-foreground'>
				{title ? <span className='font-bold'>{title}: </span> : null}
				{children}
			</span>
		</>
	);

	const banner = (
		<section
			data-slot='ai-clinical-summary-banner'
			aria-label={label}
			className={cn(
				"relative flex items-center gap-2 rounded-lg border border-tone-accent-muted bg-tone-accent-subtle px-2.5 py-1 text-left",
				// The open target's hover and focus show on the whole banner.
				onOpen &&
					"transition-colors duration-160 ease-out has-[[data-slot=ai-clinical-summary-banner-open]:hover]:border-tone-accent has-[[data-slot=ai-clinical-summary-banner-open]:hover]:bg-tone-accent-muted has-[[data-slot=ai-clinical-summary-banner-open]:focus-visible]:ring-2 has-[[data-slot=ai-clinical-summary-banner-open]:focus-visible]:ring-ring has-[[data-slot=ai-clinical-summary-banner-open]:focus-visible]:ring-offset-2 motion-reduce:transition-none",
				className,
			)}
			{...props}
			{...tooltip.handlers(props)}
		>
			{/* Where the tooltip points: a 0×0 anchor under the pointer, moved as it moves (at the sparkle for the keyboard). */}
			<TooltipTrigger asChild>
				<span ref={tooltip.anchorRef} aria-hidden='true' className='pointer-events-none absolute top-0 left-4 size-0' />
			</TooltipTrigger>
			{onOpen ? (
				// Its hit area covers the banner (`after:inset-0`), so a click anywhere opens it; × sits above it.
				<button
					type='button'
					data-slot='ai-clinical-summary-banner-open'
					onClick={onOpen}
					className="flex min-w-0 flex-1 items-center gap-[9px] text-left outline-none after:absolute after:inset-0 after:rounded-lg after:content-['']"
				>
					{content}
					<span className='sr-only'>. {openLabel}.</span>
				</button>
			) : (
				<div className='flex min-w-0 flex-1 items-center gap-[9px]'>{content}</div>
			)}

			{source ? (
				<span className='flex shrink-0 items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground'>
					<GitBranchIcon aria-hidden='true' className='size-3 text-icon-muted' />
					{source}
				</span>
			) : null}

			{onClose ? (
				<Button
					variant='ghost'
					size='icon-sm'
					onClick={onClose}
					aria-label={closeLabel}
					className='relative shrink-0 opacity-60 hover:opacity-100 focus-visible:opacity-100'
				>
					<XIcon aria-hidden='true' />
				</Button>
			) : null}
		</section>
	);

	return (
		// The banner names itself on hover, since nothing on it says "AI clinical summary" any more: after a short wait, a
		// tooltip with an arrow that follows the pointer. Its own provider, so it works on any page; the trigger is the
		// anchor, which Radix tracks every frame (`updatePositionStrategy='always'`).
		<TooltipProvider>
			<Tooltip open={tooltip.open} onOpenChange={(open) => (open ? undefined : tooltip.dismiss())}>
				{banner}
				<TooltipContent side='top' arrow updatePositionStrategy='always' sideOffset={8} onEscapeKeyDown={tooltip.close}>
					{label}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

type PointerHandlers = Pick<
	React.ComponentProps<"section">,
	"onPointerEnter" | "onPointerMove" | "onPointerLeave" | "onPointerDown" | "onFocus" | "onBlur"
>;

/**
 * A tooltip that follows the pointer: it opens `motionDelay.tooltip` after the mouse comes over the element, at the
 * pointer, and moves with it; leaving or pressing closes it. Keyboard focus that shows a ring opens it at once, at the
 * anchor's resting place. `handlers(own)` wraps the element's own handlers.
 *
 * Radix closes a tooltip when anything around its trigger scrolls, and a trackpad's leftover momentum scrolls the page
 * right as the tooltip opens: it flashed and was gone until the mouse left and came back. This one follows the pointer,
 * so while the mouse is on the element, Radix's closes (`dismiss`) are ignored; a scroll puts the anchor back under the
 * pointer, or closes the tooltip if the element has scrolled out from under it. Escape still closes it (`close`).
 */
function usePointerTooltip() {
	const [open, setOpen] = React.useState(false);
	const anchorRef = React.useRef<HTMLSpanElement>(null);
	const timer = React.useRef<number | undefined>(undefined);
	// The element under the mouse and where the pointer is, in the viewport, while the mouse is on it.
	const hovered = React.useRef<HTMLElement | null>(null);
	const pointer = React.useRef({ x: 0, y: 0 });
	React.useEffect(() => () => window.clearTimeout(timer.current), []);
	const close = React.useCallback(() => {
		window.clearTimeout(timer.current);
		setOpen(false);
	}, []);
	const dismiss = React.useCallback(() => {
		if (!hovered.current) close();
	}, [close]);
	// Puts the anchor under the pointer, relative to the element.
	const place = React.useCallback(() => {
		const anchor = anchorRef.current;
		const element = hovered.current;
		if (!anchor || !element) return;
		const box = element.getBoundingClientRect();
		anchor.style.left = `${pointer.current.x - box.left}px`;
		anchor.style.top = `${pointer.current.y - box.top}px`;
	}, []);
	React.useEffect(() => {
		if (!open) return;
		const onScroll = () => {
			const element = hovered.current;
			if (!element) return;
			const box = element.getBoundingClientRect();
			const { x, y } = pointer.current;
			if (x < box.left || x > box.right || y < box.top || y > box.bottom) {
				hovered.current = null;
				close();
			} else place();
		};
		window.addEventListener("scroll", onScroll, { capture: true, passive: true });
		return () => window.removeEventListener("scroll", onScroll, { capture: true });
	}, [open, close, place]);
	const moveTo = (event: React.PointerEvent<HTMLElement>) => {
		hovered.current = event.currentTarget;
		pointer.current = { x: event.clientX, y: event.clientY };
		place();
	};
	const handlers = (own: PointerHandlers): PointerHandlers => ({
		onPointerEnter: (event) => {
			own.onPointerEnter?.(event);
			if (event.pointerType !== "mouse") return;
			moveTo(event);
			window.clearTimeout(timer.current);
			timer.current = window.setTimeout(() => setOpen(true), motionDelay.tooltip * 1000);
		},
		onPointerMove: (event) => {
			own.onPointerMove?.(event);
			if (event.pointerType === "mouse") moveTo(event);
		},
		onPointerLeave: (event) => {
			own.onPointerLeave?.(event);
			hovered.current = null;
			close();
		},
		onPointerDown: (event) => {
			own.onPointerDown?.(event);
			close();
		},
		onFocus: (event) => {
			own.onFocus?.(event);
			if (!(event.target instanceof HTMLElement) || !event.target.matches(":focus-visible")) return;
			anchorRef.current?.style.removeProperty("left");
			anchorRef.current?.style.removeProperty("top");
			setOpen(true);
		},
		onBlur: (event) => {
			own.onBlur?.(event);
			close();
		},
	});
	return { open, close, dismiss, anchorRef, handlers };
}

export { AiClinicalSummaryBanner, type AiClinicalSummaryBannerProps };
