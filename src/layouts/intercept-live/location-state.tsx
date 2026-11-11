import * as React from "react";

/**
 * What the shell keeps in step with the address beside the page, the patient and the alert (Nov 11, 2026, user's call:
 * "add the tabs to the URL, so I can share the link… also track in the URL if a modal is open, a sidepanel expanded").
 * Each is a string, missing at its default:
 *
 * | Key           | Value                                                         | Set by                    |
 * | ------------- | ------------------------------------------------------------- | ------------------------- |
 * | `tab`         | A patient's tab other than Overview (`vitals`, `chart`, `emr`…) | `PatientDetailsContent`   |
 * | `panels`      | A patient page's open panels: `video`, `alerts`, `feed`, `messages`, `pathway` | `PatientDetailsContent` |
 * | `alertPanels` | The alert modal's open panels: `video`, `messages`, `pathway` | `AlertPanel`              |
 * | `side`        | The left panel: `chat` (Ask Intercept Live) or `patients`     | `InterceptLive`           |
 * | `feed`        | `1` while the page's live feed is open                        | Census and Monitoring     |
 * | `filters`     | `1` while the page's Filters panel is open                    | Census and Monitoring     |
 *
 * Lists are comma-separated. The shell reports them with the rest of the location (`onLocationChange`'s `state`), and
 * takes the ones a shared link opens with as `defaultLocationState`.
 */
const locationStateKeys = ["tab", "panels", "alertPanels", "side", "feed", "filters"] as const;

type LocationStateKey = (typeof locationStateKeys)[number];
type LocationState = Partial<Record<LocationStateKey, string>>;

type LocationStateStore = {
	/** The values the prototype opened with, each read once by the first part that asks for it. */
	initial: React.RefObject<LocationState>;
	report: (key: LocationStateKey, value: string | undefined) => void;
};

const LocationStateContext = React.createContext<LocationStateStore | null>(null);

/**
 * The shell's store: `defaultState` for the parts that open first, and `state`, what they report now. `side` is the
 * shell's own and isn't reported through it.
 */
function useLocationStateStore(defaultState: LocationState = {}) {
	const initial = React.useRef<LocationState>({ ...defaultState });
	const [state, setState] = React.useState<LocationState>({});
	const report = React.useCallback((key: LocationStateKey, value: string | undefined) => {
		setState((current) => {
			if (current[key] === value) return current;
			const next = { ...current };
			if (value === undefined) delete next[key];
			else next[key] = value;
			return next;
		});
	}, []);
	const store = React.useMemo<LocationStateStore>(() => ({ initial, report }), [report]);
	return { store, state };
}

/**
 * The value a shared link opened with for `key`, for the first part that mounts with it: once it has mounted the
 * value is used up, so a part that opens later (another patient's page, the next alert) starts at its default.
 */
function useInitialLocation(key: LocationStateKey) {
	const store = React.useContext(LocationStateContext);
	const [initial] = React.useState(() => store?.initial.current[key]);
	React.useEffect(() => {
		if (store) delete store.initial.current[key];
	}, [store, key]);
	return initial;
}

/** Reports `value` for `key` while the part is mounted (undefined: at its default), and clears it when it unmounts. */
function useLocationReport(key: LocationStateKey, value: string | undefined) {
	const store = React.useContext(LocationStateContext);
	React.useEffect(() => {
		store?.report(key, value);
	}, [store, key, value]);
	React.useEffect(() => () => store?.report(key, undefined), [store, key]);
}

/**
 * `useState` for a value the address keeps: starts from a shared link's (`parse` turns it into a value, or undefined
 * for one it doesn't know), else `fallback`, and reports each change. Outside the shell, plain state.
 */
function useLocationState<T extends string>(
	key: LocationStateKey,
	fallback: T,
	parse: (value: string) => T | undefined = (value) => value as T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
	const initial = useInitialLocation(key);
	const [value, setValue] = React.useState<T>(() => (initial === undefined ? undefined : parse(initial)) ?? fallback);
	useLocationReport(key, value === fallback ? undefined : value);
	return [value, setValue];
}

/** `useLocationState` for something open or closed: `1` in the address while open. */
function useLocationFlag(key: LocationStateKey): [boolean, React.Dispatch<React.SetStateAction<boolean>>] {
	const initial = useInitialLocation(key);
	const [value, setValue] = React.useState(() => initial === "1" || initial === "true");
	useLocationReport(key, value ? "1" : undefined);
	return [value, setValue];
}

/** A list value (`panels`, `alertPanels`): the names in it, in the order given. */
const parseLocationList = (value: string | undefined) => (value ? value.split(",").filter(Boolean) : []);

/** A list value from its names, the ones that are on; undefined when none is. */
const formatLocationList = (entries: Array<string | false | null | undefined>) =>
	entries.filter(Boolean).join(",") || undefined;

const LocationStateProvider = LocationStateContext.Provider;

export {
	formatLocationList,
	LocationStateProvider,
	locationStateKeys,
	parseLocationList,
	useInitialLocation,
	useLocationFlag,
	useLocationReport,
	useLocationState,
	useLocationStateStore,
	type LocationState,
	type LocationStateKey,
};
