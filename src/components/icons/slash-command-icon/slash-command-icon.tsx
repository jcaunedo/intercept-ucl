import * as React from "react";

/**
 * A short slash, the commands button's icon in ChatComposer: shorter and a little heavier than lucide's `slash`, which
 * runs corner to corner. Strokes with `currentColor`.
 *
 * Figma: [intercept.ds › slash](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1643-532)
 */
function SlashCommandIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={24}
			height={24}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2.2}
			strokeLinecap="round"
			aria-hidden="true"
			{...props}
		>
			<path d="M19.27 4.73 4.73 19.27" />
		</svg>
	);
}

export { SlashCommandIcon };
