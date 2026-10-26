import * as React from "react";
import { AnimatePresence, MotionConfig, motion, type Transition } from "motion/react";

import { Button } from "@/components/buttons/button";
import * as motionSystem from "@/lib/motion";

/**
 * Docs-only blocks for the Foundations/Motion page. Values come from `@/lib/motion` itself; the descriptions are the
 * doc comments in its source files (passed in as raw text by the MDX page). Nothing here needs updating when a token
 * or preset changes.
 */

/** First paragraph of every `/** … *\/` comment that sits directly above a `const <name>` / `function <name>`. */
function readDocComments(source: string) {
	const docs = new Map<string, string>();
	for (const match of source.matchAll(/\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*(?:export\s+)?(?:const|function)\s+(\w+)/g)) {
		docs.set(match[2], cleanComment(match[1]));
	}
	return docs;
}

/** Every top-level `const <name>` / `function <name>` in a source file, in file order. */
function readDeclarations(source: string) {
	return [...source.matchAll(/^(?:export\s+)?(?:const|function)\s+(\w+)/gm)].map((match) => match[1]);
}

/** The `/** … *\/` comment above each key inside `const <objectName> = { … }`. */
function readKeyComments(source: string, objectName: string) {
	const docs = new Map<string, string>();
	const block = source.match(new RegExp(`const ${objectName} = \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? "";
	for (const match of block.matchAll(/\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*(\w+):/g)) docs.set(match[2], cleanComment(match[1]));
	return docs;
}

const cleanComment = (comment: string) =>
	comment
		.split("\n")
		.map((line) => line.replace(/^\s*\*\s?/, ""))
		.join("\n")
		.split(/\n\s*\n/)[0]
		.replace(/\s+/g, " ")
		.trim();

/** Renders `backticked` names in a comment as inline code. */
function Prose({ text }: { text: string }) {
	return <>{text.split(/`([^`]+)`/).map((part, index) => (index % 2 ? <code key={index}>{part}</code> : part))}</>;
}

const cell = "border-b border-border py-3 pr-4 align-top text-sm";
const head = "border-b border-border py-2 pr-4 text-left text-xs font-semibold text-foreground-subtle";

/** Fixed column widths (px; `undefined` takes the rest), so every table on the page lines up. */
function Table({ widths, children }: { widths: (number | undefined)[]; children: React.ReactNode }) {
	return (
		<table className='sb-unstyled w-full border-collapse' style={{ tableLayout: "fixed" }}>
			<colgroup>
				{widths.map((width, index) => (
					<col key={index} style={{ width }} />
				))}
			</colgroup>
			{children}
		</table>
	);
}

const tokenGroups = {
	motionDuration: (value: number) => `${Math.round(value * 1000)}ms`,
	motionDistance: (value: number) => `${value}px`,
	motionScale: (value: number) => `× ${value}`,
	motionRotation: (value: number) => `${value}°`,
	motionStagger: (value: number) => `${Math.round(value * 1000)}ms`,
} as const;

/** One table per token group (`motionDuration`, `motionDistance`, …): key, value, and its doc comment. */
function MotionTokens({ source, group }: { source: string; group: keyof typeof tokenGroups }) {
	const values = motionSystem[group] as Record<string, number>;
	const docs = readKeyComments(source, group);
	const format = tokenGroups[group];
	return (
		<Table widths={[240, 100, undefined]}>
			<thead>
				<tr>
					<th className={head}>Token</th>
					<th className={head}>Value</th>
					<th className={head}>Use for</th>
				</tr>
			</thead>
			<tbody>
				{Object.entries(values).map(([key, value]) => (
					<tr key={key}>
						<td className={`${cell} font-mono break-words`}>
							{group}.{key}
						</td>
						<td className={`${cell} font-mono whitespace-nowrap text-foreground-subtle`}>{format(value)}</td>
						<td className={`${cell} text-foreground`}>
							<Prose text={docs.get(key) ?? ""} />
						</td>
					</tr>
				))}
			</tbody>
		</Table>
	);
}

/** A `[x1, y1, x2, y2]` cubic-bezier, as opposed to a named or function easing. */
const isCubicBezier = (ease: Transition["ease"]): ease is [number, number, number, number] =>
	Array.isArray(ease) && ease.length === 4 && ease.every((n) => typeof n === "number");

/** A cubic-bezier easing curve, drawn in a 48px square. Curves that overshoot (y > 1) run past the top edge. */
function EasingCurve({ ease }: { ease: readonly number[] }) {
	const [x1, y1, x2, y2] = ease;
	const s = 40;
	const point = (x: number, y: number) => `${4 + x * s} ${4 + (1 - y) * s}`;
	return (
		<svg
			width='48'
			height='48'
			viewBox='0 0 48 48'
			overflow='visible'
			className='shrink-0 rounded-sm border border-border bg-muted'
		>
			<path
				d={`M${point(0, 0)} C${point(x1, y1)} ${point(x2, y2)} ${point(1, 1)}`}
				fill='none'
				stroke='currentColor'
				strokeWidth='2'
			/>
		</svg>
	);
}

/** Every exported `Transition` preset: its timing or spring settings, curve, and doc comment. */
function MotionTransitions({ source }: { source: string }) {
	const docs = readDocComments(source);
	// In source-file order: the namespace import lists its exports alphabetically.
	const transitions = readDeclarations(source)
		.filter((name) => /Transition$|Spring$/.test(name) && name in motionSystem)
		.map((name) => [name, motionSystem[name as keyof typeof motionSystem] as Transition] as const);
	return (
		<Table widths={[240, 240, undefined]}>
			<thead>
				<tr>
					<th className={head}>Preset</th>
					<th className={head}>Timing</th>
					<th className={head}>Use for</th>
				</tr>
			</thead>
			<tbody>
				{transitions.map(([name, transition]) => {
					const ease = isCubicBezier(transition.ease) ? transition.ease : undefined;
					return (
						<tr key={name}>
							<td className={`${cell} font-mono break-words`}>{name}</td>
							<td className={`${cell} text-foreground-subtle`}>
								<div className='flex items-center gap-3'>
									{ease && <EasingCurve ease={ease} />}
									<div className='font-mono text-xs whitespace-nowrap'>
										{transition.type === "spring" ? (
											<>
												<div>spring</div>
												<div>
													stiffness {transition.stiffness} · damping {transition.damping}
												</div>
											</>
										) : (
											`${Math.round((transition.duration ?? 0) * 1000)}ms`
										)}
										{ease && <div>[{ease.join(", ")}]</div>}
									</div>
								</div>
							</td>
							<td className={`${cell} text-foreground`}>
								<Prose text={docs.get(name) ?? ""} />
							</td>
						</tr>
					);
				})}
			</tbody>
		</Table>
	);
}

/**
 * Every exported name from a source file whose identifier matches `pattern`, in file order, with its doc comment. A
 * name without its own comment shares the one above it (`iconSwapReducedVariants` → `iconSwapVariants`'s, the
 * `pending*` variants → the Pending comment above `pendingLoop`).
 */
function MotionExports({ source, pattern }: { source: string; pattern: string }) {
	const comments = readDocComments(source);
	const docs = new Map<string, string>();
	let previous = "";
	for (const name of readDeclarations(source)) {
		previous = comments.get(name) ?? previous;
		docs.set(name, previous);
	}
	const names = [...docs.keys()].filter((name) => new RegExp(pattern).test(name) && name in motionSystem);
	return (
		<Table widths={[240, undefined]}>
			<thead>
				<tr>
					<th className={head}>Name</th>
					<th className={head}>Use for</th>
				</tr>
			</thead>
			<tbody>
				{names.map((name) => (
					<tr key={name}>
						<td className={`${cell} font-mono break-words`}>{name}</td>
						<td className={`${cell} text-foreground`}>
							<Prose text={docs.get(name) ?? ""} />
						</td>
					</tr>
				))}
			</tbody>
		</Table>
	);
}

const demoSurface =
	"flex h-24 w-44 items-center justify-center rounded-lg border border-border bg-card text-sm text-card-foreground";

/** Live Lift, Press, and Reveal demos built from the real patterns and variants. Honors reduced motion. */
function MotionDemos() {
	const [revealKey, setRevealKey] = React.useState(0);
	return (
		<MotionConfig reducedMotion='user'>
			<div className='sb-unstyled flex flex-wrap items-start gap-8'>
				<figure className='m-0 flex flex-col gap-2'>
					<motion.div {...motionSystem.liftPattern} className={`${demoSurface} transition-shadow hover:shadow-md`}>
						Hover me
					</motion.div>
					<figcaption className='text-xs text-foreground-subtle'>
						Lift · <code>liftPattern</code>
					</figcaption>
				</figure>
				<figure className='m-0 flex flex-col gap-2'>
					<motion.div {...motionSystem.pressPattern} className={`${demoSurface} select-none`} role='button' tabIndex={0}>
						Press and hold
					</motion.div>
					<figcaption className='text-xs text-foreground-subtle'>
						Press · <code>pressPattern</code>
					</figcaption>
				</figure>
				<figure className='m-0 flex flex-col gap-2'>
					<div className='h-24 w-44'>
						<AnimatePresence mode='wait'>
							<motion.div
								key={revealKey}
								variants={motionSystem.revealVariants}
								initial='initial'
								animate='animate'
								exit='exit'
								className={demoSurface}
							>
								New content
							</motion.div>
						</AnimatePresence>
					</div>
					<figcaption className='flex items-center gap-2 text-xs text-foreground-subtle'>
						Reveal · <code>revealVariants</code>
						<Button variant='link' size='sm' className='h-auto px-0' onClick={() => setRevealKey((key) => key + 1)}>
							Replay
						</Button>
					</figcaption>
				</figure>
			</div>
		</MotionConfig>
	);
}

export { MotionTokens, MotionTransitions, MotionExports, MotionDemos };
