import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import remarkGfm from "remark-gfm";

// The name link previews (WhatsApp, Slack, iMessage) show for a shared URL. They read the built HTML without running
// its scripts, so it has to be in the head at build time: og:title on both pages, plus the story iframe's <title>.
const siteName = "Intercept Live";
const siteNameMeta = `<meta property="og:title" content="${siteName}" />`;

const config: StorybookConfig = {
	stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
	// Demo storyboards (standalone pages), served beside the prototype; the Prototype menu opens them in a new tab.
	staticDirs: [{ from: "../storyboards", to: "/storyboards" }],
	addons: [
		{
			name: "@storybook/addon-docs",
			options: {
				// GitHub-flavored markdown, so tables in MDX pages render as tables.
				mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } },
			},
		},
		"@storybook/addon-vitest",
		"@chromatic-com/storybook",
	],
	framework: {
		name: "@storybook/react-vite",
		options: {},
	},
	managerHead: (head) => `${head}\n${siteNameMeta}`,
	previewHead: (head) => `${head}\n${siteNameMeta}`,
	viteFinal: async (viteConfig) => {
		viteConfig.plugins = viteConfig.plugins || [];
		viteConfig.plugins.push(tailwindcss(), {
			name: "intercept-site-title",
			transformIndexHtml: (html) => html.replace("<title>Storybook</title>", `<title>${siteName}</title>`),
		});
		viteConfig.resolve = viteConfig.resolve || {};
		viteConfig.resolve.alias = {
			...viteConfig.resolve.alias,
			"@": path.resolve(import.meta.dirname, "../src"),
		};
		return viteConfig;
	},
};

export default config;
