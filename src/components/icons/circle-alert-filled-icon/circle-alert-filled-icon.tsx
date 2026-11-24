import * as React from "react";

/**
 * A filled circle with an exclamation mark cut out of it (what's behind shows through the mark), the solid form of
 * lucide's `circle-alert`: an urgent conversation in the Messages list. Fills with `currentColor`.
 *
 * Figma: [intercept.ds › circle-alert-filled](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1643-49)
 */
function CircleAlertFilledIcon(props: React.SVGProps<SVGSVGElement>) {
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
				d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 7C12.5523 7 13 7.44772 13 8V12C13 12.5523 12.5523 13 12 13C11.4477 13 11 12.5523 11 12V8C11 7.44772 11.4477 7 12 7ZM11 16C11 15.4477 11.4477 15 12 15H12.01C12.5623 15 13.01 15.4477 13.01 16C13.01 16.5523 12.5623 17 12.01 17H12C11.4477 17 11 16.5523 11 16Z"
			/>
		</svg>
	);
}

export { CircleAlertFilledIcon };
