import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

type LabelProps = React.ComponentProps<typeof LabelPrimitive.Root>;

/**
 * Names a form control. Above a field (Figma's Input "Label" layer, `sm/sm -medium`) it's medium weight and keeps its
 * color when the field is disabled. After a checkbox, radio or switch (Figma's option "Label", `sm/sm`) it's regular
 * weight and turns `muted-foreground` when that control is disabled. The control must come first and carry `peer`.
 */
function Label({ className, ...props }: LabelProps) {
	return (
		<LabelPrimitive.Root
			data-slot='label'
			className={cn(
				"flex items-center gap-2 text-sm font-medium text-foreground select-none group-data-[disabled=true]:pointer-events-none peer-disabled:cursor-not-allowed",
				"peer-data-[slot=checkbox]:font-normal peer-data-[slot=radio-group-item]:font-normal peer-data-[slot=switch]:font-normal peer-disabled:text-muted-foreground",
				className,
			)}
			{...props}
		/>
	);
}

export { Label, type LabelProps };
