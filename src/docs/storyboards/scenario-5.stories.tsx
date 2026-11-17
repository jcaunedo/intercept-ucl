import type { Meta, StoryObj } from "@storybook/react-vite";

// A demo storyboard (`storyboards/<scenario>/index.html`) shown full size in Storybook's Storyboard section. It's a
// standalone page Storybook serves at /storyboards (`staticDirs`), so the story frames it; the Prototype menu's
// Storyboard section opens the same page in a new tab. One file per scenario.
function StoryboardFrame({ path, title }: { path: string; title: string }) {
	return <iframe src={path} title={title} className='block h-screen w-full border-0' />;
}

const meta = {
	title: "Storyboard/Scenario 5",
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

/** Surge night across five hospitals and four EHRs: Walter Pierce (Regional West) and Linda Shaw (Sidney). */
export const Scenario5: Story = {
	name: "Scenario 5",
	args: { path: "storyboards/scenario-5/index.html", title: "Scenario 5 storyboard" },
};
