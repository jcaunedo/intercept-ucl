"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { motionDuration, pendingSurfaceVariants, standardTransition, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

type WaveformKind = "ecg" | "pleth" | "abp" | "resp";

const gauss = (x: number, mu: number, sigma: number) => Math.exp(-((x - mu) ** 2) / (2 * sigma ** 2));

// One cycle of each signal, `phase` 0–1 → a value roughly in -0.3–1 (ECG) or 0–1 (the rest). Shapes are drawn to read
// as the real thing at a glance; they're illustrative, not diagnostic.
const cycles: Record<WaveformKind, (phase: number) => number> = {
	// P wave, QRS complex, T wave.
	ecg: (p) =>
		0.12 * gauss(p, 0.2, 0.025) -
		0.12 * gauss(p, 0.335, 0.008) +
		1 * gauss(p, 0.355, 0.01) -
		0.26 * gauss(p, 0.378, 0.01) +
		0.28 * gauss(p, 0.6, 0.045),
	// Rounded systolic peak, then a dicrotic notch on the way down.
	pleth: (p) => Math.min(1, 0.95 * gauss(p, 0.2, 0.08) + 0.32 * gauss(p, 0.46, 0.07)),
	// Sharper upstroke and a clearer notch than the pleth.
	abp: (p) => Math.min(1, 1 * gauss(p, 0.16, 0.055) + 0.38 * gauss(p, 0.4, 0.045) + 0.12 * gauss(p, 0.55, 0.12)),
	// Inspiration faster than expiration.
	resp: (p) => (p < 0.4 ? Math.sin((p / 0.4) * (Math.PI / 2)) : Math.cos(((p - 0.4) / 0.6) * (Math.PI / 2))) ** 2,
};

// Where the trace sits in its lane: baseline (fraction of height from the top) and amplitude (fraction of height).
const placement: Record<WaveformKind, { baseline: number; amplitude: number }> = {
	ecg: { baseline: 0.66, amplitude: 0.52 },
	pleth: { baseline: 0.86, amplitude: 0.7 },
	abp: { baseline: 0.86, amplitude: 0.7 },
	resp: { baseline: 0.82, amplitude: 0.62 },
};

// Sweep speeds in CSS px per second: a monitor's 25 mm/s for cardiac signals, 6.25 mm/s for respiration.
const sweepSpeed: Record<WaveformKind, number> = { ecg: 50, pleth: 50, abp: 50, resp: 18 };
const ERASE_GAP = 10;

type MonitorWaveformProps = React.ComponentProps<"canvas"> & {
	kind: WaveformKind;
	/** Cycles per minute: the heart rate for ECG, pleth and ABP, the respiratory rate for resp. No rate: a flat line. */
	rate?: number;
};

/**
 * Whether the element is on screen (any part of it, inside its scroll containers), from an IntersectionObserver. False
 * until the first report; true where there's no IntersectionObserver.
 */
function useOnScreen(ref: React.RefObject<Element | null>) {
	const [onScreen, setOnScreen] = React.useState(false);
	React.useEffect(() => {
		const element = ref.current;
		if (!element) return;
		if (typeof IntersectionObserver === "undefined") {
			setOnScreen(true);
			return;
		}
		const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
		observer.observe(element);
		return () => observer.disconnect();
	}, [ref]);
	return onScreen;
}

/**
 * A live waveform lane: the trace sweeps left to right and redraws over itself behind a short erase gap, like a bedside
 * monitor. Colored by `currentColor`. Decorative: the numbers beside it carry the values.
 *
 * It streams only while it's on screen (DESIGN.md "Waveforms stream on screen"): off screen it stops drawing, and each
 * time it comes into view a skeleton pulses in the lane for `motionDuration.streamConnect` (the stream connecting),
 * then the sweep fades in. A heart or breathing rate change bends the trace from where it is, without restarting it.
 * Under reduced motion the skeleton is still, and the trace is one still screen, redrawn when the rate changes.
 */
