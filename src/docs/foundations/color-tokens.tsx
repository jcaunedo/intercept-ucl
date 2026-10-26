import * as React from "react";

/**
 * Docs-only blocks for the Foundations/Colors page. They read `theme.css` itself (passed in as raw text by the MDX
 * page), so every color token appears here as soon as it's added: nothing to keep in sync. Semantic tokens show both
 * modes side by side; the dark swatch's fill carries the `.dark` class, which re-resolves the tokens there (DESIGN.md
 * "Semantic tokens are declared on `:root, .dark`").
 */

interface ColorGroup {
	/** The comment above the group's first token in `@theme inline`, e.g. `Surfaces, text and lines beyond shadcn's set`. */
	title: string;
	/** Tailwind color names, e.g. `background-subtle` → `bg-background-subtle`. */
	tokens: string[];
}

/** The body of the first block whose header line matches `header`, e.g. `@theme inline {` or `.dark {`. */
function readBlock(css: string, header: RegExp) {
	const match = css.match(header);
	if (!match || match.index === undefined) return "";
	const start = match.index + match[0].length;
	return css.slice(start, css.indexOf("\n}", start));
}

/** `--name: value;` declarations in a block, as a map. */
function readDeclarations(block: string) {
	return new Map([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

/** The `--color-*` tokens of `@theme inline`, grouped by the one-line comment above each run of tokens. */
function readColorGroups(css: string): ColorGroup[] {
	const groups: ColorGroup[] = [];
	let title = "";
	for (const raw of readBlock(css, /@theme inline \{/).split("\n")) {
		const line = raw.trim();
		const comment = line.match(/^\/\*\s*(.+?)\s*\*\/$/);
		if (comment) {
			title = comment[1];
			continue;
		}
		const token = line.match(/^--color-([\w-]+):/);
		if (!token) continue;
		const last = groups[groups.length - 1];
		if (last && last.title === title) last.tokens.push(token[1]);
		else groups.push({ title, tokens: [token[1]] });
	}
	return groups;
}

/** `var(--gray-950)` → `gray-950`; raw values are shortened (`oklch(0.651 0.166 268.78 / 15%)` stays as given). */
const describe = (value: string | undefined) => value?.replace(/^var\(--([\w-]+)\)$/, "$1") ?? "";

/** The sRGB hex a CSS color renders as, alpha included, by painting it on a 1×1 canvas. Works for oklch too. */
function toHex(color: string) {
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = 1;
	const context = canvas.getContext("2d");
	if (!context) return "";
	context.fillStyle = color;
	context.fillRect(0, 0, 1, 1);
	const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
	const hex = `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
	return a < 255 ? `${hex} · ${Math.round((a / 255) * 100)}%` : hex;
}

/**
 * A swatch that reports the color it actually renders, so the hex is what the token resolves to in its mode. `dark`
 * scopes `.dark` to the color fill only, so the swatch's border and labels look the same in both columns.
 */
function Swatch({ cssVar, alias, dark = false }: { cssVar: string; alias: string; dark?: boolean }) {
	const ref = React.useRef<HTMLDivElement>(null);
	const [hex, setHex] = React.useState("");
	React.useEffect(() => {
		if (ref.current) setHex(toHex(getComputedStyle(ref.current).backgroundColor));
	}, [cssVar]);
	return (
		<div className='flex items-center gap-2'>
			<div className='size-9 shrink-0 overflow-hidden rounded-md border border-border'>
				<div ref={ref} className={`size-full ${dark ? "dark" : ""}`} style={{ background: `var(--${cssVar})` }} />
			</div>
			<div className='min-w-0 font-mono text-[11px] leading-tight'>
				<div className='truncate text-foreground'>{alias}</div>
				<div className='text-foreground-subtle'>{hex}</div>
			</div>
		</div>
	);
}

const cell = "border-b border-border py-2 pr-3 align-middle";
const head = "border-b border-border py-2 pr-3 text-left text-xs font-semibold text-foreground-subtle";

/** Every semantic color token, grouped as in `theme.css`, with its light (intercept) and dark (intercept-dark) value. */
function ColorTokens({ css }: { css: string }) {
	const light = readDeclarations(readBlock(css, /:root,\s*\n\.dark \{/));
	// The `.dark {` block on its own, not the shared `:root,\n.dark {` one.
	const dark = readDeclarations(readBlock(css, /(?<!:root,)\n\.dark \{/));
	return (
		<div className='sb-unstyled flex flex-col gap-10'>
			{readColorGroups(css).map((group) => (
				<section key={group.title}>
					<h3 className='mb-2 text-base font-semibold text-foreground'>{group.title}</h3>
					<table className='w-full border-collapse text-sm' style={{ tableLayout: "fixed" }}>
						<colgroup>
							<col style={{ width: "34%" }} />
							<col style={{ width: "33%" }} />
							<col style={{ width: "33%" }} />
						</colgroup>
						<thead>
							<tr>
								<th className={head}>Token</th>
								<th className={head}>Light (intercept)</th>
								<th className={head}>Dark (intercept-dark)</th>
							</tr>
						</thead>
						<tbody>
							{group.tokens.map((token) => (
								<tr key={token}>
									<td className={`${cell} font-mono text-xs break-words text-foreground`}>{token}</td>
									<td className={cell}>
										<Swatch cssVar={token} alias={describe(light.get(token))} />
									</td>
									<td className={cell}>
										<Swatch cssVar={token} alias={describe(dark.get(token) ?? light.get(token))} dark />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>
			))}
		</div>
	);
}

/** The primitive ramps declared in `:root` (`--gray-50` … `--gray-950`), one row per family, plus white and black. */
function PrimitiveRamps({ css }: { css: string }) {
	const primitives = readDeclarations(readBlock(css, /\n:root \{/));
	const families = new Map<string, string[]>();
	for (const name of primitives.keys()) {
		const match = name.match(/^([a-z]+)-(\d+)$/);
		if (match) families.set(match[1], [...(families.get(match[1]) ?? []), match[2]]);
	}
	return (
		<div className='sb-unstyled flex flex-col gap-5'>
			<div className='flex gap-4'>
				{["white", "black"].map((name) => (
					<Swatch key={name} cssVar={name} alias={name} />
				))}
			</div>
			{[...families].map(([family, steps]) => (
				<div key={family}>
					<div className='mb-2 font-mono text-sm font-medium text-foreground'>{family}</div>
					<div className='flex gap-1'>
						{steps.map((step) => (
							<RampStep key={step} name={`${family}-${step}`} step={step} />
						))}
					</div>
				</div>
			))}
		</div>
	);
}

function RampStep({ name, step }: { name: string; step: string }) {
	const ref = React.useRef<HTMLDivElement>(null);
	const [hex, setHex] = React.useState("");
	React.useEffect(() => {
		if (ref.current) setHex(toHex(getComputedStyle(ref.current).backgroundColor));
	}, [name]);
	return (
		<div className='min-w-0 flex-1 text-center'>
			<div ref={ref} className='h-10 rounded-sm border border-border' style={{ background: `var(--${name})` }} />
			<div className='mt-1 font-mono text-xs text-foreground'>{step}</div>
			<div className='truncate font-mono text-[10px] text-foreground-subtle'>{hex}</div>
		</div>
	);
}

export { ColorTokens, PrimitiveRamps };
