import * as React from "react";

/**
 * A filled circle with a down-left arrow cut out of it (what's behind shows through the arrow): unread, a message that
 * came in. Fills with `currentColor`; Figma draws it in the brand blue, `text-brand`.
 *
 * Figma: [intercept.ds › unread](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1716-18635)
 */
function UnreadIcon(props: React.SVGProps<SVGSVGElement>) {
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
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12C1 5.92487 5.92487 1 12 1ZM15.707 8.29297C15.3165 7.90244 14.6835 7.90244 14.293 8.29297L10 12.5859V9C10 8.44772 9.55229 8 9 8C8.44771 8 8 8.44772 8 9V15C8 15.5523 8.44771 16 9 16H15C15.5523 16 16 15.5523 16 15C16 14.4477 15.5523 14 15 14H11.4141L15.707 9.70703C16.0976 9.31651 16.0976 8.68349 15.707 8.29297Z"
			/>
		</svg>
	);
}

export { UnreadIcon };
