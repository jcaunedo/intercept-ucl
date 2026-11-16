import * as React from "react";
import { LogInIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import { Logo } from "@/components/data-display/logo";
import { EmptyState } from "@/components/feedback/empty-state";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/overlays/dialog";

// What the account menu opens (PRD Account menu): Keyboard shortcuts, the check before signing out on shift, and the
// signed-out screen.

/** The key that opens Keyboard shortcuts from anywhere outside a text field. */
const shortcutsKey = "?";

// The shortcuts the app has today, by where they work. No ⌘K yet: search isn't built (Left Nav Spec).
const shortcutGroups: { title: string; shortcuts: { keys: string[]; action: string }[] }[] = [
	{
		title: "Anywhere",
		shortcuts: [
			{ keys: ["?"], action: "Show keyboard shortcuts" },
			{ keys: ["Esc"], action: "Close the open menu, panel or window" },
			{ keys: ["Tab"], action: "Move to the next button or field" },
		],
	},
	{
		title: "Ask Intercept Live",
		shortcuts: [
			{ keys: ["/"], action: "Show the commands" },
			{ keys: ["Enter"], action: "Send" },
			{ keys: ["Shift", "Enter"], action: "New line" },
		],
	},
	{
		title: "Patient timeline",
		shortcuts: [
			{ keys: ["←", "→"], action: "Move along the timeline" },
			{ keys: ["Home", "End"], action: "Go to its start or end" },
		],
	},
	{
		title: "Flags",
		shortcuts: [{ keys: ["Tab"], action: "With a flag's details open, show the next flag's" }],
	},
];

function Key({ children }: { children: React.ReactNode }) {
	return (
		<kbd className='inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border bg-background-subtle px-1.5 font-sans text-xs font-medium'>
			{children}
		</kbd>
	);
}

/** Keyboard shortcuts: every shortcut the app has, by where it works. */
function KeyboardShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='w-[480px]'>
				<DialogHeader>
					<DialogTitle>Keyboard shortcuts</DialogTitle>
					<DialogDescription className='sr-only'>Every keyboard shortcut, by where it works.</DialogDescription>
				</DialogHeader>
				<div className='flex flex-col gap-5 px-6 pb-6'>
					{shortcutGroups.map((group) => (
						<section key={group.title} aria-label={group.title} className='flex flex-col gap-2'>
							<h3 className='text-sm font-semibold'>{group.title}</h3>
							<dl className='flex flex-col gap-2'>
								{group.shortcuts.map((shortcut) => (
									<div key={shortcut.action} className='flex items-center justify-between gap-4 text-sm'>
										<dt className='text-muted-foreground'>{shortcut.action}</dt>
										<dd className='flex shrink-0 items-center gap-1'>
											{shortcut.keys.map((key) => (
												<Key key={key}>{key}</Key>
											))}
										</dd>
									</div>
								))}
							</dl>
						</section>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}

/** Opens Keyboard shortcuts on `?`, unless the user is typing. */
function useShortcutsKey(open: () => void) {
	React.useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== shortcutsKey || event.metaKey || event.ctrlKey || event.altKey) return;
			const target = event.target as HTMLElement | null;
			if (target?.closest("input, textarea, select, [contenteditable='true'], [role='menu'], [role='dialog']")) return;
			event.preventDefault();
			open();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [open]);
}

/**
 * Sign out while on shift: hand off first, so the next clinician has what they need (Spec §5.1: start, active, handoff,
 * end). Signing out anyway is allowed.
 */
function SignOutDialog({
	open,
	onOpenChange,
	onStartHandoff,
	onSignOut,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onStartHandoff: () => void;
	onSignOut: () => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='w-[440px]' showCloseButton={false}>
				<DialogHeader>
					<DialogTitle>You're still on shift</DialogTitle>
					<DialogDescription>Hand off your patients before you sign out, so the next clinician has what they need.</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant='ghost'>Cancel</Button>
					</DialogClose>
					<Button
						variant='outline'
						onClick={() => {
							onOpenChange(false);
							onSignOut();
						}}
					>
						Sign out anyway
					</Button>
					<Button
						onClick={() => {
							onOpenChange(false);
							onStartHandoff();
						}}
					>
						Start handoff
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/** After Sign out: the app's mark and a way back in. */
function SignedOutScreen({ onSignIn }: { onSignIn: () => void }) {
	return (
		<main className='relative flex h-screen flex-col items-center bg-background-subtle px-6'>
			<Logo className='mt-16' />
			<EmptyState
				className='absolute inset-0 px-6'
				title="You're signed out"
				description='Sign in to get back to your patients.'
				buttonLabel='Sign in'
				buttonIcon={<LogInIcon aria-hidden='true' />}
				buttonProps={{ onClick: onSignIn }}
			/>
		</main>
	);
}

export { KeyboardShortcutsDialog, SignedOutScreen, SignOutDialog, shortcutsKey, useShortcutsKey };
