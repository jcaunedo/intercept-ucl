import * as React from "react";
import { HandshakeIcon, IdCardIcon, KeyboardIcon, LogOutIcon, SlidersHorizontalIcon, StethoscopeIcon } from "lucide-react";

import {
	Avatar,
	AvatarBadge,
	AvatarFallback,
	AvatarImage,
	type AvatarFallbackProps,
} from "@/components/data-display/avatar";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/overlays/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * The user's availability (Spec §6.12). `available`, `busy` and `away` are picked by the user; `in-camera` and `on-call`
 * are set by the platform while a camera session or a call is on, and can't be picked.
 */
type AccountMenuStatus = "available" | "busy" | "away" | "in-camera" | "on-call";

/** One workspace the user can switch to: Clinical, Administration, Marketplace. */
type AccountMenuWorkspace = {
	id: string;
	label: string;
	/** One line under the label, what the workspace is for. */
	description?: string;
	/** A small outlined label after the name, e.g. "Preview". */
	tag?: string;
};

/** The shift the user is on: what they cover now. */
type AccountMenuShift = {
	/** The hospitals they cover, by name. */
	hospitals: string[];
	/** The call queues that route to them, e.g. "Tele-ICU nights". */
	callQueues?: string[];
	/** When it ends, preformatted, e.g. "Ends in 7h 58m". */
	ends?: string;
};

/** The settings in Preferences. Each group shows only with its handler. */
type AccountMenuPreferences = {
	theme?: "light" | "dark";
	onThemeChange?: (theme: "light" | "dark") => void;
	/** How Monitoring opens: every card's monitor full, condensed, or the condensed monitor alone. */
	monitoringView?: "full" | "condensed" | "minimal";
	onMonitoringViewChange?: (view: "full" | "condensed" | "minimal") => void;
	/** Whether new alerts ping. */
	alertSounds?: boolean;
	onAlertSoundsChange?: (on: boolean) => void;
};

type AccountMenuUser = {
	name: string;
	initials: string;
	src?: string;
	tone?: AvatarFallbackProps["tone"];
	/** What they do, e.g. "Intensivist". */
	role?: string;
};

type AccountMenuProps = {
	/** The button that opens the menu (rendered `asChild`). */
	children: React.ReactElement;
	user: AccountMenuUser;
	status?: AccountMenuStatus;
	/** Shows the Status submenu. */
	onStatusChange?: (status: AccountMenuStatus) => void;
	/** The user's workspaces. The Workspace group shows from two. */
	workspaces?: AccountMenuWorkspace[];
	/** The current workspace's `id`. */
	workspace?: string;
	onWorkspaceChange?: (id: string) => void;
	/** The shift the user is on. Without it, no My shift and no Start handoff. */
	shift?: AccountMenuShift;
	/** Start handoff, under My shift. */
	onStartHandoff?: () => void;
	preferences?: AccountMenuPreferences;
	/** Profile & credentials. */
	onOpenProfile?: () => void;
	/** Keyboard shortcuts, with `shortcutsKey` at its end. */
	onOpenShortcuts?: () => void;
	shortcutsKey?: string;
	onSignOut?: () => void;
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	/** Where the menu lines up with its button. `end` by default: the button sits at the header's right edge. */
	align?: "start" | "center" | "end";
	className?: string;
};

/** Each status in words, e.g. for a screen reader next to the avatar's status dot. */
const accountMenuStatusLabels: Record<AccountMenuStatus, string> = {
	available: "Available",
	busy: "Busy",
	away: "Away",
	"in-camera": "In camera",
	"on-call": "On a call",
};

/**
 * Each status's dot color, a background class: Teams' colors, so a status reads the same here and in the tools it's
 * mirrored to (green, red while taken, amber away). Also the avatar's status dot (AvatarBadge), in the menu and on
 * AppHeader's user button.
 */
const accountMenuStatusDotClassName: Record<AccountMenuStatus, string> = {
	available: "bg-success",
	busy: "bg-destructive",
	away: "bg-warning",
	"in-camera": "bg-destructive",
	"on-call": "bg-destructive",
};

const pickableStatuses = ["available", "busy", "away"] as const;

const monitoringViewWords = { full: "Full view", condensed: "Condensed view", minimal: "Minimal view" } as const;

function StatusDot({ status, className }: { status: AccountMenuStatus; className?: string }) {
	return <span aria-hidden='true' className={cn("size-2 shrink-0 rounded-full", accountMenuStatusDotClassName[status], className)} />;
}

