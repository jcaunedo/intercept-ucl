# UCL layout conventions (for ucl-generate-layout)

File skeletons for a reference layout under `src/layouts/`. These are full-page compositions, not library primitives: lint/build must stay green, but they are intentionally excluded from `src/index.ts`. Project specifics (the list of apps, existing flows) are in CLAUDE.md → "Architecture"; read it first.

For breakpoints (responsive grid/flex splits), see [ucl-conventions.md](../../ucl-generate-component/references/ucl-conventions.md#breakpoints) and DESIGN.md "Breakpoints include their own width".

## File layout

- Layout: `src/layouts/<app>/<name>/<name>.tsx` (kebab-case folder + file). A layout used by more than one app goes in `src/layouts/shared/<name>/`.
- Stories: `<name>.stories.tsx` in the same folder, titled `Layouts/<App>/<Name>` (e.g. `Layouts/Shared/SignIn`).
- Images: `src/layouts/<app>/<name>/images/*` — every exported Figma asset (photos, logos, illustrations) lives here, never loose in the layout's folder.
- No `index.ts`, no export from `src/index.ts`.
- Name: kebab-case file/folder, PascalCase component export.
- **Screens that belong to a multi-screen flow nest under that flow's folder:** `src/layouts/<app>/<flow>/<screen>/<screen>.tsx`, with the flow's shared shell at `src/layouts/<app>/<flow>/<flow>.tsx` and helpers shared by its screens in `<flow>/shared/`. Name a screen for what it does, without prefixes the path already implies. When a new flow is created, record it in CLAUDE.md → "Architecture" so later screens land in the same place.

## Component skeleton

```tsx
import { Button } from "@/components/buttons/button";
// …import every piece this page composes from existing UCL components

import heroImage from "./images/hero.png";

/** Full-page reference layout. Figma origin: <file> → <frame name>. */
function <Name>() {
	return (
		<div className='grid min-h-screen grid-cols-1 lg:grid-cols-2'>
			<div className='relative'>{/* hero image / illustration column */}</div>
			<div className='flex flex-col items-center justify-center gap-6 px-8'>
				{/* heading, form, etc. — composed from existing components */}
			</div>
		</div>
	);
}

export { <Name> };
```

## Stories skeleton

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";

import { <Name> } from "./<name>";

const meta = {
	title: "Layouts/<App>/<Name>",
	component: <Name>,
	parameters: {
		layout: "fullscreen", // renders full-bleed, no Storybook canvas padding
	},
} satisfies Meta<typeof <Name>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
```

## Composition rules

- **Instances → existing components, always try this first.** A Figma instance named after (or shaped like) an existing component should become that component, not hand-rolled markup. CLAUDE.md → "Current Component APIs" and `src/index.ts` list what exists.
- **Structure-only markup is fine inline.** Grid/flex wrappers, spacing, section containers — plain `div`s with Tailwind utilities and tokens (`bg-card`, `gap-6`, `rounded-lg`), same restriction as components: never raw hex/px.
- **Composed components are black boxes** (DESIGN.md): don't restyle a component's internals from the layout. If it needs to look different, it needs a prop or variant.
- **Real copy, not lorem ipsum.** Pull actual heading/body/button text from the Figma text nodes.
- **Exported images go in `images/`.** Download with `download_assets`, save under the layout's `images/` folder, import with a relative path (`./images/hero.png`). Add an ambient module declaration for the extension (e.g. `src/layouts/assets.d.ts` with `declare module "*.png"`) if none covers it yet.
- **Don't add a local index.ts or a `src/index.ts` export.** Layouts are previewed via Storybook only.

## Verify (from the repo root)

- `npm run lint` (`tsc --noEmit`) — must pass.
- `npm run build` — must succeed.
- Storybook preview: `npm run storybook`, then open `http://localhost:6006/iframe.html?id=layouts-<app>-<name>--default&viewMode=story` — full-bleed, no Storybook chrome, thanks to `layout: "fullscreen"`.
