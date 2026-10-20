export { cn } from "@/lib/utils";

export {
	formatRelativeDate,
	RELATIVE_CUTOVER,
	type RelativeDate,
} from "@/lib/relative-date";

export {
	motionDuration,
	motionDistance,
	motionScale,
	motionRotation,
	motionStagger,
	standardTransition,
	enterTransition,
	exitTransition,
	subtleSpring,
	responsiveSpring,
	layoutSpring,
	fadeVariants,
	rowRemoveVariants,
	revealVariants,
	expandVariants,
	dismissVariants,
	overlayVariants,
	panelVariants,
	slideVariants,
	staggerContainerVariants,
	pendingIconVariants,
	pendingIconReducedVariants,
	pendingSurfaceVariants,
	liftPattern,
	pressPattern,
	mediaHoverPattern,
	liftWithMediaPattern,
	glidePattern,
	confirmPattern,
	reducedMotionTransition,
	resolveTransition,
	useMotionPreference,
	useExpandClip,
} from "@/lib/motion";

/* -------------------------------------------------------------------------- */
/* Buttons                                                                    */
/* -------------------------------------------------------------------------- */

export {
	Button,
	buttonVariants,
	type ButtonProps,
} from "@/components/buttons/button";

/* -------------------------------------------------------------------------- */
/* Forms                                                                      */
/* -------------------------------------------------------------------------- */

export { Checkbox, type CheckboxProps } from "@/components/forms/checkbox";
export {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
	fieldVariants,
	type FieldErrorProps,
	type FieldLegendProps,
	type FieldProps,
} from "@/components/forms/field";
export { Input, inputVariants, type InputProps } from "@/components/forms/input";
export { Label, type LabelProps } from "@/components/forms/label";
export {
	RadioGroup,
	RadioGroupItem,
	type RadioGroupItemProps,
	type RadioGroupProps,
} from "@/components/forms/radio-group";
export { Switch, switchVariants, type SwitchProps } from "@/components/forms/switch";
export { Textarea, textareaVariants, type TextareaProps } from "@/components/forms/textarea";

/* -------------------------------------------------------------------------- */
/* Overlays                                                                   */
/* -------------------------------------------------------------------------- */

export {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
	tooltipContentVariants,
	type TooltipContentProps,
} from "@/components/overlays/tooltip";

/* -------------------------------------------------------------------------- */
/* Typography                                                                 */
/* -------------------------------------------------------------------------- */

export {
	Typography,
	typographyVariants,
	typographyHeadings,
	type TypographyHeading,
	type TypographyProps,
	type TypographySize,
	type TypographyWeight,
} from "@/components/typography/typography";
