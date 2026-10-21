import type { Preview } from "@storybook/react-vite";
import * as React from "react";
import "../src/styles/globals.css";

import { theme } from "./theme";

const preview: Preview = {
	// Light = Figma "intercept" (:root), Dark = "intercept-dark" (.dark).
	globalTypes: {
		theme: {
			description: "Intercept color mode",
			toolbar: {
				title: "Theme",
				icon: "mirror",
				items: [
					{ value: "light", title: "Light (intercept)" },
					{ value: "dark", title: "Dark (intercept-dark)" },
				],
				dynamicTitle: true,
			},
		},
	},
	initialGlobals: { theme: "light" },
	decorators: [
		(Story, context) => {
			const dark = context.globals.theme === "dark";
			// In a single story, theme the whole page, so portaled content (tooltips, menus) follows it. On docs pages,
			// only the story previews change: the docs text around them stays on Storybook's light page.
			if (context.viewMode === "story") document.documentElement.classList.toggle("dark", dark);
			return React.createElement(
				"div",
				{ className: dark ? "dark bg-background p-4 text-foreground" : undefined },
				React.createElement(Story),
			);
		},
	],
	parameters: {
		docs: { theme },
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
					],
				],
			},
		},
	},
};

export default preview;
