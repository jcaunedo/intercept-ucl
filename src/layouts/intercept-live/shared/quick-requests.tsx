import * as React from "react";
import { SparklesIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import type { ChatCommand } from "@/components/forms/chat-composer";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/forms/field";
import { Input } from "@/components/forms/input";
import { Textarea } from "@/components/forms/textarea";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/overlays/dialog";

// Quick requests (PRD Messages MSG-005): the commands a thread's message box offers on "/", each writing a request to the
// bedside into the field, to finish and send. The built-in ones are product content; the clinician adds their own from
// the menu's Add command, kept for the session by the shell (QuickRequestsProvider).

/** One quick request: "/name", what the menu says it does, and the message it writes. */
type QuickRequest = {
	/** Typed after the slash: lowercase letters, numbers and hyphens. */
	name: string;
	/** Beside it in the menu: "Ask for a new set of vitals". */
	description?: string;
	/** What it writes into the field. `{patient}`, `{first name}` and `{nurse}` are filled from the conversation. */
	message: string;
	/**
	 * How Intercept should adapt the message to the conversation and the patient's chart ("Ask for the vitals that
	 * changed most since the nurse's last message"). Only the clinician's own commands have them.
	 */
	instructions?: string;
	/** Made by the clinician (Add command), not built in. */
	custom?: boolean;
};

const builtInQuickRequests: QuickRequest[] = [
	{ name: "vitals", description: "Ask for a new set of vitals", message: "Can you send a new set of vitals?" },
	{ name: "photo", description: "Ask for a photo", message: "Can you send a photo of " },
	{ name: "callback", description: "Ask them to call you", message: "Please call me when you can." },
	{ name: "labs", description: "Ask for the latest labs", message: "Can you send the latest labs as soon as they result?" },
	{ name: "lactate", description: "Ask for a repeat lactate", message: "Can you draw a repeat lactate and let me know when it's back?" },
	{ name: "abg", description: "Ask for a blood gas", message: "Can you get an ABG and send me the results?" },
	{ name: "ecg", description: "Ask for a 12-lead ECG", message: "Can you get a 12-lead ECG and send me a photo of it?" },
	{ name: "camera", description: "Ask to turn on the bedside camera", message: "Can you turn on the bedside camera? I'd like to take a look." },
	{ name: "neuro", description: "Ask for a neuro check", message: "Can you do a neuro check and let me know what you find?" },
	{ name: "io", description: "Ask for intake and output", message: "What's the intake and output over the last 12 hours?" },
	{ name: "drips", description: "Ask to confirm drips and rates", message: "Can you confirm the current drips and rates?" },
	{ name: "pain", description: "Ask for a pain score", message: "What's the pain score, and when was the last dose?" },
	{ name: "recheck", description: "Ask for a recheck in 15 minutes", message: "Please recheck vitals in 15 minutes and message me." },
	{ name: "family", description: "Ask whether the family is there", message: "Is the family at the bedside? I'd like to update them." },
	{ name: "ack", description: "Let them know you're on it", message: "Got it, thank you. Reviewing now." },
];

/** What a command's message is filled from: the patient the conversation is about, and who it's with. */
type QuickRequestContext = { patient?: string; nurse?: string };

/**
 * What a drafter reads to follow a command's instructions: the patient (their id, to read their chart), who the thread
 * is with, and the thread's messages, oldest first.
 */
type QuickRequestDraftContext = QuickRequestContext & {
	patientId?: string;
	messages: { from: "bedside" | "you"; text: string; sentAt: string }[];
};

/**
 * Writes a command's message following its instructions, from the conversation and the patient's chart: the clinical
 * data agent in the app (`InterceptLive`'s `draftQuickRequest`). The result goes into the message box for the clinician
 * to review; it's never sent on its own.
 */
type QuickRequestDrafter = (request: QuickRequest, context: QuickRequestDraftContext) => Promise<string>;

/** The message with its placeholders filled; with no patient, "the patient". */
function fillQuickRequest(message: string, { patient, nurse }: QuickRequestContext) {
	const firstName = patient?.split(" ")[0];
	return message
		.replaceAll("{patient}", patient ?? "the patient")
		.replaceAll("{first name}", firstName ?? "the patient")
		.replaceAll("{nurse}", nurse?.split(",")[0].split(" ")[0] ?? "");
}

type QuickRequestsValue = {
	requests: QuickRequest[];
	add: (request: QuickRequest) => void;
	/** Follows a command's instructions; none outside the shell or without the app's drafter. */
	draft?: QuickRequestDrafter;
};

const QuickRequestsContext = React.createContext<QuickRequestsValue | null>(null);

/**
 * Keeps the clinician's own commands for the session, so every thread offers them, and the app's drafter, which writes
 * a command's message from its instructions. The shell provides it.
 */
function QuickRequestsProvider({ draft, children }: { draft?: QuickRequestDrafter; children: React.ReactNode }) {
	const own = useOwnQuickRequests();
	const value = React.useMemo(() => ({ ...own, draft }), [own, draft]);
	return <QuickRequestsContext.Provider value={value}>{children}</QuickRequestsContext.Provider>;
}

function useOwnQuickRequests(): QuickRequestsValue {
	const [custom, setCustom] = React.useState<QuickRequest[]>([]);
	const add = React.useCallback((request: QuickRequest) => setCustom((current) => [...current, { ...request, custom: true }]), []);
	return React.useMemo(() => ({ requests: [...builtInQuickRequests, ...custom], add }), [custom, add]);
}

/** Every quick request, built in then the clinician's, and `add`. Outside the shell, a thread keeps its own. */
function useQuickRequests() {
	const shared = React.useContext(QuickRequestsContext);
	const own = useOwnQuickRequests();
	return shared ?? own;
}

/** The requests as the composer's commands: picking one hands it to `pick`, which writes or drafts its message. */
function quickRequestCommands(requests: QuickRequest[], pick: (request: QuickRequest) => void): ChatCommand[] {
	return requests.map((request) => ({
		name: request.name,
		description: request.description,
		onSelect: () => pick(request),
	}));
}

const namePattern = /^[a-z0-9][a-z0-9-]*$/;

/**
 * The form Add command opens: the command, what the menu says it does, the message it writes and, optionally, how
 * Intercept should adapt it to the conversation.
 */
function AddQuickRequestDialog({
	open,
	onOpenChange,
	defaultName = "",
	taken,
	onAdd,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** The command being typed when Add command was picked. */
	defaultName?: string;
	/** Names already in use. */
	taken: string[];
	onAdd: (request: QuickRequest) => void;
}) {
	const [name, setName] = React.useState(defaultName);
	const [description, setDescription] = React.useState("");
	const [message, setMessage] = React.useState("");
	const [instructions, setInstructions] = React.useState("");
	const [submitted, setSubmitted] = React.useState(false);
	const ids = React.useId();

	// Each opening starts afresh, with the name that was being typed.
	React.useEffect(() => {
		if (!open) return;
		setName(defaultName.toLowerCase());
		setDescription("");
		setMessage("");
		setInstructions("");
		setSubmitted(false);
	}, [open, defaultName]);

	const nameError = !name
		? "Give the command a name."
		: !namePattern.test(name)
			? "Use lowercase letters, numbers and hyphens."
			: taken.includes(name)
				? `/${name} already exists.`
				: undefined;
	const messageError = message.trim() ? undefined : "Write the message it sends.";

	const submit = (event: React.FormEvent) => {
		event.preventDefault();
		setSubmitted(true);
		if (nameError || messageError) return;
		onAdd({
			name,
			description: description.trim() || undefined,
			message: message.trim(),
			instructions: instructions.trim() || undefined,
		});
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='w-[520px]'>
				<form onSubmit={submit} noValidate className='flex min-h-0 flex-col'>
					<DialogHeader>
						<DialogTitle>Add command</DialogTitle>
						<DialogDescription>
							Type it after "/" in any conversation to write a request you send often.
						</DialogDescription>
					</DialogHeader>
					<FieldGroup className='px-6'>
						<Field data-invalid={submitted && nameError ? true : undefined}>
							<FieldLabel htmlFor={`${ids}-name`}>Command</FieldLabel>
							<div className='relative'>
								<span aria-hidden className='pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-base text-muted-foreground'>
									/
								</span>
								<Input
									id={`${ids}-name`}
									value={name}
									onChange={(event) => setName(event.target.value.toLowerCase().replace(/\s+/g, "-"))}
									placeholder='sitrep'
									autoComplete='off'
									aria-invalid={submitted && nameError ? true : undefined}
									className='pl-6'
								/>
							</div>
							{submitted && nameError ? <FieldError>{nameError}</FieldError> : null}
						</Field>
						<Field>
							<FieldLabel htmlFor={`${ids}-description`}>Description</FieldLabel>
							<Input
								id={`${ids}-description`}
								value={description}
								onChange={(event) => setDescription(event.target.value)}
								placeholder='Ask for a situation update'
							/>
							<FieldDescription>Shown beside the command in the menu.</FieldDescription>
						</Field>
						<Field data-invalid={submitted && messageError ? true : undefined}>
							<FieldLabel htmlFor={`${ids}-message`}>Message</FieldLabel>
							<Textarea
								id={`${ids}-message`}
								value={message}
								onChange={(event) => setMessage(event.target.value)}
								placeholder="Can you give me a quick update on {first name}? How are things since the last check?"
								aria-invalid={submitted && messageError ? true : undefined}
								rows={3}
							/>
							<FieldDescription>
								Written into the message box to review before sending. {"{patient}"}, {"{first name}"} and {"{nurse}"} are
								filled in from the conversation.
							</FieldDescription>
							{submitted && messageError ? <FieldError>{messageError}</FieldError> : null}
						</Field>
						<Field>
							<FieldLabel htmlFor={`${ids}-instructions`} className='gap-1.5'>
								<SparklesIcon aria-hidden className='size-4 text-icon-muted' />
								Instructions for Intercept (optional)
							</FieldLabel>
							<Textarea
								id={`${ids}-instructions`}
								value={instructions}
								onChange={(event) => setInstructions(event.target.value)}
								placeholder="Mention the vitals that changed most since the nurse's last message, with their values."
								rows={3}
							/>
							<FieldDescription>
								With instructions, Intercept drafts the message each time from the conversation and the patient's chart,
								starting from the message above, for you to review before sending.
							</FieldDescription>
						</Field>
					</FieldGroup>
					<DialogFooter>
						<DialogClose asChild>
							<Button type='button' variant='ghost'>
								Cancel
							</Button>
						</DialogClose>
						<Button type='submit'>Add command</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export {
	AddQuickRequestDialog,
	builtInQuickRequests,
	fillQuickRequest,
	QuickRequestsProvider,
	quickRequestCommands,
	useQuickRequests,
	type QuickRequest,
	type QuickRequestContext,
	type QuickRequestDraftContext,
	type QuickRequestDrafter,
};
