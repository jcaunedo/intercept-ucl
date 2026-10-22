import * as React from "react";

/**
 * Solid square-activity icon: the Active-state counterpart of lucide's `square-activity` in a SidebarMenuButton. Figma: archielabs.ds
 * `square-activity-solid` (node 6158:10433). Fills with `currentColor`, so it takes the item's color.
 */
function SquareActivitySolidIcon(props: React.SVGProps<SVGSVGElement>) {
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
			<path d="M19 2C20.6569 2 22 3.34315 22 5V19C22 20.6569 20.6569 22 19 22H5C3.34315 22 2 20.6569 2 19V5C2 3.34315 3.34315 2 5 2H19ZM11.0918 6.00391C10.6511 5.96345 10.2356 6.21802 10.0713 6.62891L8.32324 11H7C6.44772 11 6 11.4477 6 12C6 12.5523 6.44772 13 7 13H9C9.4089 13 9.77685 12.7507 9.92871 12.3711L10.6787 10.4941L12.0195 17.1963C12.1064 17.63 12.4677 17.9555 12.9082 17.9961C13.3489 18.0366 13.7644 17.782 13.9287 17.3711L15.6768 13H17C17.5523 13 18 12.5523 18 12C18 11.4477 17.5523 11 17 11H15C14.6424 11 14.3164 11.1905 14.1387 11.4922L14.0713 11.6289L13.3203 13.5049L11.9805 6.80371C11.8936 6.36998 11.5323 6.0445 11.0918 6.00391Z" />
		</svg>
	);
}

export { SquareActivitySolidIcon };
