import * as React from "react";

/**
 * A filled rounded square, smaller than lucide's `square` box: ChatComposer's Stop. Fills with `currentColor`.
 *
 * Figma: [intercept.ds › square-filled](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1682-15)
 */
function SquareFilledIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={24}
			height={24}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
			{...props}
		>
			<rect x="4" y="4" width="16" height="16" rx="2.4" />
		</svg>
	);
}

export { SquareFilledIcon };
