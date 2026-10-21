import path from "node:path";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Every story runs as a test in headless Chromium: it fails when the story throws while rendering or its `play`
// function fails. https://storybook.js.org/docs/writing-tests/integrations/vitest-addon
export default defineConfig({
	test: {
		projects: [
			{
				extends: true,
				plugins: [storybookTest({ configDir: path.join(import.meta.dirname, ".storybook") })],
				test: {
					name: "storybook",
					browser: {
						enabled: true,
						headless: true,
						provider: playwright({}),
						instances: [{ browser: "chromium" }],
					},
				},
			},
		],
	},
});
