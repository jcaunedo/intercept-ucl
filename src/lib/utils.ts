import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge only knows Tailwind's default radius sizes. Without the project's own (theme.css `--radius-*`), it
// would keep `rounded-md` and `rounded-button-md` side by side and let CSS order decide. Add each new radius token here.
const twMerge = extendTailwindMerge({
	extend: {
		theme: {
			radius: ["input", "menu", "card", "button-md"],
		},
	},
});

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}
