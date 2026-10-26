import * as React from "react";

/**
 * Solid box icon: the Active-state counterpart of lucide's `box` in a SidebarMenuButton. Fills with `currentColor`, so
 * it takes the item's color.
 *
 * Figma: [archielabs.ds › box-solid](https://www.figma.com/design/w8YHn6HqwgvKEyFOYkDFmW/archielabs.ds?node-id=6158-10399)
 */
function BoxSolidIcon(props: React.SVGProps<SVGSVGElement>) {
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
			<path d="M11 12.5576V22.8242C10.8289 22.7636 10.6624 22.6889 10.5039 22.5977L3.50391 18.5986L3.5 18.5957C3.04446 18.3327 2.66559 17.9544 2.40234 17.499C2.1392 17.0436 2.00055 16.5269 2 16.001V7.99902L2.00684 7.80176C2.02329 7.55587 2.07017 7.31357 2.14551 7.08008L11 12.5576ZM21.8535 7.08008C21.949 7.3759 21.9997 7.68563 22 7.99902V16.001C21.9995 16.5269 21.8608 17.0436 21.5977 17.499C21.3344 17.9544 20.9555 18.3327 20.5 18.5957L20.4961 18.5986L13.4961 22.5986L13.4951 22.5977C13.3368 22.6887 13.1708 22.7636 13 22.8242V12.5566L21.8535 7.08008ZM12 1.00195C12.5249 1.00195 13.0401 1.14067 13.4951 1.40234L13.4961 1.40137L20.4961 5.40137L20.5 5.4043C20.5443 5.42985 20.5871 5.45765 20.6299 5.48535L11.999 10.8232L3.36914 5.48535C3.41214 5.4575 3.4555 5.42999 3.5 5.4043L3.50391 5.40137L10.5039 1.40137C10.9591 1.13942 11.4748 1.00195 12 1.00195Z" />
		</svg>
	);
}

export { BoxSolidIcon };
