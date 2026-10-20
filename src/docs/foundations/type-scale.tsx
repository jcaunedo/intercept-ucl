import * as React from "react";

import { Typography, typographyHeadings, typographyVariants } from "@/components/typography/typography";

/**
 * Docs-only blocks for the Foundations/Typography page. Sizes, weights and families come from CSS passed in as raw
 * text by the MDX page (Tailwind's default theme, then `src/styles/theme.css` on top, so project tokens win); whether
 * `Typography` accepts each one, and the heading definitions, come from the component itself.
 */

const SAMPLE = "Almost before we knew it, we had left the ground";

/** `name: value` pairs for every `--<prefix>-*` declaration in `css`, e.g. `text-sm` → `0.875rem`. Later ones win. */
function readTokens(css: string, prefix: string) {
	const tokens = new Map<string, string>();
	for (const match of css.matchAll(new RegExp(`--${prefix}-([\\w-]+):\\s*([^;]+);`, "g"))) {
		tokens.set(match[1], match[2].replace(/\s+/g, " ").trim());
	}
	return tokens;
}

const remToPx = (rem: string) => parseFloat(rem) * 16;

/**
 * A `--text-*--line-height` value in px. Tailwind writes it as a ratio (`calc(1.5 / 1)`, `1`); a Figma-synced token
 * may be an absolute length (`1.5rem`, `24px`).
 */
function lineHeightPx(lineHeight: string | undefined, fontSizePx: number) {
	if (!lineHeight) return undefined;
	if (lineHeight.endsWith("rem")) return remToPx(lineHeight);
	if (lineHeight.endsWith("px")) return parseFloat(lineHeight);
	const ratio = lineHeight.match(/calc\(\s*([\d.]+)\s*\/\s*([\d.]+)\s*\)/);
	return fontSizePx * (ratio ? Number(ratio[1]) / Number(ratio[2]) : Number(lineHeight));
}

const formatPx = (px: number | undefined) => (px === undefined ? "–" : `${Math.round(px * 100) / 100}px`);

type VariantOptions = Parameters<typeof typographyVariants>[0];

/** The classes `typographyVariants` adds for one axis value, or `undefined` when it doesn't know the value. */
function variantClasses(axis: "size" | "weight", value: string, expectedClass: string) {
	const classes = typographyVariants({ [axis]: value } as VariantOptions).split(" ");
	if (!classes.includes(expectedClass)) return undefined;
	// Drop the other axis's default (`font-normal` for a size, `font-sans text-base` for a weight).
	const defaults = typographyVariants({} as VariantOptions).split(" ");
	return classes.filter((name) => name !== expectedClass && !defaults.includes(name));
}

function NotInTypography() {
	return (
		<span className='text-muted-foreground'>
			Not in <code>Typography</code>
		</span>
	);
}

const cell = "border-b border-border py-3 pr-4 align-middle";
const head = `${cell} text-xs font-semibold text-muted-foreground`;

/**
 * One row per `--text-*` size: its token, px size / line height, what `Typography`'s `size` adds on top (font family,
 * tracking), and a sample.
 */
