import * as React from "react";

/**
 * A monitor with a tall block rising from its bottom: the full monitor view (every waveform lane). Pairs with
 * MonitorViewMinimizedIcon. The outline and block take `currentColor`, so it follows its button's color.
 *
 * Figma: [archielabs.ds › monitor-view-expanded](https://www.figma.com/design/w8YHn6HqwgvKEyFOYkDFmW/archielabs.ds?node-id=6234-10235)
 */
function MonitorViewExpandedIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
			<path
				d="M20 4H4C2.89543 4 2 4.89543 2 6V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V6C22 4.89543 21.1046 4 20 4Z"
				stroke="currentColor"
				strokeWidth={2}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<rect x="5.0365" y="8.93646" width="13.9635" height="8.06354" fill="currentColor" />
		</svg>
	);
}

export { MonitorViewExpandedIcon };
