import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const config: StorybookConfig = {
	stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
	addons: ["@storybook/addon-docs"],
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
