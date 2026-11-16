import * as React from "react";

/**
 * The shortest rounded rectangle: the minimal view (the Patients page's card, no monitor). With MonitorViewMinimizedIcon
 * and MonitorViewExpandedIcon. Filled with `currentColor`, so it follows its button's color.
 *
 * Figma: [archielabs.ds › minimal-view](https://www.figma.com/design/w8YHn6HqwgvKEyFOYkDFmW/archielabs.ds?node-id=6309-10267)
 */
function MonitorViewMinimalIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
			<path d="M20 8C20 7.44771 19.5523 7 19 7H5C4.44772 7 4 7.44772 4 8V16C4 16.5523 4.44771 17 5 17H19C19.5523 17 20 16.5523 20 16V8ZM22 16C22 17.6569 20.6569 19 19 19H5C3.34315 19 2 17.6569 2 16V8C2 6.34315 3.34315 5 5 5H19C20.6569 5 22 6.34315 22 8V16Z" fill="currentColor" />
		</svg>
	);
}

export { MonitorViewMinimalIcon };
