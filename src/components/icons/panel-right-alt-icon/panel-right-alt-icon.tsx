import * as React from "react";

/**
 * A rounded square with a solid bar along its right side: a panel on the right that's open (lucide `panel-right` is
 * the closed one). Fills with `currentColor`.
 *
 * Figma: [intercept.ds › panel-right-alt](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1727-569)
 */
function PanelRightAltIcon(props: React.SVGProps<SVGSVGElement>) {
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
			<path d="M20 5C20 4.44771 19.5523 4 19 4H5C4.44772 4 4 4.44772 4 5V19C4 19.5523 4.44771 20 5 20H19C19.5523 20 20 19.5523 20 19V5ZM15 17V7C15 6.44772 15.4477 6 16 6C16.5523 6 17 6.44772 17 7V17C17 17.5523 16.5523 18 16 18C15.4477 18 15 17.5523 15 17ZM22 19C22 20.6569 20.6569 22 19 22H5C3.34315 22 2 20.6569 2 19V5C2 3.34315 3.34315 2 5 2H19C20.6569 2 22 3.34315 22 5V19Z" />
		</svg>
	);
}

export { PanelRightAltIcon };
