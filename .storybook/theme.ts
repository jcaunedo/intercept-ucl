import { create } from "storybook/theming";

/**
 * Storybook's own chrome (sidebar, toolbar, docs pages) in Intercept's colors. Intercept's only Figma mode is dark,
 * so the docs pages are dark too, and components render on the surface they were designed for. Storybook's theme
 * takes plain colors, not CSS variables: these hex values mirror the `intercept` mode tokens in `src/styles/theme.css`.
 * Update both together.
 */
const theme = create({
	base: "dark",
	brandTitle: "Intercept UCL",

	fontBase: '"Figtree", ui-sans-serif, system-ui, sans-serif',
	fontCode: '"Roboto Mono", ui-monospace, monospace',

	colorPrimary: "#6947d9", // --brand (indigo-400)
	colorSecondary: "#6947d9", // --brand

	appBg: "#1b212d", // --sidebar (gray-900)
	appContentBg: "#0b1222", // --background (gray-950)
	appPreviewBg: "#0b1222", // --background
	appBorderColor: "#31373f", // --border (gray-700)
	appBorderRadius: 8, // --radius

	textColor: "#edeff2", // --foreground (gray-100)
	textInverseColor: "#0b1222",
	textMutedColor: "#9aa1ac", // --muted-foreground (gray-400)

	barBg: "#0b1222",
	barTextColor: "#9aa1ac",
	barSelectedColor: "#edeff2",
	barHoverColor: "#edeff2",

	inputBg: "#0b1222",
	inputBorder: "#4a525e", // --input (gray-600)
	inputTextColor: "#edeff2",
	inputBorderRadius: 10, // --radius-input
});

export { theme };
