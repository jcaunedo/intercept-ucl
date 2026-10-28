import * as React from "react";
import { ArrowUpIcon, AudioLinesIcon, MicIcon, PlusIcon, SlashIcon, SquareIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import { enterTransition, motionDistance, motionScale, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** A slash command: typed as "/name", described in the commands menu. */
type ChatCommand = { name: string; description: string };

type ChatComposerProps = Omit<React.ComponentProps<"form">, "onSubmit" | "children"> & {
	/** The message, controlled. Without it, the composer keeps its own and clears it once sent. */
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	/** Sends the message (Enter, or the Send button). Called with the trimmed text, never empty. */
	onSubmit?: (message: string) => void;
	placeholder?: string;
	/** The field's accessible name. Defaults to `placeholder`, which disappears once the user types. */
	label?: string;
	/** Adds an attachment. Without it, there's no + button. */
	onAttach?: () => void;
	/** Dictates the message. Without it, there's no microphone button. */
	onDictate?: () => void;
	/** Starts a voice conversation. Shown while the message is empty; Send takes its place once there's text. */
	onVoice?: () => void;
	/** An answer is being written: Stop replaces Send and voice, and Enter doesn't send. The field stays editable. */
	generating?: boolean;
	/** Stops the answer being written. */
	onStop?: () => void;
	/**
	 * Slash commands. With them, a slash button opens the commands menu, and so does typing "/" at the start. Picking
	 * one writes "/name " into the message, for the app to act on when it's sent.
	 */
	commands?: ChatCommand[];
	disabled?: boolean;
};

/**
 * A message box for a chat: a text field that grows with its text, + and slash commands on the left, and the microphone
 * and voice (or Send, once there's text) on the right. Enter sends; Shift+Enter starts a new line. While an answer is
 * being written, Stop takes Send's place. The commands menu filters as the command is typed; ↑ ↓ move, Enter or Tab
 * picks, Escape closes it.
 *
 * Figma: [intercept.ds › Chat](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1200-1403)
 */
function ChatComposer({
	value: valueProp,
	defaultValue = "",
	onValueChange,
	onSubmit,
	placeholder = "Message",
	label,
	onAttach,
	onDictate,
	onVoice,
	generating = false,
	onStop,
	commands = [],
	disabled = false,
	className,
	...props
}: ChatComposerProps) {
	const { prefersReducedMotion, resolve } = useMotionPreference();
	const fieldRef = React.useRef<HTMLTextAreaElement>(null);
	const menuId = React.useId();
	const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
	const value = valueProp ?? uncontrolledValue;
	const message = value.trim();

	// The commands menu: open while the message is only a command being typed ("/ha"), or when the slash button asks
	// for it over other text, until it's dismissed.
	const [menuForced, setMenuForced] = React.useState(false);
	const [menuDismissed, setMenuDismissed] = React.useState(false);
	const [activeIndex, setActiveIndex] = React.useState(0);
	const typed = /^\/(\S*)$/.exec(value)?.[1];
	const query = typed ?? (menuForced ? "" : undefined);
	const matches = query === undefined ? [] : commands.filter((command) => command.name.startsWith(query.toLowerCase()));
	const menuOpen = matches.length > 0 && !menuDismissed && !disabled;
	const active = matches[Math.min(activeIndex, matches.length - 1)];

	const setValue = (next: string) => {
		setUncontrolledValue(next);
		onValueChange?.(next);
		setMenuDismissed(false);
		setActiveIndex(0);
	};

	// A picked command replaces the one being typed, or goes before the text already there.
	const pick = (command: ChatCommand) => {
		const rest = value.replace(/^\/\S*\s?/, "");
		setValue(`/${command.name} ${rest}`);
		setMenuForced(false);
		fieldRef.current?.focus();
	};

	const openMenu = () => {
		if (!value) setValue("/");
		else setMenuForced(true);
		setMenuDismissed(false);
		fieldRef.current?.focus();
	};

	const send = () => {
		if (!message || disabled || generating) return;
		onSubmit?.(message);
		setValue("");
	};

	return (
		<form
			data-slot='chat-composer'
			onSubmit={(event) => {
				event.preventDefault();
				send();
			}}
			className={cn(
				// The border sits outside the padding, so the content lands 17 × 14px in, as Figma draws it. `relative` places
				// the commands menu above it.
				"relative flex w-full flex-col gap-3 rounded-3xl border border-border bg-background px-4 py-[13px] shadow-sm transition-[border-color,box-shadow]",
				// The field has no frame of its own: the whole composer takes Input's focus ring.
				"has-[textarea:focus-visible]:border-ring has-[textarea:focus-visible]:ring-[3px] has-[textarea:focus-visible]:ring-ring-outside",
				disabled && "opacity-50",
				className,
			)}
			{...props}
		>
			{/* The commands menu, above the box: styled and animated like the library's menus (fade, a small rise). */}
			<AnimatePresence>
				{menuOpen ? (
					<motion.ul
						key='commands'
						id={menuId}
						role='listbox'
						aria-label='Commands'
						initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: motionScale.popIn, y: motionDistance.subtle }}
						animate={{ opacity: 1, scale: 1, y: 0, transition: resolve(enterTransition) }}
						exit={{ opacity: 0, transition: { duration: 0 } }}
						className='absolute inset-x-0 bottom-full z-50 mb-2 flex max-h-64 origin-bottom flex-col gap-0.5 overflow-y-auto rounded-input border border-border bg-popover p-1 text-popover-foreground shadow-xl'
					>
						{matches.map((command) => (
							<li
								key={command.name}
								id={`${menuId}-${command.name}`}
								role='option'
								aria-selected={command === active}
								// Keeps focus in the field, so picking doesn't close the menu first.
								onMouseDown={(event) => event.preventDefault()}
								onClick={() => pick(command)}
								onMouseMove={() => setActiveIndex(matches.indexOf(command))}
								className='flex cursor-pointer items-baseline gap-2 rounded-md px-2 py-1.5 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground'
							>
								<span className='font-medium'>/{command.name}</span>
								<span className='truncate text-xs text-muted-foreground'>{command.description}</span>
							</li>
						))}
					</motion.ul>
				) : null}
			</AnimatePresence>
			<textarea
				ref={fieldRef}
				value={value}
				onChange={(event) => setValue(event.target.value)}
				onBlur={() => setMenuForced(false)}
				onKeyDown={(event) => {
					if (menuOpen) {
						if (event.key === "ArrowDown" || event.key === "ArrowUp") {
							event.preventDefault();
							const step = event.key === "ArrowDown" ? 1 : -1;
							setActiveIndex((matches.indexOf(active) + step + matches.length) % matches.length);
							return;
						}
						if ((event.key === "Enter" || event.key === "Tab") && !event.shiftKey && !event.nativeEvent.isComposing) {
							event.preventDefault();
							pick(active);
							return;
						}
						if (event.key === "Escape") {
							// Closes the menu only, not a panel or dialog around the composer.
							event.preventDefault();
							event.stopPropagation();
							setMenuDismissed(true);
							setMenuForced(false);
							return;
						}
					}
					// Enter sends, unless it's ending an IME composition or Shift asks for a new line.
					if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
						event.preventDefault();
						send();
					}
				}}
				rows={1}
				placeholder={placeholder}
				aria-label={label ?? placeholder}
				role={commands.length ? "combobox" : undefined}
				aria-autocomplete={commands.length ? "list" : undefined}
				aria-expanded={commands.length ? menuOpen : undefined}
				aria-controls={menuOpen ? menuId : undefined}
				aria-activedescendant={menuOpen && active ? `${menuId}-${active.name}` : undefined}
				disabled={disabled}
				className='field-sizing-content max-h-40 min-h-5 w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-subtle disabled:cursor-not-allowed'
			/>
			<div className='flex items-center justify-between gap-2'>
				<div className='flex items-center gap-2'>
					{onAttach ? (
						<Button
							type='button'
							variant='outline'
							size='icon-sm'
							aria-label='Add attachment'
							onClick={onAttach}
							disabled={disabled}
							className='rounded-button-md'
						>
							<PlusIcon aria-hidden='true' />
						</Button>
					) : null}
					{commands.length ? (
						<Button
							type='button'
							variant='outline'
							size='icon-sm'
							aria-label='Commands'
							aria-expanded={menuOpen}
							aria-controls={menuOpen ? menuId : undefined}
							// Keeps focus in the field, which the menu reads its keys from.
							onMouseDown={(event) => event.preventDefault()}
							onClick={() => (menuOpen ? setMenuDismissed(true) : openMenu())}
							disabled={disabled}
							className='rounded-button-md aria-expanded:bg-accent'
						>
							<SlashIcon aria-hidden='true' />
						</Button>
					) : null}
				</div>
				<div className='flex items-center gap-2'>
					{onDictate ? (
						<Button
							type='button'
							variant='outline'
							size='icon-sm'
							aria-label='Dictate'
							onClick={onDictate}
							disabled={disabled}
							className='rounded-button-md'
						>
							<MicIcon aria-hidden='true' />
						</Button>
					) : null}
					{generating ? (
						<Button
							type='button'
							variant='neutral'
							size='icon-sm'
							aria-label='Stop generating'
							onClick={onStop}
							disabled={disabled}
							className='rounded-button-md'
						>
							<SquareIcon aria-hidden='true' className='size-3 fill-current' />
						</Button>
					) : message || !onVoice ? (
						<Button
							type='submit'
							variant='neutral'
							size='icon-sm'
							aria-label='Send'
							disabled={disabled || !message}
							className='rounded-button-md'
						>
							<ArrowUpIcon aria-hidden='true' />
						</Button>
					) : (
						<Button
							type='button'
							variant='neutral'
							size='icon-sm'
							aria-label='Start voice conversation'
							onClick={onVoice}
							disabled={disabled}
							className='rounded-button-md'
						>
							<AudioLinesIcon aria-hidden='true' />
						</Button>
					)}
				</div>
			</div>
		</form>
	);
}

export { ChatComposer, type ChatCommand, type ChatComposerProps };
