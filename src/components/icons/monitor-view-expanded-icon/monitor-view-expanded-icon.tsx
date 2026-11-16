import * as React from "react";

/**
 * A tall rounded rectangle: the full monitor view (every waveform lane). The tallest of the three monitor-view icons, with
 * MonitorViewMinimizedIcon and MonitorViewMinimalIcon. Filled with `currentColor`, so it follows its button's color.
 *
 * Figma: [archielabs.ds › full-view](https://www.figma.com/design/w8YHn6HqwgvKEyFOYkDFmW/archielabs.ds?node-id=6234-10235)
 */
function MonitorViewExpandedIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
			<path d="M20 4C20 3.44771 19.5523 3 19 3H5C4.44772 3 4 3.44772 4 4V20C4 20.5523 4.44771 21 5 21H19C19.5523 21 20 20.5523 20 20V4ZM22 20C22 21.6569 20.6569 23 19 23H5C3.34315 23 2 21.6569 2 20V4C2 2.34315 3.34315 1 5 1H19C20.6569 1 22 2.34315 22 4V20Z" fill="currentColor" />
		</svg>
	);
}

export { MonitorViewExpandedIcon };
