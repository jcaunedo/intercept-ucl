export { cn } from "@/lib/utils";

// Links the app also follows in place: a plain click navigates, Cmd/Ctrl+click opens a new tab and moves to it.
export { handleLinkClick, isNewTabClick, openInNewTab, type LinkClickEvent } from "@/lib/new-tab-click";

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
	motionDelay,
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
/* Cards                                                                      */
/* -------------------------------------------------------------------------- */

export {
	CarePlanPathway,
	CarePlanProblemCard,
	carePlanProblemStatuses,
	type CarePlanPathwayProps,
	type CarePlanProblemCardProps,
	type CarePlanProblemStatus,
} from "@/components/cards/care-plan-problem-card";
export {
	PatientCard,
	PatientCensusCard,
	PatientCardAlert,
	PatientCardMetric,
	patientCardAcuityLevels,
	patientCardAlertVariants,
	patientCardMetricVariants,
	scoreTrendClassName,
	scoreTrendVariant,
	type PatientCardAction,
	type PatientCardAlertProps,
	type PatientCardAcuityLevel,
	type PatientCardAlertStatus,
	type PatientCardAlertVariant,
	type PatientCardMetricProps,
	type PatientCardProps,
	type PatientCensusCardProps,
	type PatientCardTag,
	type PatientCardTagDetails,
	type PatientCardVital,
} from "@/components/cards/patient-census-card";
export {
	PatientMonitoringCard,
	patientMonitoringCardVariants,
	type PatientMonitoringCardAction,
	type PatientMonitoringCardProps,
	type PatientMonitoringCardSize,
} from "@/components/cards/patient-monitoring-card";

/* -------------------------------------------------------------------------- */
/* Data Display                                                               */
/* -------------------------------------------------------------------------- */

export {
	Avatar,
	AvatarAdd,
	AvatarBadge,
	AvatarFallback,
	AvatarGroup,
	AvatarImage,
	avatarAddVariants,
	avatarFallbackVariants,
	avatarVariants,
	type AvatarAddProps,
	type AvatarFallbackProps,
	type AvatarProps,
} from "@/components/data-display/avatar";
export { Badge, badgeVariants, type BadgeProps } from "@/components/data-display/badge";
export {
	CensusList,
	censusListPosition,
	type CensusListPatient,
	type CensusListProps,
} from "@/components/data-display/census-list";
export {
	ChatDayDivider,
	ChatMessage,
	chatBubbleVariants,
	chatMessagePresenceDots,
	chatMessageVariants,
	type ChatDayDividerProps,
	type ChatMessageAuthor,
	type ChatMessagePresence,
	type ChatMessageProps,
} from "@/components/data-display/chat-message";
export {
	ConversationRow,
	conversationRowPresenceDots,
	type ConversationRowPatient,
	type ConversationRowPerson,
	type ConversationRowPresence,
	type ConversationRowProps,
} from "@/components/data-display/conversation-row";
export {
	MessageHeader,
	type MessageHeaderPatient,
	type MessageHeaderPerson,
	type MessageHeaderProps,
} from "@/components/data-display/message-header";
export { Counter, counterVariants, type CounterProps } from "@/components/data-display/counter";
export { LabTile, labTileFlags, labTileVariants, type LabTileFlag, type LabTileProps } from "@/components/data-display/lab-tile";
export {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
	tableHeaderVariants,
	tableVariants,
	type TableHeaderProps,
	type TableProps,
} from "@/components/data-display/table";
export {
	LiveFeed,
	LiveFeedFilter,
	type LiveFeedEntry,
	type LiveFeedFilterId,
	type LiveFeedKind,
	type LiveFeedPatient,
	type LiveFeedProps,
	type LiveFeedSeverity,
} from "@/components/data-display/live-feed";
export { HospitalSectionHeader, type HospitalSectionHeaderProps } from "@/components/data-display/hospital-section-header";
export { PatientHeader, type PatientHeaderAlertCounts, type PatientHeaderClinicalStatus, type PatientHeaderClinicalStatusValue, type PatientHeaderProps } from "@/components/data-display/patient-header";
export { Logo, LogoSymbol, type LogoProps, type LogoSymbolProps } from "@/components/data-display/logo";
export {
	defaultMonitorLimits,
	monitorAlarm,
	monitorAlarmSide,
	PatientMonitor,
	resolveMonitorLimits,
	type MonitorAlarmLimit,
	type MonitorAlarmLimits,
	type MonitorAlarmParameter,
	type MonitorAlarmPriorities,
	type MonitorLimits,
	type MonitorTrends,
	type MonitorVitals,
	type PatientMonitorProps,
	type PatientMonitorSize,
} from "@/components/data-display/patient-monitor";

