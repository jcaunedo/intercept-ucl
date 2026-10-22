import * as React from "react";

/**
 * Solid circle-user icon: the Active-state counterpart of lucide's `circle-user` in a SidebarMenuButton. Figma: archielabs.ds
 * `circle-user-solid` (node 6158:10398). Fills with `currentColor`, so it takes the item's color.
 */
function CircleUserSolidIcon(props: React.SVGProps<SVGSVGElement>) {
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
			<path d="M15 18C15.2652 18 15.5195 18.1054 15.707 18.293C15.8946 18.4805 16 18.7348 16 19V22.2461C14.7599 22.7306 13.4117 23 12 23C10.5883 23 9.2401 22.7306 8 22.2461V19C8 18.7348 8.10543 18.4805 8.29297 18.293C8.48051 18.1054 8.73478 18 9 18H15ZM12 1C18.0751 1 23 5.92487 23 12C23 15.8607 21.0091 19.2539 18 21.2168V19C18 18.2043 17.6837 17.4415 17.1211 16.8789C16.5585 16.3163 15.7956 16 15 16H9C8.20435 16 7.44151 16.3163 6.87891 16.8789C6.3163 17.4415 6 18.2043 6 19V21.2168C2.99088 19.2539 1 15.8607 1 12C1 5.92487 5.92487 1 12 1ZM12 6C9.79086 6 8 7.79086 8 10C8 12.2091 9.79086 14 12 14C14.2091 14 16 12.2091 16 10C16 7.79086 14.2091 6 12 6ZM12 8C13.1046 8 14 8.89543 14 10C14 11.1046 13.1046 12 12 12C10.8954 12 10 11.1046 10 10C10 8.89543 10.8954 8 12 8Z" />
		</svg>
	);
}

export { CircleUserSolidIcon };
