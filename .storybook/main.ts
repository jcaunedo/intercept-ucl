import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import remarkGfm from "remark-gfm";

const config: StorybookConfig = {
	stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
	addons: [
		{
			name: "@storybook/addon-docs",
			options: {
				// GitHub-flavored markdown, so tables in MDX pages render as tables.
				mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } },
			},
		},
	],
	framework: {
		name: "@storybook/react-vite",
		options: {},
	},
	viteFinal: async (viteConfig) => {
		viteConfig.plugins = viteConfig.plugins || [];
		viteConfig.plugins.push(tailwindcss());
		viteConfig.resolve = viteConfig.resolve || {};
		viteConfig.resolve.alias = {
			...viteConfig.resolve.alias,
			"@": path.resolve(import.meta.dirname, "../src"),
		};
		return viteConfig;
	},
};

export default config;
