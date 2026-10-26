import { create } from "storybook/theming";

/**
 * Storybook's own chrome (sidebar, toolbar, docs pages) in Intercept's colors and fonts. Storybook's theme takes plain
 * colors, not CSS variables: these hex values mirror the `intercept` mode tokens in `src/styles/theme.css`. Update
 * both together (DESIGN.md "Figma → theme.css token map").
 */
const theme = create({
	base: "light",
	brandTitle: "Intercept UCL",

	fontBase: '"Figtree", ui-sans-serif, system-ui, sans-serif',
	fontCode: '"Roboto Mono", ui-monospace, monospace',

	colorPrimary: "#1160e8", // --brand (denim-500)
	colorSecondary: "#3f60de", // --link (catalina-500)

	appBg: "#f5f6f7", // --background-subtle (gray-50)
	appContentBg: "#ffffff", // --background
	appPreviewBg: "#ffffff", // --background
	appBorderColor: "#e0e2e6", // --border (gray-200)
	appBorderRadius: 8, // --radius

	textColor: "#31373f", // --foreground (gray-700)
	textInverseColor: "#ffffff",
	textMutedColor: "#686f7d", // --muted-foreground (gray-500)

	barBg: "#ffffff",
	barTextColor: "#686f7d",
	barSelectedColor: "#1160e8",
	barHoverColor: "#1160e8",

	inputBg: "#ffffff",
	inputBorder: "#e0e2e6", // --input (gray-200)
	inputTextColor: "#31373f",
	inputBorderRadius: 10, // --radius-input
});

export { theme };
