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
					// The Intercept Live prototype stories play scripted scenarios in real time (Ask Intercept Live types its answers
					// out, Scenario 1's beats wait seconds apart), so a story can take longer than Vitest's 15 s default. 60 s since
					// Nov 4, 2026: Monitoring's Scenario 2 COPD plays about 29.4 s on its own and timed out at 30 s under load.
					testTimeout: 60_000,
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
