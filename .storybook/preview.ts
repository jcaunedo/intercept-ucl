import type { Preview } from "@storybook/react-vite";
import "../src/styles/globals.css";

import { theme } from "./theme";

const preview: Preview = {
	parameters: {
		// `source.dark` renders <Source> blocks on a dark code surface, to match the dark docs theme.
		docs: { theme, source: { dark: true } },
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
