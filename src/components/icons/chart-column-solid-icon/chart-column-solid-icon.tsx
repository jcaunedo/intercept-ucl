import * as React from "react";

/**
 * Solid chart-column icon: the Active-state counterpart of lucide's `chart-column` in a SidebarMenuButton. Fills with
 * `currentColor`, so it takes the item's color.
 *
 * Figma: [archielabs.ds › chart-column-01-solid](https://www.figma.com/design/w8YHn6HqwgvKEyFOYkDFmW/archielabs.ds?node-id=6158-10478)
 */
function ChartColumnSolidIcon(props: React.SVGProps<SVGSVGElement>) {
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
			<path d="M19 2C20.6569 2 22 3.34315 22 5V19C22 20.6569 20.6569 22 19 22H5C3.34315 22 2 20.6569 2 19V5C2 3.34315 3.34315 2 5 2H19ZM7 13C6.44772 13 6 13.4477 6 14V17C6 17.5523 6.44772 18 7 18C7.55228 18 8 17.5523 8 17V14C8 13.4477 7.55228 13 7 13ZM12 5C11.4477 5 11 5.44772 11 6V17C11 17.5523 11.4477 18 12 18C12.5523 18 13 17.5523 13 17V6C13 5.44772 12.5523 5 12 5ZM17 9C16.4477 9 16 9.44772 16 10V17C16 17.5523 16.4477 18 17 18C17.5523 18 18 17.5523 18 17V10C18 9.44772 17.5523 9 17 9Z" />
		</svg>
	);
}

export { ChartColumnSolidIcon };
