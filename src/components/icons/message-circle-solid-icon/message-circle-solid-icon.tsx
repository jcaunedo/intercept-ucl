import * as React from "react";

/**
 * Solid message-circle icon: the "message" PatientCardAlert's icon. Fills with `currentColor`, so it takes the pill's
 * label color.
 *
 * Figma: [archielabs.ds › message-circle-solid](https://www.figma.com/design/w8YHn6HqwgvKEyFOYkDFmW/archielabs.ds?node-id=6158-10412)
 */
function MessageCircleSolidIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={24}
			height={24}
			viewBox="0 0 23.0079 23.0079"
			fill="currentColor"
			aria-hidden="true"
			{...props}
		>
			<path d="M6.11896 2.9179C8.04524 1.51434 10.4095 0.844934 12.7856 1.03031C15.1618 1.21568 17.3936 2.24364 19.0789 3.92895C20.7642 5.61425 21.7922 7.84608 21.9776 10.2222C22.163 12.5984 21.4935 14.9627 20.09 16.8889C18.6864 18.8152 16.641 20.1769 14.3224 20.7285C12.1442 21.2467 9.85945 21.0181 7.83253 20.0866L2.32107 21.9549C1.96061 22.0771 1.56205 21.9841 1.29292 21.715C1.02379 21.4458 0.930774 21.0473 1.05296 20.6868L2.92125 15.1754C1.98982 13.1484 1.7612 10.8637 2.2794 8.68552C2.83103 6.36685 4.19268 4.32145 6.11896 2.9179Z" />
		</svg>
	);
}

export { MessageCircleSolidIcon };
