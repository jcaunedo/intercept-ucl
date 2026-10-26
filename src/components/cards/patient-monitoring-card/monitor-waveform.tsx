"use client";

import * as React from "react";

import { useMotionPreference } from "@/lib/motion";
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
 * A live waveform lane: the trace sweeps left to right and redraws over itself behind a short erase gap, like a bedside
 * monitor. Colored by `currentColor`. Under reduced motion it draws one still screen. Decorative: the numbers beside it
 * carry the values.
 */
function MonitorWaveform({ kind, rate, className, ...props }: MonitorWaveformProps) {
	const canvasRef = React.useRef<HTMLCanvasElement>(null);
	const { prefersReducedMotion } = useMotionPreference();

	React.useEffect(() => {
		const canvas = canvasRef.current;
		const context = canvas?.getContext("2d");
		if (!canvas || !context) return;

		let width = 0;
		let height = 0;
		let frame = 0;
		let x = 0;
		let time = 0;
		let previousY: number | undefined;
		let lastTimestamp: number | undefined;
		const { baseline, amplitude } = placement[kind];
		const cycleSeconds = rate ? 60 / rate : undefined;

		const valueAt = (seconds: number) => (cycleSeconds ? cycles[kind]((seconds / cycleSeconds) % 1) : 0);
		const yAt = (seconds: number) => height * baseline - valueAt(seconds) * height * amplitude;

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
			for (let px = 0; px <= width; px += 1) {
				const y = yAt(px / sweepSpeed[kind]);
				if (px === 0) context.moveTo(px, y);
				else context.lineTo(px, y);
			}
			context.stroke();
		};

		const step = (timestamp: number) => {
			const elapsed = lastTimestamp === undefined ? 0 : Math.min((timestamp - lastTimestamp) / 1000, 0.1);
			lastTimestamp = timestamp;
			const distance = elapsed * sweepSpeed[kind];

			context.beginPath();
			for (let moved = 0; moved < distance; moved += 1) {
				const advance = Math.min(1, distance - moved);
				time += advance / sweepSpeed[kind];
				const nextX = x + advance;
				const y = yAt(time);
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

		const observer = new ResizeObserver(() => {
			resize();
			drawStill();
			x = 0;
			time = 0;
			previousY = undefined;
		});
		observer.observe(canvas);
		resize();
		drawStill();
		if (!prefersReducedMotion) frame = window.requestAnimationFrame(step);

		return () => {
			window.cancelAnimationFrame(frame);
			observer.disconnect();
		};
	}, [kind, rate, prefersReducedMotion]);

	return <canvas ref={canvasRef} aria-hidden='true' className={cn("block size-full", className)} {...props} />;
}

export { MonitorWaveform, type MonitorWaveformProps, type WaveformKind };
