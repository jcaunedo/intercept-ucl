import * as React from "react";
import { LanguagesIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import { Avatar, AvatarBadge, AvatarFallback, type AvatarFallbackProps } from "@/components/data-display/avatar";
import { fadeVariants } from "@/lib/motion";

import { useSessionState } from "./consult-session";

// Mock (Demo Use Cases, Scenario 3, step 2: "Interpreter in the room"): the patient's preferred language isn't English,
// so the video consult offers to add a medical interpreter as soon as it's on. Add interpreter calls the hospital's
// interpreter service; the prototype stands in for it with a short wait, then the interpreter joins. Not the family:
// care decisions go through a qualified medical interpreter. Kept in the patient's consult session, so the
// interpreter stays on the call wherever it's shown next (the alert, the patient's page).

/** Who the interpreter service sends, e.g. "Lucía Herrera", "Medical interpreter, Spanish". */
type ConsultInterpreter = {
	name: string;
	role: string;
	initials: string;
	tone?: AvatarFallbackProps["tone"];
};

type InterpreterState = "offered" | "connecting" | "joined" | "dismissed";

// Stands in for the interpreter service connecting, so the prototype shows Connecting.
const CONNECT_INTERPRETER_MS = 3000;

/**
 * The interpreter prompt under the call: the patient's preferred language and Add interpreter, then Connecting, then
 * the interpreter on the call (Remove takes them off). Dismissing the prompt hides it for this call. Shown only while
 * the call is live and only for a language other than English.
 */
function InterpreterPrompt({
	firstName,
	language,
	interpreter,
	live,
}: {
	firstName?: string;
	/** The patient's preferred language, e.g. "Spanish". */
	language: string;
	interpreter?: ConsultInterpreter;
	live: boolean;
}) {
	const [state, setState] = useSessionState<InterpreterState>("interpreter", "offered");
	React.useEffect(() => {
		if (state !== "connecting") return;
		const timer = window.setTimeout(() => setState("joined"), CONNECT_INTERPRETER_MS);
		return () => window.clearTimeout(timer);
	}, [state, setState]);
	// A new call offers it again; one that ends takes the interpreter off.
	React.useEffect(() => {
		if (!live) setState((current) => (current === "dismissed" ? current : "offered"));
	}, [live, setState]);
	const who = firstName ?? "The patient";
	const show = live && state !== "dismissed";

	return (
		<AnimatePresence initial={false}>
			{show ? (
				<motion.div
					key='interpreter'
					variants={fadeVariants}
					initial='initial'
					animate='animate'
					exit='exit'
					role='status'
					className='flex items-start gap-3 rounded-card border border-border bg-background p-4'
				>
					<AnimatePresence mode='wait' initial={false}>
						{state === "joined" && interpreter ? (
							<motion.div
								key='joined'
								variants={fadeVariants}
								initial='initial'
								animate='animate'
								exit='exit'
								className='flex flex-1 items-center gap-3'
							>
								<Avatar size='md' className='overflow-visible'>
									<AvatarFallback tone={interpreter.tone}>{interpreter.initials}</AvatarFallback>
									<AvatarBadge />
								</Avatar>
								<p className='flex min-w-0 flex-1 flex-col text-sm'>
									<span className='font-semibold text-foreground'>{interpreter.name} joined the call</span>
									<span className='text-muted-foreground'>{interpreter.role}</span>
								</p>
								<Button variant='ghost' size='sm' onClick={() => setState("offered")}>
									Remove
								</Button>
							</motion.div>
						) : (
							<motion.div
								key='offer'
								variants={fadeVariants}
								initial='initial'
								animate='animate'
								exit='exit'
								className='flex flex-1 items-start gap-3'
							>
								<LanguagesIcon aria-hidden='true' className='mt-0.5 size-4 shrink-0 text-icon' />
								<div className='flex min-w-0 flex-1 flex-col gap-2'>
									<p className='text-sm text-foreground'>
										<span className='font-semibold'>
											{who} prefers {language}.
										</span>{" "}
										Add a medical interpreter to the call?
									</p>
									<div>
										<Button
											variant='outline'
											size='sm'
											loading={state === "connecting"}
											onClick={() => setState("connecting")}
										>
											Add interpreter
										</Button>
										{state === "connecting" ? (
											<span className='ml-3 text-xs text-muted-foreground'>
												Connecting a {language} interpreter
											</span>
										) : null}
									</div>
								</div>
								<Button
									variant='ghost'
									size='icon-xs'
									aria-label='Dismiss interpreter prompt'
									onClick={() => setState("dismissed")}
									className='text-muted-foreground'
								>
									<XIcon />
								</Button>
							</motion.div>
						)}
					</AnimatePresence>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}

export { InterpreterPrompt, type ConsultInterpreter };
