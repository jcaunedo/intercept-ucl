import * as React from "react";

/**
 * Solid inbox icon: the Active-state counterpart of lucide's `inbox` in a SidebarMenuButton. Fills with `currentColor`,
 * so it takes the item's color.
 *
 * Figma: [archielabs.ds › inbox-solid](https://www.figma.com/design/w8YHn6HqwgvKEyFOYkDFmW/archielabs.ds?node-id=6372-10238)
 */
function InboxSolidIcon(props: React.SVGProps<SVGSVGElement>) {
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
			<path d="M7.46484 13L9.16797 15.5547C9.35343 15.8329 9.66565 16 10 16H14C14.3344 16 14.6466 15.8329 14.832 15.5547L16.5352 13H23V18C23 18.7957 22.6837 19.5585 22.1211 20.1211C21.5585 20.6837 20.7957 21 20 21H4C3.20435 21 2.44152 20.6837 1.87891 20.1211C1.3163 19.5585 1 18.7956 1 18V13H7.46484Z" />
			<path d="M16.9688 3.00781C17.4539 3.04183 17.9247 3.19282 18.3398 3.4502C18.8132 3.74371 19.195 4.16369 19.4434 4.66211L22.6182 11H16C15.7073 11 15.4318 11.1282 15.2432 11.3467L15.168 11.4453L13.4648 14H10.5352L8.83203 11.4453C8.64657 11.1671 8.33435 11 8 11H1.38184L4.55566 4.66211C4.80407 4.16352 5.18671 3.74378 5.66016 3.4502C6.13438 3.15617 6.68128 3.00034 7.23926 3H16.7607L16.9688 3.00781Z" />
		</svg>
	);
}

export { InboxSolidIcon };
