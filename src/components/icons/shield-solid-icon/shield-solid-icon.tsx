import * as React from "react";

/**
 * Solid shield icon: the Active-state counterpart of lucide's `shield` in a SidebarMenuButton. Fills with
 * `currentColor`, so it takes the item's color.
 *
 * Figma: [archielabs.ds › shield-solid](https://www.figma.com/design/w8YHn6HqwgvKEyFOYkDFmW/archielabs.ds?node-id=6160-10569)
 */
function ShieldSolidIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={24}
			height={24}
			viewBox="0 0 24 24.0028"
			fill="currentColor"
			aria-hidden="true"
			{...props}
		>
			<path d="M21 13.0005C21 15.7646 20.0209 17.8893 18.4463 19.5049C16.8988 21.0925 14.8204 22.1446 12.6689 22.8945C12.6663 22.8954 12.6638 22.8966 12.6611 22.8975C12.233 23.0425 11.7688 23.0373 11.3437 22.8848C9.18642 22.1398 7.10498 21.0907 5.55566 19.5039C3.9792 17.8893 3.00001 15.7645 3 13.0005V6.00049C3 5.47006 3.21088 4.9615 3.58594 4.58643C3.96101 4.21135 4.46957 4.00049 5 4.00049C6.67637 4.00049 8.95154 2.95166 10.582 1.52734C10.5848 1.52493 10.5875 1.5224 10.5903 1.52002C10.9833 1.18432 11.4832 1 12 1C12.4845 1 12.9539 1.16217 13.3345 1.45898L13.4097 1.52002L13.418 1.52783C15.0575 2.96124 17.3229 4.00049 19 4.00049C19.5304 4.00049 20.039 4.21135 20.4141 4.58643C20.7891 4.9615 21 5.47007 21 6.00049V13.0005Z" />
		</svg>
	);
}

export { ShieldSolidIcon };
