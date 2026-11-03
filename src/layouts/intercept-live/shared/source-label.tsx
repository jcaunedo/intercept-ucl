import * as React from "react";
import { GitBranchIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// Where data comes from ("Epic · 5 min ago", "From 12 sources", "Sources: Monitor · Lab"), after the source icon
// (archielabs.ds `git-branch`, lucide `GitBranch`; Nov 2, 2026, user's call: one icon for every source reference). The
// icon is decorative: the words name the source.

/** A source line's content: the source icon, then the words. Takes its size and color from the line it sits in. */
function SourceLabel({ className, children, ...props }: React.ComponentProps<"span">) {
	return (
		<span data-slot='source-label' className={cn("inline-flex items-center gap-1", className)} {...props}>
			<GitBranchIcon aria-hidden='true' className='size-3 shrink-0' />
			<span>{children}</span>
		</span>
	);
}

export { SourceLabel };