/* -------------------------------------------------------------------------- */
/* Feedback                                                                   */
/* -------------------------------------------------------------------------- */

export {
	AiClinicalSummaryBanner,
	type AiClinicalSummaryBannerProps,
} from "@/components/feedback/ai-clinical-summary-banner";
export {
	AlertToast,
	toastAlert,
	alertToastDuration,
	resolvedToastDuration,
	type AlertToastProps,
	type AlertToastRequester,
	type AlertToastSeverity,
	type ToastAlertOptions,
} from "@/components/feedback/alert-toast";
export { EmptyState, type EmptyStateProps } from "@/components/feedback/empty-state";
export {
	Toaster,
	toast,
	muteToasts,
	toastsMuted,
	toastsMutedUntil,
	toastsOnScreen,
	useToastsOnScreen,
	useToastsMuted,
	setToastCloseHandler,
	setToastKept,
	type ExternalToast,
	type ToasterProps,
} from "@/components/feedback/sonner";

/* -------------------------------------------------------------------------- */
/* Forms                                                                    */
/* -------------------------------------------------------------------------- */

export { ChatComposer, type ChatCommand, type ChatComposerProps } from "@/components/forms/chat-composer";
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
export {
	FilterBar,
	FilterBarChip,
	FilterBarControls,
	FilterBarFilters,
	type FilterBarChipProps,
	type FilterBarControlsProps,
	type FilterBarFiltersProps,
	type FilterBarProps,
} from "@/components/forms/filter-bar";
export {
	FilterPanel,
	FilterPanelButton,
	filterPanelCount,
	type FilterPanelButtonProps,
	type FilterPanelGroup,
	type FilterPanelOption,
	type FilterPanelProps,
	type FilterPanelValue,
} from "@/components/forms/filter-panel";
export { Input, inputVariants, type InputProps } from "@/components/forms/input";
export { Label, type LabelProps } from "@/components/forms/label";
export {
	RadioGroup,
	RadioGroupItem,
	type RadioGroupItemProps,
	type RadioGroupProps,
} from "@/components/forms/radio-group";
export { SearchInput, searchInputVariants, type SearchInputProps } from "@/components/forms/search-input";
export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
	selectTriggerVariants,
	type SelectTriggerProps,
} from "@/components/forms/select";
export { Switch, switchVariants, type SwitchProps } from "@/components/forms/switch";
export { Textarea, textareaVariants, type TextareaProps } from "@/components/forms/textarea";

/* -------------------------------------------------------------------------- */
/* Icons: solid icons for the SidebarMenuButton Active state                  */
/* -------------------------------------------------------------------------- */

