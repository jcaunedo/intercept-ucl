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

	colorPrimary: "#082383", // --brand (catalina-800)
	colorSecondary: "#3f60de", // --link (catalina-500)

	appBg: "#f5f6f7", // --background-subtle (gray-50)
	appContentBg: "#ffffff", // --background
	appPreviewBg: "#ffffff", // --background
	appBorderColor: "#e0e2e6", // --border (gray-200)
	appBorderRadius: 8, // --radius

	textColor: "#222a34", // --foreground (gray-800)
	textInverseColor: "#ffffff",
	textMutedColor: "#686f7d", // --foreground-subtle (gray-500)

	barBg: "#ffffff",
	barTextColor: "#686f7d",
	barSelectedColor: "#082383",
	barHoverColor: "#082383",

	inputBg: "#ffffff",
	inputBorder: "#e0e2e6", // --input (gray-200)
	inputTextColor: "#222a34",
	inputBorderRadius: 10, // --radius-input
});

export { theme };
