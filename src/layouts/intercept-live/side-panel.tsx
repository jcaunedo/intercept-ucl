import * as React from "react";
import { createPortal } from "react-dom";
import { XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import { Typography } from "@/components/typography/typography";
import { enterTransition, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

// A panel beside the canvas, for the shell's side tools: Ask Intercept Live and the patient list on the left, the
// Monitoring live feed on the right. Figma draws only the chat (intercept.ds `Chat`, `1200:1431`; Intercept-Live "Chat
// open", `129:14814`); the other panels follow it.

/** A side panel's default width, Figma's chat width; the resize handle keeps it between the min and max. */
const sidePanelWidth = { default: 400, min: 320, max: 720 } as const;

// Keyboard steps on the resize handle: arrows move 16px, with Shift 64px.
const RESIZE_STEP = 16;
const RESIZE_STEP_LARGE = 64;

const clampWidth = (width: number) => Math.round(Math.min(sidePanelWidth.max, Math.max(sidePanelWidth.min, width)));

type SidePanelSide = "left" | "right";

/**
 * The edge between a panel and the canvas: drag it to resize the panel, double-click to reset it. A focusable
 * vertical separator, so the arrow keys (Shift for bigger steps), Home and End resize it from the keyboard: → widens a
 * left panel and ← a right one, toward the canvas either way. A 2px `primary` line shows while it's hovered, dragged
 * or focused.
 */
function ResizeHandle({
	side,
	label,
	width,
	onWidthChange,
}: {
	side: SidePanelSide;
	label: string;
	width: number;
	onWidthChange: (width: number) => void;
}) {
	const drag = React.useRef<{ startX: number; startWidth: number } | null>(null);
	const [dragging, setDragging] = React.useState(false);
	// Toward the canvas widens the panel: right for a left panel, left for a right one.
	const direction = side === "left" ? 1 : -1;

	const setDrag = (next: boolean) => {
		setDragging(next);
		// Keep the resize cursor and stop text selection anywhere on the page while dragging.
		document.body.style.cursor = next ? "col-resize" : "";
		document.body.style.userSelect = next ? "none" : "";
	};

	return (
		<div
			role='separator'
			aria-orientation='vertical'
			aria-label={label}
			aria-valuenow={width}
			aria-valuemin={sidePanelWidth.min}
			aria-valuemax={sidePanelWidth.max}
			tabIndex={0}
			data-dragging={dragging ? "" : undefined}
			onPointerDown={(event) => {
				if (event.button !== 0) return;
				event.preventDefault();
				event.currentTarget.setPointerCapture(event.pointerId);
				drag.current = { startX: event.clientX, startWidth: width };
				setDrag(true);
			}}
			onPointerMove={(event) => {
				if (!drag.current) return;
				onWidthChange(clampWidth(drag.current.startWidth + (event.clientX - drag.current.startX) * direction));
			}}
			onPointerUp={(event) => {
				if (!drag.current) return;
				event.currentTarget.releasePointerCapture(event.pointerId);
				drag.current = null;
				setDrag(false);
			}}
			onPointerCancel={() => {
				drag.current = null;
				setDrag(false);
			}}
			onDoubleClick={() => onWidthChange(sidePanelWidth.default)}
			onKeyDown={(event) => {
				const step = (event.shiftKey ? RESIZE_STEP_LARGE : RESIZE_STEP) * direction;
				const next =
					event.key === "ArrowRight"
						? width + step
						: event.key === "ArrowLeft"
							? width - step
							: event.key === "Home"
								? sidePanelWidth.min
								: event.key === "End"
									? sidePanelWidth.max
									: null;
				if (next === null) return;
				event.preventDefault();
				onWidthChange(clampWidth(next));
			}}
			// 8px to grab, flush with the panel's edge on the canvas side (the panel clips anything past it); the line is its
			// outer 2px.
			className={cn(
				"group/resize absolute inset-y-0 z-10 w-2 cursor-col-resize touch-none outline-none",
				side === "left" ? "right-0" : "left-0",
			)}
		>
			<span
				aria-hidden='true'
				className={cn(
					"absolute inset-y-0 w-0.5 bg-primary opacity-0 transition-opacity duration-160 ease-out group-hover/resize:opacity-100 group-focus-visible/resize:opacity-100 group-data-[dragging]/resize:opacity-100 motion-reduce:transition-none",
					side === "left" ? "right-0" : "left-0",
				)}
			/>
		</div>
	);
}

/**
 * A resizable panel beside the canvas, 400px wide by default, with a title and a close button over its content. It
 * slides open by growing its width, as the Sidebar does (`enterTransition`), so the page narrows beside it instead of
 * being covered; instant under reduced motion. Its edge on the canvas side resizes it (`width` / `onWidthChange`,
 * 320–720px), following the pointer without animation. Focus moves to its title when it opens; Escape inside it, or
 * the close button, closes it. `className` styles its edge (e.g. a card edge or a border).
 */
function SidePanel({
	id,
	side,
	title,
	open,
	onOpenChange,
	width,
	onWidthChange,
	description,
	className,
	children,
}: {
	/** Names the panel's parts (`<id>-title`), and the panel itself, for a trigger's `aria-controls`. */
	id: string;
	side: SidePanelSide;
	title: string;
	/** A line under the title, e.g. what the panel is for. */
	description?: React.ReactNode;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	width: number;
	onWidthChange: (width: number) => void;
	className?: string;
	children: React.ReactNode;
}) {
	const { resolve } = useMotionPreference();
	const headingRef = React.useRef<HTMLHeadingElement>(null);
	// Open and done sliding in. From then on a width change is a resize: it applies at once.
	const [settled, setSettled] = React.useState(false);
	React.useEffect(() => {
		if (!open) setSettled(false);
	}, [open]);

	return (
		<AnimatePresence initial={false}>
			{open ? (
				<motion.aside
					key={id}
					id={id}
					aria-labelledby={`${id}-title`}
					initial={{ width: 0 }}
					animate={{ width }}
					exit={{ width: 0, transition: resolve(enterTransition) }}
					// The open slide animates; a resize follows the pointer or key at once.
					transition={settled ? { duration: 0 } : resolve(enterTransition)}
					// Focus moves into the panel once it's open, so keyboard and screen reader users land in it.
					onAnimationComplete={() => {
						if (settled) return;
						setSettled(true);
						headingRef.current?.focus();
					}}
					onKeyDown={(event) => {
						if (event.key === "Escape") onOpenChange(false);
					}}
					className={cn("relative h-full shrink-0 overflow-hidden bg-background", className)}
				>
					{/* At the panel's width, so the content doesn't reflow while the panel opens or closes. A right panel's
					    content keeps to its right edge, so it slides in with the edge. */}
					<div className={cn("absolute inset-y-0 flex flex-col", side === "left" ? "left-0" : "right-0")} style={{ width }}>
						{/* intercept.ds Chat's header (`1200:1397`): every side panel follows it. 14px on top centers its row with the app header's. */}
						<div className='flex shrink-0 flex-col gap-4 px-5 pt-[14px] pb-4'>
							<div className='flex items-center justify-between gap-2'>
								<Typography
									ref={headingRef}
									id={`${id}-title`}
									as='h2'
									size='base'
									weight='medium'
									tabIndex={-1}
									className='outline-none'
								>
									{title}
								</Typography>
								<Button
									variant='ghost'
									size='icon-sm'
									aria-label={`Close ${title}`}
									onClick={() => onOpenChange(false)}
									className='rounded-button-md'
								>
									<XIcon />
								</Button>
							</div>
							{description ? <p className='pr-10 text-sm text-foreground'>{description}</p> : null}
						</div>
						{children}
					</div>
					<ResizeHandle side={side} label={`Resize ${title}`} width={width} onWidthChange={onWidthChange} />
				</motion.aside>
			) : null}
		</AnimatePresence>
	);
}

/* -------------------------------------------------------------------------- */
/* Page panel slot                                                            */
/* -------------------------------------------------------------------------- */

// The shell's place right of the canvas. A page renders its own side panel into it (PagePanel), so the panel keeps the
// page's state while it sits outside the page's scrolling canvas.
const PagePanelSlotContext = React.createContext<HTMLElement | null>(null);

/** Where pages' side panels go: provide it with the slot element, which the shell places right of the canvas. */
const PagePanelSlotProvider = PagePanelSlotContext.Provider;

/** Renders its children (a right-hand SidePanel) in the shell's page panel slot. Nothing renders outside a shell. */
function PagePanel({ children }: { children: React.ReactNode }) {
	const slot = React.useContext(PagePanelSlotContext);
	return slot ? createPortal(children, slot) : null;
}

export { PagePanel, PagePanelSlotProvider, SidePanel, sidePanelWidth, type SidePanelSide };
