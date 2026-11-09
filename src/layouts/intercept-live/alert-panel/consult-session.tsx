import * as React from "react";

// A patient's consult as one session across the places that show it (Nov 5, 2026, user's call: "if I switch to the
// patient details page by clicking on the name, the call and chat, open or close, should pass over"). The alert panel
// and the patient page's Video consult and Messages panels keep the call, its notetaker and transcript, and the thread
// with the bedside nurse here, by patient, so whichever shows the patient next picks the consult up where it was: the
// call still live and its timer running, Messages open or closed, the notetaker recording.
//
// Each place that shows a patient's consult wraps it in a `ConsultSessionScope`. Scopes on the same patient share its
// session; the newest one owns it (only the owner's changes are kept, so the alert panel fading out behind the patient
// page can't undo anything), and when the last one goes (the alert closed, Back, another patient) the session ends with
// it, as a consult did when its panel closed. Without the shell's `ConsultSessionProvider`, or outside a scope, every
// piece keeps its own state, as before.

type Listener = () => void;

/** The shell's sessions: values by patient and key, and who owns each patient's session. */
class ConsultSessionStore {
	private values = new Map<string, Map<string, unknown>>();
	private owners = new Map<string, symbol[]>();
	private listeners = new Set<Listener>();

	subscribe = (listener: Listener) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};

	has(patientId: string, key: string) {
		return this.values.get(patientId)?.has(key) ?? false;
	}

	get(patientId: string, key: string) {
		return this.values.get(patientId)?.get(key);
	}

	/** Keeps a change from the session's owner; a scope that's leaving can't overwrite it. */
	set(patientId: string, key: string, value: unknown, by: symbol) {
		if (this.owners.get(patientId)?.at(-1) !== by) return;
		if (this.get(patientId, key) === value && this.has(patientId, key)) return;
		let values = this.values.get(patientId);
		if (!values) this.values.set(patientId, (values = new Map()));
		values.set(key, value);
		this.listeners.forEach((listener) => listener());
	}

	/** A scope joins the patient's session; the newest owns it. Idempotent, so it can run as the scope renders. */
	claim(patientId: string, by: symbol) {
		const owners = this.owners.get(patientId) ?? [];
		if (!owners.includes(by)) this.owners.set(patientId, [...owners, by]);
	}

	/** A scope leaves; the last one to leave ends the session. */
	release(patientId: string, by: symbol) {
		const owners = (this.owners.get(patientId) ?? []).filter((owner) => owner !== by);
		if (owners.length) {
			this.owners.set(patientId, owners);
			return;
		}
		this.owners.delete(patientId);
		if (this.values.delete(patientId)) this.listeners.forEach((listener) => listener());
	}
}

const StoreContext = React.createContext<ConsultSessionStore | null>(null);
const ScopeContext = React.createContext<{ patientId: string; token: symbol } | null>(null);

/** The shell's consult sessions, around everything that can show a consult (the pages, the alert, the patient page). */
function ConsultSessionProvider({ children }: { children: React.ReactNode }) {
	const [store] = React.useState(() => new ConsultSessionStore());
	return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

/** Joins the patient's consult session for everything inside it; leaving ends the session if nothing else shows it. */
function ConsultSessionScope({
	patientId,
	active = true,
	children,
}: {
	patientId: string;
	/** In the session only while true, e.g. a dialog that stays mounted once closed. */
	active?: boolean;
	children: React.ReactNode;
}) {
	const store = React.useContext(StoreContext);
	const [token] = React.useState(() => Symbol(patientId));
	// As it renders, so its children's first effects already write to the session it owns.
	if (active) store?.claim(patientId, token);
	React.useEffect(() => {
		if (!active) return;
		store?.claim(patientId, token);
		return () => store?.release(patientId, token);
	}, [store, patientId, token, active]);
	const scope = React.useMemo(() => ({ patientId, token }), [patientId, token]);
	return <ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>;
}

const noSubscribe = () => () => {};

/**
 * `useState`, kept in the patient's consult session under `key` when inside a scope: a place that shows the patient
 * next starts from it. `initial` is used until the session has a value.
 */
function useSessionState<T>(key: string, initial: T | (() => T)) {
	const store = React.useContext(StoreContext);
	const scope = React.useContext(ScopeContext);
	const shared = store && scope ? { store, scope } : null;
	const [local, setLocal] = React.useState<T>(initial);
	const stored = React.useSyncExternalStore(
		shared ? shared.store.subscribe : noSubscribe,
		() => (shared?.store.has(shared.scope.patientId, key) ? (shared.store.get(shared.scope.patientId, key) as T) : undefined),
		() => undefined,
	);
	const hasStored = shared ? shared.store.has(shared.scope.patientId, key) : false;
	const value = shared && hasStored ? (stored as T) : local;
	const latest = React.useRef({ shared, local, key });
	latest.current = { shared, local, key };
	const setValue = React.useCallback((next: T | ((current: T) => T)) => {
		const { shared: current, key: name } = latest.current;
		if (!current) {
			setLocal(next);
			return;
		}
		const { store: sessions, scope: own } = current;
		const previous = sessions.has(own.patientId, name)
			? (sessions.get(own.patientId, name) as T)
			: latest.current.local;
		const resolved = typeof next === "function" ? (next as (value: T) => T)(previous) : next;
		sessions.set(own.patientId, name, resolved, own.token);
	}, []);
	return [value, setValue] as const;
}

/**
 * Reads the patient's session as it is now, outside React's render: whether it holds `key` and its value. For code that
 * runs after the place showing it has gone (an unmount's cleanup, a timer), e.g. to tell whether another place picked
 * the call up or the session ended with it. Outside a scope, always nothing.
 */
function useSessionPeek() {
	const store = React.useContext(StoreContext);
	const scope = React.useContext(ScopeContext);
	return React.useCallback(
		(key: string): { held: boolean; value?: unknown } =>
			store && scope && store.has(scope.patientId, key)
				? { held: true, value: store.get(scope.patientId, key) }
				: { held: false },
		[store, scope],
	);
}

export { ConsultSessionProvider, ConsultSessionScope, useSessionPeek, useSessionState };
