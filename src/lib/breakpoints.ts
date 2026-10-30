/**
 * Frame widths for each breakpoint. A breakpoint's layout covers widths up to and including its frame width: at
 * exactly 1024px the page shows the "lg and below" layout, and the next layout starts at 1025px. The matching
 * Tailwind breakpoints in `src/styles/theme.css` are these values + 1px (`lg:` = above 1024). Keep the two in sync.
 * See DESIGN.md "Breakpoints include their own width".
 */
const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
  "2.5xl": 1728,
  "3xl": 1920,
  "3.5xl": 2048,
  "4xl": 2560,
  "5xl": 2880,
  "6xl": 3200,
  "7xl": 3440,
  "8xl": 3840,
} as const;

type Breakpoint = keyof typeof breakpoints;

/**
 * Media query for widths above `name`'s frame width, e.g. `mediaAbove("lg")` = `(min-width: 1025px)`. Same boundary
 * as Tailwind's `lg:` variant. Its negation is "`name` and below".
 */
function mediaAbove(name: Breakpoint): string {
  return `(min-width: ${breakpoints[name] + 1}px)`;
}

export { breakpoints, mediaAbove, type Breakpoint };