function TypeScale({ css }: { css: string }) {
	const text = readTokens(css, "text");
	// Skip `--text-*--line-height` and non-size tokens such as Tailwind's `--text-shadow-*`.
	const sizes = [...text].filter(([name, value]) => !name.includes("--") && /^[\d.]+rem$/.test(value));
	return (
		<table className='sb-unstyled w-full border-collapse text-left text-sm' style={{ tableLayout: "fixed" }}>
			<colgroup>
				<col style={{ width: 72 }} />
				<col style={{ width: 160 }} />
				<col style={{ width: 240 }} />
				<col />
			</colgroup>
			<thead>
				<tr>
					<th className={head}>Size</th>
					<th className={head}>Font size / line height</th>
					<th className={head}>
						<code>Typography</code> size
					</th>
					<th className={head}>Sample</th>
				</tr>
			</thead>
			<tbody>
				{sizes.map(([name, size]) => {
					const extra = variantClasses("size", name, `text-${name}`);
					const sizePx = remToPx(size);
					const linePx = lineHeightPx(text.get(`${name}--line-height`), sizePx);
					return (
						<tr key={name}>
							<td className={`${cell} font-mono`}>{name}</td>
							<td className={`${cell} font-mono whitespace-nowrap text-muted-foreground`}>
								{formatPx(sizePx)} / {formatPx(linePx)}
							</td>
							<td className={cell}>
								{extra ? (
									<span className='font-mono text-xs text-muted-foreground'>
										<span className='text-primary'>size="{name}"</span>
										{extra.length > 0 && ` · ${extra.join(" ")}`}
									</span>
								) : (
									<NotInTypography />
								)}
							</td>
							<td className={`${cell} text-foreground`}>
								<span
									className={`block truncate ${extra?.join(" ") ?? ""}`}
									// Size tokens live in `@theme`, not as `:root` variables, so use the values read from the CSS.
									style={{ fontSize: `${sizePx}px`, lineHeight: linePx ? `${linePx}px` : undefined }}
								>
									{SAMPLE}
								</span>
							</td>
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}

/** `Typography` names the 400 weight `regular`; every other weight keeps its token name. */
const typographyWeightName = (token: string) => (token === "normal" ? "regular" : token);

/** One row per `--font-weight-*` token, with the `Typography` `weight` that sets it, if any. */
function FontWeights({ css }: { css: string }) {
	const weights = readTokens(css, "font-weight");
	return (
		<table className='sb-unstyled w-full border-collapse text-left text-sm' style={{ tableLayout: "fixed" }}>
			<colgroup>
				<col style={{ width: 120 }} />
				<col style={{ width: 112 }} />
				<col style={{ width: 240 }} />
				<col />
			</colgroup>
			<thead>
				<tr>
					<th className={head}>Weight</th>
					<th className={head}>Value</th>
					<th className={head}>
						<code>Typography</code> weight
					</th>
					<th className={head}>Sample</th>
				</tr>
			</thead>
			<tbody>
				{[...weights].map(([name, value]) => {
					const prop = typographyWeightName(name);
					const accepted = variantClasses("weight", prop, `font-${name}`) !== undefined;
					return (
						<tr key={name}>
							<td className={`${cell} font-mono`}>{name}</td>
							<td className={`${cell} font-mono text-muted-foreground`}>{value}</td>
							<td className={cell}>
								{accepted ? (
									<span className='font-mono text-xs text-primary'>weight="{prop}"</span>
								) : (
									<NotInTypography />
								)}
							</td>
							<td className={`${cell} truncate text-base text-foreground`} style={{ fontWeight: Number(value) }}>
								{SAMPLE}
							</td>
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}

/** The `--font-sans`, `--font-display` and `--font-mono` stacks, each with a sample set in it. */
function FontFamilies({ css }: { css: string }) {
	const families = readTokens(css, "font");
	return (
		<table className='sb-unstyled w-full border-collapse text-left text-sm' style={{ tableLayout: "fixed" }}>
			<colgroup>
				<col style={{ width: 120 }} />
				<col />
			</colgroup>
			<tbody>
				{["sans", "display", "mono"].map((name) => (
					<tr key={name}>
						<td className={`${cell} font-mono align-top`}>font-{name}</td>
						<td className={cell}>
							<div className={`font-${name} text-xl text-foreground`}>{SAMPLE}</div>
							<div className='mt-1 font-mono text-xs text-muted-foreground'>{families.get(name)}</div>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

/** Each `h1`–`h4` rendered by `Typography` with no `size`/`weight`, so it shows the heading definitions as they are. */
function HeadingDefinitions() {
	return (
		<div className='sb-unstyled flex flex-col gap-4'>
			{Object.entries(typographyHeadings).map(([element, { size, weight }]) => (
				<div key={element} className='flex items-baseline gap-6 border-b border-border pb-4'>
					<div className='w-44 shrink-0 font-mono text-xs text-muted-foreground'>
						{element} · {size} {weight}
					</div>
					<Typography as={element as React.ElementType} className='min-w-0 truncate text-foreground'>
						{SAMPLE}
					</Typography>
				</div>
			))}
			<div className='flex items-baseline gap-6'>
				<div className='w-44 shrink-0 font-mono text-xs text-muted-foreground'>p · base regular</div>
				<Typography className='min-w-0 truncate text-foreground'>{SAMPLE}</Typography>
			</div>
		</div>
	);
}

export { TypeScale, FontWeights, FontFamilies, HeadingDefinitions };
