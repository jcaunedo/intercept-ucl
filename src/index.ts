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
/* Data Display                                                               */
/* -------------------------------------------------------------------------- */

export { Badge, badgeVariants, type BadgeProps } from "@/components/data-display/badge";
export { Logo, LogoSymbol, type LogoProps, type LogoSymbolProps } from "@/components/data-display/logo";

/* -------------------------------------------------------------------------- */
/* Forms                                                                    */
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
/* Icons: solid icons for the SidebarMenuButton Active state                  */
/* -------------------------------------------------------------------------- */

export { BoxSolidIcon } from "@/components/icons/box-solid-icon";
export { ChartColumnSolidIcon } from "@/components/icons/chart-column-solid-icon";
export { CircleUserSolidIcon } from "@/components/icons/circle-user-solid-icon";
export { EyeSolidIcon } from "@/components/icons/eye-solid-icon";
export { HeartCrackSolidIcon } from "@/components/icons/heart-crack-solid-icon";
export { HomeSolidIcon } from "@/components/icons/home-solid-icon";
export { LayoutGridSolidIcon } from "@/components/icons/layout-grid-solid-icon";
export { MessageCircleMoreSolidIcon } from "@/components/icons/message-circle-more-solid-icon";
export { ShieldSolidIcon } from "@/components/icons/shield-solid-icon";
export { SquareActivitySolidIcon } from "@/components/icons/square-activity-solid-icon";
export { TriangleAlertSolidIcon } from "@/components/icons/triangle-alert-solid-icon";

/* -------------------------------------------------------------------------- */
/* Navigation                                                                 */
/* -------------------------------------------------------------------------- */

export {
	Sidebar,
	SidebarDivider,
	SidebarMenuButton,
	type SidebarMenuButtonProps,
	type SidebarNavItem,
	type SidebarProps,
} from "@/components/navigation/sidebar";

/* -------------------------------------------------------------------------- */
/* Overlays                                                                   */
/* -------------------------------------------------------------------------- */

export {
	SidebarTooltip,
	type SidebarTooltipProps,
	type SidebarTooltipSide,
} from "@/components/overlays/sidebar-tooltip";
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
