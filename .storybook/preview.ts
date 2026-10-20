import type { Preview } from "@storybook/react-vite";
import "../src/styles/globals.css";

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		options: {
			storySort: {
				order: [
					"Introduction",
					"Foundations",
					["Colors", "Typography", "Spacing & Radius", "Breakpoints", "Motion"],
					"Guidelines",
					[
						"Typography",
						"Motion",
						"Accessibility",
						"Content & Voice",
						"Design Contracts",
						"Working with UCL",
					],
				],
			},
		},
	},
};

export default preview;
