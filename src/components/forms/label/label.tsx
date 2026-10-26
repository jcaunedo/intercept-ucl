import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

type LabelProps = React.ComponentProps<typeof LabelPrimitive.Root>;

/**
 * Names a form control. Above a field it's medium weight and keeps its color when the field is disabled. After a
 * checkbox or radio it's regular weight; after a switch it stays medium (intercept.ds Switch, Oct 26, 2026). It turns
 * `foreground-subtle` when that control is disabled. The control must come first and carry `peer`. A Switch can also
 * render its own label (`label`).
 */
function Label({ className, ...props }: LabelProps) {
	return (
		<LabelPrimitive.Root
			data-slot='label'
			className={cn(
				"flex items-center gap-2 text-sm font-medium text-foreground select-none group-data-[disabled=true]:pointer-events-none peer-disabled:cursor-not-allowed",
				"peer-data-[slot=checkbox]:font-normal peer-data-[slot=radio-group-item]:font-normal peer-disabled:text-foreground-subtle",
				className,
			)}
			{...props}
		/>
	);
}

export { Label, type LabelProps };