function MonitorWaveform({ kind, rate, className, ...props }: MonitorWaveformProps) {
	const canvasRef = React.useRef<HTMLCanvasElement>(null);
	const { prefersReducedMotion, resolve } = useMotionPreference();
	const onScreen = useOnScreen(canvasRef);
	const [streaming, setStreaming] = React.useState(false);
	// The sweep reads the rate each frame, so a new rate doesn't tear the canvas down.
	const rateRef = React.useRef(rate);
	rateRef.current = rate;

	React.useEffect(() => {
		if (!onScreen) {
			setStreaming(false);
			return;
		}
		const timer = window.setTimeout(() => setStreaming(true), motionDuration.streamConnect * 1000);
		return () => window.clearTimeout(timer);
	}, [onScreen]);

	// Under reduced motion the still screen is redrawn for a new rate; the sweep picks it up on its own.
	const stillRate = prefersReducedMotion ? rate : undefined;

	React.useEffect(() => {
		const canvas = canvasRef.current;
		const context = canvas?.getContext("2d");
		if (!canvas || !context || !streaming) return;

		let width = 0;
		let height = 0;
		let frame = 0;
		let x = 0;
		// Where the trace is in its cycle, 0–1. It advances by the rate at each step, so a new rate changes the pace
		// without a jump in the trace.
		let phase = 0;
		let previousY: number | undefined;
		let lastTimestamp: number | undefined;
		const { baseline, amplitude } = placement[kind];
		const speed = sweepSpeed[kind];

		const cyclesPerPixel = () => (rateRef.current ? rateRef.current / 60 / speed : 0);
		const yAt = (at: number) =>
			height * baseline - (rateRef.current ? cycles[kind](at % 1) : 0) * height * amplitude;

		const setStroke = () => {
			context.strokeStyle = getComputedStyle(canvas).color;
			context.lineWidth = 1.5;
			context.lineJoin = "round";
			context.lineCap = "round";
		};

		const resize = () => {
			const ratio = window.devicePixelRatio || 1;
			width = canvas.clientWidth;
			height = canvas.clientHeight;
			canvas.width = Math.round(width * ratio);
			canvas.height = Math.round(height * ratio);
			context.setTransform(ratio, 0, 0, ratio, 0, 0);
			setStroke();
		};

		// A full still screen: what reduced motion shows, and where the live sweep starts from.
		const drawStill = () => {
			context.clearRect(0, 0, width, height);
			context.beginPath();
			const step = cyclesPerPixel();
			for (let px = 0; px <= width; px += 1) {
				const y = yAt(px * step);
				if (px === 0) context.moveTo(px, y);
				else context.lineTo(px, y);
			}
			context.stroke();
		};

		const step = (timestamp: number) => {
			const elapsed = lastTimestamp === undefined ? 0 : Math.min((timestamp - lastTimestamp) / 1000, 0.1);
			lastTimestamp = timestamp;
			const distance = elapsed * speed;
			const perPixel = cyclesPerPixel();

			context.beginPath();
			for (let moved = 0; moved < distance; moved += 1) {
				const advance = Math.min(1, distance - moved);
				phase = (phase + advance * perPixel) % 1;
				const nextX = x + advance;
				const y = yAt(phase);
				if (nextX >= width) {
					// Wrap to the left edge without drawing a line across the screen.
					x = 0;
					previousY = undefined;
					continue;
				}
				context.clearRect(nextX, 0, ERASE_GAP, height);
				if (previousY !== undefined) {
					context.moveTo(x, previousY);
					context.lineTo(nextX, y);
				}
				x = nextX;
				previousY = y;
			}
			context.stroke();
			frame = window.requestAnimationFrame(step);
		};

		const restart = () => {
			resize();
			drawStill();
			x = 0;
			phase = 0;
			previousY = undefined;
		};

		const observer = new ResizeObserver(restart);
		observer.observe(canvas);
		// The trace color is a theme token, read once into the canvas: redraw when the theme class changes.
		const themeObserver = new MutationObserver(restart);
		themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
		resize();
		drawStill();
		if (!prefersReducedMotion) frame = window.requestAnimationFrame(step);

		return () => {
			window.cancelAnimationFrame(frame);
			observer.disconnect();
			themeObserver.disconnect();
			context.clearRect(0, 0, canvas.width, canvas.height);
		};
	}, [kind, streaming, prefersReducedMotion, stillRate]);

	return (
		<div data-slot='monitor-waveform' data-streaming={streaming || undefined} className={cn("relative size-full", className)}>
			<motion.canvas
				ref={canvasRef}
				aria-hidden='true'
				className='block size-full'
				initial={false}
				animate={{ opacity: streaming ? 1 : 0 }}
				transition={resolve(standardTransition)}
				{...(props as React.ComponentProps<typeof motion.canvas>)}
			/>
			{/* A block in the lane's color, never a flat line: a flat trace would read as asystole or apnea. */}
			<AnimatePresence initial={false}>
				{streaming ? null : (
					<motion.div
						key='skeleton'
						aria-hidden='true'
						className='absolute inset-x-2 inset-y-1 rounded-sm bg-current/15'
						variants={pendingSurfaceVariants}
						initial={false}
						animate={onScreen && !prefersReducedMotion ? "pending" : "idle"}
						exit={{ opacity: 0, transition: resolve(standardTransition) }}
					/>
				)}
			</AnimatePresence>
		</div>
	);
}

export { MonitorWaveform, type MonitorWaveformProps, type WaveformKind };
