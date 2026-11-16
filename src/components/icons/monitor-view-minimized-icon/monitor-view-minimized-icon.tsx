import * as React from "react";

/**
 * A shorter rounded rectangle: the condensed monitor view (the ECG strip and numerics). Between MonitorViewExpandedIcon
 * and MonitorViewMinimalIcon. Filled with `currentColor`, so it follows its button's color.
 *
 * Figma: [archielabs.ds › condensed-view](https://www.figma.com/design/w8YHn6HqwgvKEyFOYkDFmW/archielabs.ds?node-id=6234-10234)
 */
function MonitorViewMinimizedIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
			<path d="M20 6C20 5.44771 19.5523 5 19 5H5C4.44772 5 4 5.44772 4 6V18C4 18.5523 4.44771 19 5 19H19C19.5523 19 20 18.5523 20 18V6ZM22 18C22 19.6569 20.6569 21 19 21H5C3.34315 21 2 19.6569 2 18V6C2 4.34315 3.34315 3 5 3H19C20.6569 3 22 4.34315 22 6V18Z" fill="currentColor" />
		</svg>
	);
}

export { MonitorViewMinimizedIcon };