// A muted value at the end of a submenu's row ("Available", "4 hospitals"), before its chevron.
function RowValue({ children }: { children: React.ReactNode }) {
	return <span className='ml-auto truncate pl-4 font-normal text-muted-foreground'>{children}</span>;
}

/**
 * The signed-in user's menu, from their name in the app header: who they are and their status, then the workspace
 * switcher (from two workspaces), Status, My shift and Start handoff, Preferences, Profile & credentials, Keyboard
 * shortcuts and Sign out. Each part shows only with its data or handler; the menu holds no state of its own.
 *
 * Figma: none yet (PRD Account menu, ACM-001).
 */
function AccountMenu({
	children,
	user,
	status,
	onStatusChange,
	workspaces = [],
	workspace,
	onWorkspaceChange,
	shift,
	onStartHandoff,
	preferences,
	onOpenProfile,
	onOpenShortcuts,
	shortcutsKey,
	onSignOut,
	open,
	defaultOpen,
	onOpenChange,
	align = "end",
	className,
}: AccountMenuProps) {
	const automaticStatus = status === "in-camera" || status === "on-call";
	const showWorkspaces = workspaces.length > 1;
	const shiftGroup = shift || onStartHandoff;
	const { theme, onThemeChange, monitoringView, onMonitoringViewChange, alertSounds, onAlertSoundsChange } =
		preferences ?? {};
	const showPreferences = Boolean(onThemeChange || onMonitoringViewChange || onAlertSoundsChange);
	const accountGroup = onOpenProfile || onOpenShortcuts;

	return (
		<DropdownMenu open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
			<DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
			<DropdownMenuContent align={align} className={cn("w-80", className)}>
				{/* Who's signed in. No organization name (Left Nav Spec): switching workspace isn't switching organization. */}
				<div className='flex items-center gap-3 px-2 py-2'>
					<Avatar size='md'>
						{user.src && <AvatarImage src={user.src} alt='' />}
						<AvatarFallback tone={user.tone}>{user.initials}</AvatarFallback>
						{/* The status as the avatar's dot (intercept.ds avatar "Show Dot"), ringed in the menu's surface. */}
						{status && <AvatarBadge className={cn(accountMenuStatusDotClassName[status], "ring-popover")} />}
					</Avatar>
					<div className='flex min-w-0 flex-col'>
						<span className='truncate text-sm font-semibold'>{user.name}</span>
						<span className='flex items-center gap-1.5 text-sm text-muted-foreground'>
							{user.role && <span className='truncate'>{user.role}</span>}
							{user.role && status && <span aria-hidden='true'>·</span>}
							{status && <span className='truncate'>{accountMenuStatusLabels[status]}</span>}
						</span>
					</div>
				</div>

				{showWorkspaces && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuLabel>Workspace</DropdownMenuLabel>
						<DropdownMenuRadioGroup value={workspace} onValueChange={onWorkspaceChange}>
							{workspaces.map((item) => (
								<DropdownMenuRadioItem key={item.id} value={item.id} className='items-start'>
									<span className='flex min-w-0 flex-col'>
										<span className='flex items-center gap-2'>
											{item.label}
											{item.tag && (
												<span className='rounded-sm border border-border px-1.5 text-xs/4 font-medium text-muted-foreground'>
													{item.tag}
												</span>
											)}
										</span>
										{item.description && (
											<span className='text-xs font-normal text-muted-foreground'>{item.description}</span>
										)}
									</span>
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
					</>
				)}

				{(onStatusChange || shiftGroup) && <DropdownMenuSeparator />}
				{onStatusChange && status && (
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<StatusDot status={status} className='mx-1' />
							Status
							<RowValue>{accountMenuStatusLabels[status]}</RowValue>
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent className='w-64'>
							{automaticStatus && (
								<DropdownMenuLabel className='flex items-center gap-1.5'>
									<StatusDot status={status} />
									{accountMenuStatusLabels[status]}: set for you until it ends
								</DropdownMenuLabel>
							)}
							<DropdownMenuRadioGroup
								value={automaticStatus ? "" : status}
								onValueChange={(value) => onStatusChange(value as AccountMenuStatus)}
							>
								{pickableStatuses.map((item) => (
									<DropdownMenuRadioItem key={item} value={item}>
										<StatusDot status={item} className='mx-1' />
										{accountMenuStatusLabels[item]}
									</DropdownMenuRadioItem>
								))}
							</DropdownMenuRadioGroup>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				)}
				{shift && (
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<StethoscopeIcon aria-hidden='true' />
							My shift
							<RowValue>
								{shift.hospitals.length} {shift.hospitals.length === 1 ? "hospital" : "hospitals"}
							</RowValue>
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent className='w-64'>
							{shift.ends && <DropdownMenuLabel className='text-sm text-foreground'>{shift.ends}</DropdownMenuLabel>}
							<ShiftList label='Hospitals' items={shift.hospitals} />
							{shift.callQueues && shift.callQueues.length > 0 && (
								<ShiftList label='Call queues' items={shift.callQueues} />
							)}
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				)}
				{shift && onStartHandoff && (
					<DropdownMenuItem onSelect={onStartHandoff}>
						<HandshakeIcon aria-hidden='true' />
						Start handoff
					</DropdownMenuItem>
				)}

				{(showPreferences || accountGroup) && <DropdownMenuSeparator />}
				{showPreferences && (
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<SlidersHorizontalIcon aria-hidden='true' />
							Preferences
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent className='w-60'>
							{onThemeChange && (
								<DropdownMenuGroup>
									<DropdownMenuLabel>Theme</DropdownMenuLabel>
									<DropdownMenuRadioGroup
										value={theme}
										onValueChange={(value) => onThemeChange(value as "light" | "dark")}
									>
										<DropdownMenuRadioItem value='light' onSelect={(event) => event.preventDefault()}>
											Light
										</DropdownMenuRadioItem>
										<DropdownMenuRadioItem value='dark' onSelect={(event) => event.preventDefault()}>
											Dark
										</DropdownMenuRadioItem>
									</DropdownMenuRadioGroup>
								</DropdownMenuGroup>
							)}
							{onMonitoringViewChange && (
								<DropdownMenuGroup>
									{onThemeChange && <DropdownMenuSeparator />}
									<DropdownMenuLabel>Monitoring opens in</DropdownMenuLabel>
									<DropdownMenuRadioGroup
										value={monitoringView}
										onValueChange={(value) => onMonitoringViewChange(value as keyof typeof monitoringViewWords)}
									>
										{(Object.keys(monitoringViewWords) as (keyof typeof monitoringViewWords)[]).map((view) => (
											<DropdownMenuRadioItem key={view} value={view} onSelect={(event) => event.preventDefault()}>
												{monitoringViewWords[view]}
											</DropdownMenuRadioItem>
										))}
									</DropdownMenuRadioGroup>
								</DropdownMenuGroup>
							)}
							{onAlertSoundsChange && (
								<>
									{(onThemeChange || onMonitoringViewChange) && <DropdownMenuSeparator />}
									<DropdownMenuCheckboxItem
										checked={alertSounds}
										onCheckedChange={onAlertSoundsChange}
										onSelect={(event) => event.preventDefault()}
									>
										Alert sounds
									</DropdownMenuCheckboxItem>
								</>
							)}
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				)}
				{onOpenProfile && (
					<DropdownMenuItem onSelect={onOpenProfile}>
						<IdCardIcon aria-hidden='true' />
						Profile & credentials
					</DropdownMenuItem>
				)}
				{onOpenShortcuts && (
					<DropdownMenuItem onSelect={onOpenShortcuts}>
						<KeyboardIcon aria-hidden='true' />
						Keyboard shortcuts
						{shortcutsKey && <DropdownMenuShortcut>{shortcutsKey}</DropdownMenuShortcut>}
					</DropdownMenuItem>
				)}

				{onSignOut && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem onSelect={onSignOut}>
							<LogOutIcon aria-hidden='true' />
							Sign out
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

// What the shift covers: a heading and its lines, read as a group (they're information, not menu items).
function ShiftList({ label, items }: { label: string; items: string[] }) {
	const id = React.useId();
	return (
		<div role='group' aria-labelledby={id} className='flex flex-col pb-1'>
			<DropdownMenuLabel id={id}>{label}</DropdownMenuLabel>
			<ul className='flex flex-col'>
				{items.map((item) => (
					<li key={item} className='px-2 py-1 text-sm'>
						{item}
					</li>
				))}
			</ul>
		</div>
	);
}

export {
	AccountMenu,
	type AccountMenuPreferences,
	type AccountMenuProps,
	accountMenuStatusDotClassName,
	accountMenuStatusLabels,
	type AccountMenuShift,
	type AccountMenuStatus,
	type AccountMenuUser,
	type AccountMenuWorkspace,
};