// Intercept's AI mark, in its gradient (Ask Intercept Live).
export { AiSparkleIcon } from "@/components/icons/ai-sparkle-icon";
export { BoxSolidIcon } from "@/components/icons/box-solid-icon";
export { CalendarSolidIcon } from "@/components/icons/calendar-solid-icon";
export { ChartColumnSolidIcon } from "@/components/icons/chart-column-solid-icon";
// An urgent conversation in the Messages list (intercept.ds, custom).
export { CircleAlertFilledIcon } from "@/components/icons/circle-alert-filled-icon";
export { CircleUserSolidIcon } from "@/components/icons/circle-user-solid-icon";
export { EyeSolidIcon } from "@/components/icons/eye-solid-icon";
export { HeartCrackSolidIcon } from "@/components/icons/heart-crack-solid-icon";
export { HomeSolidIcon } from "@/components/icons/home-solid-icon";
export { InboxSolidIcon } from "@/components/icons/inbox-solid-icon";
export { LayoutGridSolidIcon } from "@/components/icons/layout-grid-solid-icon";
export { MessageCircleMoreSolidIcon } from "@/components/icons/message-circle-more-solid-icon";
export { MessageCircleSolidIcon } from "@/components/icons/message-circle-solid-icon";
// Monitor view: condensed and full monitor (PatientMonitoringCard), custom in archielabs.ds.
export { MonitorViewExpandedIcon } from "@/components/icons/monitor-view-expanded-icon";
export { MonitorViewMinimalIcon } from "@/components/icons/monitor-view-minimal-icon";
export { MonitorViewMinimizedIcon } from "@/components/icons/monitor-view-minimized-icon";
export { ShieldSolidIcon } from "@/components/icons/shield-solid-icon";
// ChatComposer's commands button: a short slash (intercept.ds, custom).
export { SlashCommandIcon } from "@/components/icons/slash-command-icon";
export { SparklesSolidIcon } from "@/components/icons/sparkles-solid-icon";
export { SquareActivitySolidIcon } from "@/components/icons/square-activity-solid-icon";
// ChatComposer's Stop: a filled rounded square (intercept.ds, custom).
export { SquareFilledIcon } from "@/components/icons/square-filled-icon";
export { TriangleAlertSolidIcon } from "@/components/icons/triangle-alert-solid-icon";
// Unread: a filled circle with an incoming arrow (intercept.ds, custom).
export { UnreadIcon } from "@/components/icons/unread-icon";
export { PanelRightAltIcon } from "@/components/icons/panel-right-alt-icon";

/* -------------------------------------------------------------------------- */
/* Navigation                                                                 */
/* -------------------------------------------------------------------------- */

export {
	AccountMenu,
	accountMenuStatusDotClassName,
	accountMenuStatusLabels,
	type AccountMenuPreferences,
	type AccountMenuProps,
	type AccountMenuShift,
	type AccountMenuStatus,
	type AccountMenuUser,
	type AccountMenuWorkspace,
} from "@/components/navigation/account-menu";
export {
	AppHeader,
	type AppHeaderDefaultProps,
	type AppHeaderMenuAction,
	type AppHeaderPatient,
	type AppHeaderPatientProps,
	type AppHeaderPerson,
	type AppHeaderProps,
	type AppHeaderUser,
} from "@/components/navigation/app-header";
export {
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
	breadcrumbListVariants,
	type BreadcrumbEllipsisProps,
	type BreadcrumbItemProps,
	type BreadcrumbLinkProps,
	type BreadcrumbListProps,
	type BreadcrumbPageProps,
	type BreadcrumbProps,
} from "@/components/navigation/breadcrumb";
export {
	Sidebar,
	SidebarDivider,
	SidebarMenuButton,
	type SidebarAlert,
	type SidebarMenuButtonProps,
	type SidebarNavItem,
	type SidebarProps,
} from "@/components/navigation/sidebar";
export {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
	tabsIndicatorVariants,
	tabsListVariants,
	tabsTriggerVariants,
	type TabsContentProps,
	type TabsListProps,
	type TabsProps,
	type TabsTriggerProps,
} from "@/components/navigation/tabs";

/* -------------------------------------------------------------------------- */
/* Overlays                                                                   */
/* -------------------------------------------------------------------------- */

export {
	AlertModal,
	AlertModalClose,
	type AlertModalPanel,
	type AlertModalProps,
	type AlertModalSeverity,
	AlertExpanded,
	AlertExpandedClose,
	type AlertExpandedPanel,
	type AlertExpandedProps,
	type AlertExpandedSeverity,
} from "@/components/overlays/alert-modal";
export {
	Popover,
	PopoverAnchor,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/overlays/popover";
export {
	TagsPopover,
	TagsPopoverActionsProvider,
	TagsPopoverGroup,
	useTagsPopoverActions,
	type TagsPopoverAction,
	type TagsPopoverActionRequest,
	type TagsPopoverActionResolver,
	type TagsPopoverDetails,
	type TagsPopoverProps,
} from "@/components/overlays/tags-popover";
export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	type DialogContentProps,
} from "@/components/overlays/dialog";
export {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/overlays/dropdown-menu";
export {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
	sheetContentVariants,
	type SheetContentProps,
	type SheetSide,
} from "@/components/overlays/sheet";
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
