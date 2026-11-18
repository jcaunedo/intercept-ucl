import type { Meta, StoryObj } from "@storybook/react-vite";

// A demo storyboard (`storyboards/<scenario>/index.html`) shown full size in Storybook's Storyboard section. It's a
// standalone page Storybook serves at /storyboards (`staticDirs`), so the story frames it; the Prototype menu's
// Storyboard section opens the same page in a new tab. One file per scenario.
function StoryboardFrame({ path, title }: { path: string; title: string }) {
	return <iframe src={path} title={title} className='block h-screen w-full border-0' />;
}

const meta = {
	title: "Storyboard/Scenario 6",
	component: StoryboardFrame,
	parameters: {
		layout: "fullscreen",
		controls: { disable: true },
		actions: { disable: true },
		interactions: { disable: true },
	},
	tags: ["!autodocs"],
} satisfies Meta<typeof StoryboardFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

/** After the ICU: Margaret Hayes's handoff, follow-up and return to Chadron's ED, then the outcomes report. */
export const Scenario6: Story = {
	name: "Scenario 6",
	args: { path: "storyboards/scenario-6/index.html", title: "Scenario 6 storyboard" },
};
