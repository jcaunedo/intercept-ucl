import * as React from "react";
import {
	ArrowDownUpIcon,
	ArrowUpIcon,
	BellIcon,
	FlagIcon,
	SparklesIcon,
	UsersIcon,
	VideoIcon,
	WebcamIcon,
	type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, type TargetAndTransition, type Transition, type Variants } from "motion/react";

import {
	patientCardAcuityLevels,
	type PatientCardAcuityLevel,
	type PatientCardAction,
	type PatientCardAlertVariant,
	type PatientCensusCardProps,
} from "@/components/cards/patient-census-card";
import { Counter } from "@/components/data-display/counter";
import { FilterBarChip } from "@/components/forms/filter-bar";
import { HospitalSectionHeader } from "@/components/data-display/hospital-section-header";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/forms/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/navigation/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/overlays/tooltip";
import {
	fadeVariants,
	motionDistance,
	motionDuration,
	reducedMotionTransition,
	reorderSpring,
	revealVariants,
	scrollContainerOf,
	useMotionPreference,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

import { usePagePreferences, type SortPage } from "../page-preferences";
import { usePatientNavigation, type PatientNavigation } from "../patient-navigation";
import { isPressorFlag } from "./pressors";

// The patient list both Census and Monitoring filter, sort and group, so the two pages behave the same (PRD Monitoring
// MON-AC-11). Each page adds the data its own card needs.

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

type PanelHospital = { id: string; name: string };

type PanelPatient = Pick<
	PatientCensusCardProps,
	| "lastName"
	| "firstName"
	| "mrn"
	| "sex"
	| "age"
	| "hospital"
	| "unit"
	| "room"
	| "bed"
	| "alert"
	| "acuity"
	| "trajectory"
	| "tags"
> & {
	id: string;
	hospitalId: string;
	/** Assigned to the signed-in clinician this shift. */
	mine?: boolean;
	/** The acuity score's change over the last 4 h, which ranks patients within an alert severity (DU-09). */
	scoreChange4h?: number;
	/** When the signed-in clinician last opened the patient's details, ISO 8601. For the Recently viewed sort. */
	lastViewedAt?: string;
	/** When the patient's most recent alert was resolved, ISO 8601. For the Recently resolved sort. */
	lastResolvedAt?: string;
	/** Unread messages from the patient's family. For the Family messages sort (Monitoring's cards show them). */
	unreadMessages?: number;
	/** When the patient's most recent open alert fired, ISO 8601. For the Alerts sort (newest first). */
	lastAlertAt?: string;
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

const severityRank: Record<PatientCardAlertVariant, number> = {
	critical: 4,
	high: 3,
	medium: 2,
	low: 1,
	resolved: 0,
	message: 0,
};

// With the pressor flags, which carry their count ("2 pressors").
const organSupportTags = ["Ventilated", "NIV", "ECMO", "Dialysis"];

// Search text: any case, and the card's minus sign (−) matches a typed hyphen.
const searchable = (text: string) => text.toLowerCase().replace(/[−–]/g, "-");

/**
 * Whether a patient matches the filter bar's search: every word typed (commas ignored, so "Miller, Sarah" works)
 * appears in what their card shows: name, MRN, sex and age, hospital, unit, room and bed, the alert, the score with its
 * name and band ("NEWS2 17 High"), its 24 h change and the tags, plus any `extra` the page's card adds (Monitoring's
 * live vitals). An empty search matches everyone.
 */
const matchesSearch = (patient: PanelPatient, query: string, extra: (string | number | undefined)[] = []) => {
	const words = searchable(query).split(/[\s,]+/).filter(Boolean);
	if (!words.length) return true;
	const { acuity, alert, trajectory } = patient;
	// The band the card shows: a score without a value reads Unknown.
	const level = acuity?.level ?? (acuity && acuity.score === undefined ? "unknown" : undefined);
	const text = searchable(
		[
			patient.lastName,
			patient.firstName,
			patient.mrn,
			patient.sex,
			patient.age,
			patient.hospital,
			patient.unit,
			patient.room,
			patient.bed,
			alert?.label ?? alert?.variant,
			acuity?.label,
			acuity?.score,
			level ? patientCardAcuityLevels[level].label : undefined,
			trajectory?.value,
			...(patient.tags ?? []).map((tag) => tag.label),
			...extra,
		]
			.filter((part) => part !== undefined && part !== "")
			.join(" "),
	);
	return words.every((word) => text.includes(word));
};

/** Whether a patient has an active alert: a severity, not a resolved alert or a message. */
const hasActiveAlert = (patient: PanelPatient) =>
	Boolean(patient.alert && patient.alert.variant !== "resolved" && patient.alert.variant !== "message");

const hasRisingAcuity = (patient: PanelPatient) => patient.trajectory?.trend === "up";

const hasOrganSupport = (patient: PanelPatient) =>
	(patient.tags ?? []).some((tag) => organSupportTags.includes(tag.label) || isPressorFlag(tag.label));

/** Active alerts across patients: each card's count (1 when it has none), leaving out resolved alerts and messages. */
const activeAlertCount = (patients: PanelPatient[]) =>
	patients.reduce((total, patient) => (hasActiveAlert(patient) ? total + (patient.alert?.count ?? 1) : total), 0);

/** The worst active alert among the patients, which colors a hospital tab's alert count. */
function topSeverity(patients: PanelPatient[]): AlertSeverity | undefined {
	const worst = patients.reduce<PatientCardAlertVariant | undefined>((current, patient) => {
		if (!patient.alert || !hasActiveAlert(patient)) return current;
		return !current || severityRank[patient.alert.variant] > severityRank[current] ? patient.alert.variant : current;
	}, undefined);
	return isSeverity(worst) ? worst : undefined;
}

const byName = (a: PanelPatient, b: PanelPatient) =>
	a.lastName.localeCompare(b.lastName) || (a.firstName ?? "").localeCompare(b.firstName ?? "");

// Descending by a number; patients without one go last.
const descending = (value: (patient: PanelPatient) => number | undefined) => (a: PanelPatient, b: PanelPatient) => {
	const left = value(a);
	const right = value(b);
	if (left === undefined || right === undefined) return left === right ? 0 : left === undefined ? 1 : -1;
	return right - left;
};

// The 24h score change arrives preformatted ("+2", "−1", "0"). An API would send the number; the layout reads it back.
const acuityChange = (patient: PanelPatient) => {
	const value = patient.trajectory?.value;
	if (value === undefined || patient.trajectory?.variant === "missing") return undefined;
	const number = Number(String(value).replace("−", "-"));
	return Number.isNaN(number) ? undefined : number;
};

// Worst alert first; patients without one last. A resolved alert ranks as none, so its card moves once, when it
// resolves, and not again when its "Resolved" pill fades (useFadingResolvedAlerts).
const alertRank = (patient: PanelPatient) =>
	patient.alert && patient.alert.variant !== "resolved" ? severityRank[patient.alert.variant] : -1;
const byAlert = (a: PanelPatient, b: PanelPatient) => alertRank(b) - alertRank(a);

// Highest acuity score first; patients without one last.
const byAcuity = descending((patient) => (typeof patient.acuity?.score === "number" ? patient.acuity.score : undefined));

// Sickest acuity band first, then the larger 4 h rise in the score (DU-09), as the triage queue ranks its alerts.
const acuityBands: Record<PatientCardAcuityLevel, number> = { critical: 5, high: 4, medium: 3, moderate: 3, low: 1, unknown: 0 };
const byBand = descending((patient) => (patient.acuity?.level ? acuityBands[patient.acuity.level] : undefined));
const byRise = descending((patient) => patient.scoreChange4h);

// Most recent first; patients never viewed, or with nothing resolved, last.
const time = (value?: string) => (value ? Date.parse(value) : undefined);
const byViewed = descending((patient) => time(patient.lastViewedAt));
const byResolved = descending((patient) => time(patient.lastResolvedAt));
// The newest open alert first (Oct 31, 2026, user's call); an open alert without a time after those, then patients
// without an open alert.
const byNewestAlert = descending((patient) => (hasActiveAlert(patient) ? (time(patient.lastAlertAt) ?? 0) : undefined));
// The longest-waiting open alert first (`alert.since`, when the top alert started); patients without a time last.
const byLongestActive = descending((patient) =>
	hasActiveAlert(patient) && patient.alert?.since ? -Date.parse(patient.alert.since) : undefined,
);

/**
 * Who to see first, for the Active alerts chip (Oct 31, 2026, user's call), in the live feed's work-list order (DU-09)
 * so the first card and the queue's first alert agree: the worst alert's severity; then the acuity band; then the larger
 * score rise over 4 h (a jumping score outranks a high, steady one: Scenario 1's Hayes above Miller); then the alert
 * that has waited longest; then the higher score; then name, so ties never flicker.
 */
const byAlertPriority = (a: PanelPatient, b: PanelPatient) =>
	byAlert(a, b) || byBand(a, b) || byRise(a, b) || byLongestActive(a, b) || byAcuity(a, b) || byName(a, b);

// The most unread family messages first; patients without any last.
const byMessages = descending((patient) => patient.unreadMessages || undefined);

// Sort orders. Alert ranks like the triage queue (severity, band, 4 h rise), then by score; Acuity breaks ties by
// alert, so both signals count in either lens; then by name, so the order is stable.
const sortOrders = [
	{
		id: "alert",
		// "Alerts" (Nov 2, 2026, user's call; "Alert", "Alerts", then "Recent alerts" from Oct 31, 2026).
		label: "Alerts",
		// Newest first, not by severity (Oct 31, 2026, user's call): the Active alerts chip orders by severity.
		compare: (a: PanelPatient, b: PanelPatient) => byNewestAlert(a, b) || byName(a, b),
	},
	{ id: "acuity", label: "Score", compare: (a: PanelPatient, b: PanelPatient) => byAcuity(a, b) || byAlert(a, b) || byName(a, b) },
	{
		id: "change",
		label: "Score change",
		compare: (a: PanelPatient, b: PanelPatient) => descending(acuityChange)(a, b) || byName(a, b),
	},
	// Last name, then first name, A–Z. "Patient name" (Oct 31, 2026, user's call; was "Name"), next to Family messages.
	{ id: "name", label: "Patient name", compare: byName },
	{ id: "viewed", label: "Recently viewed", compare: (a: PanelPatient, b: PanelPatient) => byViewed(a, b) || byName(a, b) },
	{
		id: "resolved",
		label: "Recently resolved",
		compare: (a: PanelPatient, b: PanelPatient) => byResolved(a, b) || byName(a, b),
	},
	{
		id: "messages",
		label: "Family messages",
		compare: (a: PanelPatient, b: PanelPatient) => byMessages(a, b) || byName(a, b),
	},
] as const;

type SortOrderId = (typeof sortOrders)[number]["id"];

const sortOrderById = (id: SortOrderId) => sortOrders.find((order) => order.id === id) ?? sortOrders[0];

/**
 * The panel's order: the sort, and with Group by hospital, hospital by hospital (in name order) first, the sort inside
 * each. PanelGrid and the List tables start a section wherever the hospital changes. Location is no longer a sort (Oct
 * 30, 2026, Intercept-Live Census `167:5543`): grouping is its own switch. `alertPriority` (the Active alerts chip, Oct
 * 31, 2026, user's call) orders by who to see first (`byAlertPriority`) instead of the sort.
 */
const panelOrder = (sortBy: SortOrderId, grouped: boolean, alertPriority = false) => {
	const compare = alertPriority ? byAlertPriority : sortOrderById(sortBy).compare;
	return grouped
		? (a: PanelPatient, b: PanelPatient) => (a.hospital ?? "").localeCompare(b.hospital ?? "") || compare(a, b)
		: compare;
};

/** The later of two ISO 8601 times. */
const latest = (a?: string, b?: string) => (!a ? b : !b ? a : Date.parse(a) >= Date.parse(b) ? a : b);

/**
 * When each patient's last alert was resolved, from the page's alerts: the ones resolved in the live feed carry when
 * (`addressed.at`). Merged over the patient's own `lastResolvedAt` by `useRecentActivity`.
 */
function resolvedTimes(alerts: readonly { patientId: string; status?: string; addressed?: { at: string } }[]) {
	const times: Record<string, string> = {};
	for (const alert of alerts) {
		if (alert.status === "resolved" && alert.addressed) {
			times[alert.patientId] = latest(times[alert.patientId], alert.addressed.at) as string;
		}
	}
	return times;
}

/**
 * The patients with this session's activity merged over what the data says, for the Recently viewed and Recently
 * resolved sorts: the details the clinician opened in the shell (each patient stepped to counts), and the alerts
 * resolved on the page (`resolvedAt`, by patient). An app gets both back from its API.
 */
function useRecentActivity<Patient extends PanelPatient>(patients: Patient[], resolvedAt: Record<string, string>): Patient[] {
	const viewedAt = usePatientNavigation()?.viewedAt;
	return patients.map((patient) => {
		const lastViewedAt = latest(viewedAt?.[patient.id], patient.lastViewedAt);
		const lastResolvedAt = latest(resolvedAt[patient.id], patient.lastResolvedAt);
		return lastViewedAt === patient.lastViewedAt && lastResolvedAt === patient.lastResolvedAt
			? patient
			: { ...patient, lastViewedAt, lastResolvedAt };
	});
}

/* -------------------------------------------------------------------------- */
/* Holding the order                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Whether the panel's order is held: while the pointer is over the grid, or keyboard focus is in it, so cards don't
 * move under the clinician's hand or eyes (Oct 28, 2026). `pauseProps` go on the grid. Touch doesn't hold it (a tap
 * isn't a hover), and neither does focus left by a click, so moving the mouse away always resumes. It's also held while
 * a patient's details hide the page, and for a moment after Back, so a card that has to move does it in sight.
 * `holdUnderHand={false}` lets the order change under the pointer or focus (Monitoring's Active alerts, Nov 3, 2026,
 * user's call: who to see first stays current); the hold while the page is hidden still applies.
 */
function useSortPause(holdUnderHand = true) {
	const [hovered, setHovered] = React.useState(false);
	const [focused, setFocused] = React.useState(false);
	const grid = React.useRef<HTMLElement | null>(null);
	const hidden = usePatientNavigation()?.patientOpen ?? false;
	const [shown, setShown] = React.useState(!hidden);

	React.useEffect(() => {
		if (hidden) {
			// The page hides without a pointerleave or blur.
			setShown(false);
			setHovered(false);
			setFocused(false);
			return;
		}
		const timer = window.setTimeout(() => setShown(true), motionDuration.normal * 1000);
		return () => window.clearTimeout(timer);
	}, [hidden]);

	// A pointerleave can be missed (the grid hid or moved away under a still pointer), so the next pointer movement
	// anywhere else ends the hover.
	React.useEffect(() => {
		if (!hovered) return;
		const onPointerOver = (event: PointerEvent) => {
			if (!(event.target instanceof Node) || !grid.current?.contains(event.target)) setHovered(false);
		};
		document.addEventListener("pointerover", onPointerOver);
		return () => document.removeEventListener("pointerover", onPointerOver);
	}, [hovered]);

	const pauseProps = {
		onPointerEnter: (event: React.PointerEvent<HTMLElement>) => {
			grid.current = event.currentTarget;
			if (event.pointerType !== "touch") setHovered(true);
		},
		onPointerLeave: () => setHovered(false),
		onFocus: (event: React.FocusEvent) => setFocused(event.target.matches(":focus-visible")),
		onBlur: (event: React.FocusEvent<HTMLElement>) => {
			if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
		},
	} satisfies React.HTMLAttributes<HTMLElement>;
	return { paused: (holdUnderHand && (hovered || focused)) || !shown, pauseProps };
}

// Seconds before the first re-sort after the page opens, and the range each later gap is drawn from (Oct 29, 2026).
const firstSortDelay = 2;
const sortGap = [15, 30] as const;

/**
 * When the panel re-sorts: once `firstSortDelay` after the page opens, then after a random gap within `sortGap`, so
 * cards move now and then rather than on every data change. A re-sort that comes due while the order is held (`paused`)
 * waits for the pause to end. `sorts` counts the re-sorts that have run; each new count lets the patients take their
 * order. `sortNow` re-sorts without waiting for the gap (still not while paused), and the next gap starts from there.
 */
function useSortCadence(paused: boolean) {
	const [sorts, setSorts] = React.useState(0);
	const [due, setDue] = React.useState(false);
	const sortNow = React.useCallback(() => setDue(true), []);

	React.useEffect(() => {
		if (due) return;
		const seconds = sorts === 0 ? firstSortDelay : sortGap[0] + Math.random() * (sortGap[1] - sortGap[0]);
		const timer = window.setTimeout(() => setDue(true), seconds * 1000);
		return () => window.clearTimeout(timer);
	}, [sorts, due]);

	React.useEffect(() => {
		if (!due || paused) return;
		setDue(false);
		setSorts((current) => current + 1);
	}, [due, paused]);

	return { sorts, sortNow };
}

type AlertSeverity = "critical" | "high" | "medium" | "low";

const isSeverity = (variant: PatientCardAlertVariant | undefined): variant is AlertSeverity =>
	variant === "critical" || variant === "high" || variant === "medium" || variant === "low";

// How long a card says "Resolved" in its old place (its ring blinks green once meanwhile) after its last alert resolves,
// before it moves.
const resolvedPillMs = 2000;
// The move (`reorderSpring`, about `deliberate`), then the hold after it lands (MOTION.md Urgency), so the pill is still
// there when the card lands and fades out (`resolvedFadeTransition`) `resolvedHold` later.
const resolvedMoveMs = (motionDuration.deliberate + motionDuration.resolvedHold) * 1000;

type ResolvedHold = { severity: AlertSeverity; moved: boolean };

/**
 * Patients whose last active alert just resolved, by id, with the severity they had: held in place for `resolvedPillMs`
 * showing "Resolved", then `moved` to their new place still showing it, then released once they've landed and held,
 * when the pill fades out. A resolve doesn't wait for the cadence (Oct 29, 2026): `onMove` re-sorts at once, so the
 * card relocates as soon as its moment in place is over. Covers alerts resolved by the clinician, by the feed, or that
 * drop out of it.
 */
function useResolvedHolds(patients: Pick<PanelPatient, "id" | "alert">[], onMove: () => void) {
	const [holds, setHolds] = React.useState<Record<string, ResolvedHold>>({});
	const previous = React.useRef<Record<string, AlertSeverity> | null>(null);
	const timers = React.useRef<number[]>([]);
	const open: Record<string, AlertSeverity> = {};
	for (const patient of patients) {
		if (isSeverity(patient.alert?.variant)) open[patient.id] = patient.alert.variant;
	}
	const openKey = JSON.stringify(open);

	React.useEffect(() => {
		const before = previous.current;
		previous.current = open;
		if (!before) return;
		const resolved = Object.keys(before).filter((id) => !open[id]);
		if (!resolved.length) return;
		const update = (change: (hold: ResolvedHold) => ResolvedHold | null) =>
			setHolds((current) => {
				const next = { ...current };
				for (const id of resolved) {
					const changed = next[id] ? change(next[id]) : null;
					if (changed) next[id] = changed;
					else delete next[id];
				}
				return next;
			});
		setHolds((current) => ({
			...current,
			...Object.fromEntries(resolved.map((id) => [id, { severity: before[id], moved: false }])),
		}));
		timers.current.push(
			window.setTimeout(() => {
				update((hold) => ({ ...hold, moved: true }));
				onMove();
			}, resolvedPillMs),
			window.setTimeout(() => update(() => null), resolvedPillMs + resolvedMoveMs),
		);
		// Keyed on the open alerts' contents, not the object (a new one every render).
	}, [openKey]);

	React.useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

	return holds;
}

/**
 * Re-sorts at once (`onFire`, the cadence's `sortNow`) when a patient's newest open alert fires, so the Alerts order
 * shows it without waiting for the next gap (Nov 3, 2026, user's call: Scenario 1's alert sorts right away). Still not
 * while the order is held. Alerts that drop out don't count: a resolve moves on its own clock (useResolvedHolds).
 */
function useSortOnNewAlert(patients: Pick<PanelPatient, "id" | "lastAlertAt">[], onFire: () => void) {
	const previous = React.useRef<Record<string, string> | null>(null);
	const firedAt: Record<string, string> = {};
	for (const patient of patients) if (patient.lastAlertAt) firedAt[patient.id] = patient.lastAlertAt;
	const firedKey = JSON.stringify(firedAt);

	React.useEffect(() => {
		const before = previous.current;
		previous.current = firedAt;
		if (!before) return;
		if (Object.entries(firedAt).some(([id, at]) => !before[id] || Date.parse(at) > Date.parse(before[id]))) onFire();
		// Keyed on the fire times, not the object (a new one every render).
	}, [firedKey]);
}

/**
 * The patients as they sort: one whose last alert just resolved keeps its severity until it moves, so it holds its place
 * through any re-sort meanwhile. The held severity counts no alerts (count 0), so the counters already drop it.
 */
const withResolvedHolds = <Patient extends PanelPatient>(patients: Patient[], holds: Record<string, ResolvedHold>) =>
	patients.map((patient) => {
		const hold = holds[patient.id];
		return hold && !hold.moved && !patient.alert ? { ...patient, alert: { variant: hold.severity, count: 0 } } : patient;
	});

/** The pill a card shows: "Resolved" from the resolve until it has landed, otherwise its own (`ownAlert`). */
const shownAlert = (ownAlert: PanelPatient["alert"], hold: ResolvedHold | undefined): PanelPatient["alert"] =>
	hold && !ownAlert ? { variant: "resolved" } : ownAlert;

/**
 * The patients in the order they took at the last re-sort (`sorts`, from useSortCadence); their values keep updating.
 * A patient who leaves just drops out; one who joins (a filter changed) or a new sort order (`orderKey`) re-sorts
 * everyone at once. At each re-sort the patients take their new order, and the cards move there (Reorder).
 */
function useHeldOrder<Patient extends { id: string }>(patients: Patient[], sorts: number, orderKey: string): Patient[] {
	const order = React.useRef<string[]>([]);
	const takenAt = React.useRef<{ sorts: number; orderKey: string } | null>(null);
	const position = new Map(order.current.map((id, index) => [id, index]));
	const current = takenAt.current?.sorts === sorts && takenAt.current.orderKey === orderKey;
	if (current && patients.every((patient) => position.has(patient.id))) {
		return [...patients].sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));
	}
	order.current = patients.map((patient) => patient.id);
	takenAt.current = { sorts, orderKey };
	return patients;
}

/**
 * A "Resolved" pill stays while its card moves to its new place, then fades `motionDuration.resolvedHold` after the
 * card lands (MOTION.md Urgency: the pill fades on `resolvedFadeTransition`). The card moves at the first re-sort
 * (`sorts`) after its alert resolved, so the hold doesn't start before that, nor while the order is held. A patient
 * whose alert stops being resolved (a new one fired) shows the next "Resolved" again. Without `sorts` (a page that
 * doesn't re-sort on its own, the Census), nothing moves: the pill fades `resolvedHold` after it appears.
 */
function useFadingResolvedAlerts<Patient extends PanelPatient>(patients: Patient[], paused: boolean, sorts?: number): Patient[] {
	const [faded, setFaded] = React.useState<ReadonlySet<string>>(() => new Set());
	const timers = React.useRef(new Map<string, number>());
	// The re-sort count when each pill turned "Resolved".
	const resolvedAt = React.useRef(new Map<string, number | undefined>());
	const resolvedIds = patients.filter((patient) => patient.alert?.variant === "resolved").map((patient) => patient.id);
	const resolvedKey = resolvedIds.join();

	React.useEffect(() => {
		const resolved = new Set(resolvedKey ? resolvedKey.split(",") : []);
		for (const [id, timer] of timers.current) {
			if (paused || !resolved.has(id)) {
				window.clearTimeout(timer);
				timers.current.delete(id);
			}
		}
		for (const id of resolvedAt.current.keys()) if (!resolved.has(id)) resolvedAt.current.delete(id);
		for (const id of resolved) if (!resolvedAt.current.has(id)) resolvedAt.current.set(id, sorts);
		if ([...faded].some((id) => !resolved.has(id))) {
			setFaded(new Set([...faded].filter((id) => resolved.has(id))));
			return;
		}
		if (paused) return;
		// The card's move (Reorder settles within `slow`), then the hold; just the hold when nothing moves.
		const delay = ((sorts === undefined ? 0 : motionDuration.slow) + motionDuration.resolvedHold) * 1000;
		for (const id of resolved) {
			const awaitingMove = sorts !== undefined && resolvedAt.current.get(id) === sorts;
			if (faded.has(id) || timers.current.has(id) || awaitingMove) continue;
			timers.current.set(
				id,
				window.setTimeout(() => {
					timers.current.delete(id);
					setFaded((current) => new Set(current).add(id));
				}, delay),
			);
		}
	}, [resolvedKey, paused, faded, sorts]);

	React.useEffect(() => {
		const pending = timers.current;
		return () => pending.forEach((timer) => window.clearTimeout(timer));
	}, []);

	return faded.size
		? patients.map((patient) =>
				patient.alert?.variant === "resolved" && faded.has(patient.id) ? { ...patient, alert: undefined } : patient,
			)
		: patients;
}

/** Whose patients the page shows: everyone's, or the signed-in clinician's (assigned this shift). */
type PatientScope = "all" | "mine";

/** A quick view: one chip in the row, matching a subset of patients. */
type QuickView<Patient> = {
	id: string;
	label: string;
	icon: LucideIcon;
	matches: (patient: Patient) => boolean;
};

/* -------------------------------------------------------------------------- */
/* Card menu                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A patient card's "…" menu, the same on every card, Census and Monitoring (Nov 3, 2026, user's call). Ask Intercept Live
 * first (the chat about the patient with a quick overview, as Ask in an alert toast does), then Video consult (the alert
 * modal with the call to the bedside already ringing; Scenario 1, step 3; with no active alert, the modal without one),
 * then View alert while the card shows an alert (the alert modal its alert bar opens; "View alerts" when the card counts
 * several, Nov 4, 2026, user's call), set apart by a divider; then the patient's actions, as in the patient's header, in
 * alphabetical order (the app wires them up). Ask, Video consult and View only inside the shell (`navigation`).
 */
function patientCardActions(
	navigation: PatientNavigation | null,
	{
		id,
		name,
		tags,
		showsAlert = false,
		alertCount = 1,
	}: { id: string; name: string; tags?: { label: string }[]; showsAlert?: boolean; alertCount?: number },
): PatientCardAction[] {
	return [
		...(navigation
			? [
					{
						label: "Ask Intercept Live",
						icon: SparklesIcon,
						onSelect: () => navigation.askAboutPatient(id, name, tags?.map((tag) => tag.label)),
					},
					{
						label: "Video consult",
						icon: VideoIcon,
						onSelect: () => navigation.openAlert(id, undefined, { consult: true }),
						divider: !showsAlert,
					},
					...(showsAlert
						? [
								{
									label: alertCount > 1 ? "View alerts" : "View alert",
									icon: BellIcon,
									onSelect: () => navigation.openAlert(id),
									divider: true,
								},
							]
						: []),
				]
			: []),
		{ label: "Escalate", icon: ArrowUpIcon },
		{ label: "Huddle team", icon: WebcamIcon },
		{ label: "Raise concern", icon: FlagIcon },
	];
}

/* -------------------------------------------------------------------------- */
/* Filter bar parts                                                           */
/* -------------------------------------------------------------------------- */

/**
 * What a hospital tab's counters say: "6 patients", and, when any have an active alert, "4 active alerts, highest
 * Medium". Shared by the counters' tooltips and the tab's accessible name, so the two never disagree.
 */
function hospitalTabCounts(patients: PanelPatient[]) {
	const severity = topSeverity(patients);
	const alerts = activeAlertCount(patients);
	return {
		severity,
		alerts,
		patientsText: `${patients.length} ${patients.length === 1 ? "patient" : "patients"}`,
		alertsText:
			severity && alerts > 0
				? `${alerts} active ${alerts === 1 ? "alert" : "alerts"}, highest ${severity[0].toUpperCase()}${severity.slice(1)}`
				: undefined,
	};
}

/**
 * One tab's counters: how many patients (none at 0), then, when any have an active alert, how many alerts, in the color of the
 * worst one. Both are muted at rest and solid on the active tab (patients `secondary` → `neutral`, alerts
 * `<severity>-muted` → `<severity>`), easing between the two with the label. Hovering a counter names it in a
 * tooltip; screen readers get the same words from the tab's name, so the counters are hidden from them.
 *
 * With `onShowAlerts`, a click on the alert count opens Monitoring on this tab with Active alerts on (Nov 5, 2026,
 * user's call), instead of picking the tab; on hover it turns solid. It sits inside the tab's button, so it can't be a
 * button of its own: a pointer shortcut, while the keyboard reaches the same view through the tab and the chip.
 */
function HospitalTabCounters({
	patients,
	active,
	onShowAlerts,
}: {
	patients: PanelPatient[];
	active: boolean;
	onShowAlerts?: () => void;
}) {
	const { severity, alerts, patientsText, alertsText } = hospitalTabCounts(patients);
	const [alertsHovered, setAlertsHovered] = React.useState(false);

	return (
		<>
			{/* No patients, no count (Nov 13, 2026, user's call): an empty hospital shows its name alone; the tab's name still
			    says "0 patients". */}
			{patients.length ? (
				<Tooltip>
					{/* TooltipTrigger's own `data-slot` would replace the counter's, which TabsTrigger needs to set the pair 2px
					    apart, so the counters restate theirs. */}
					<TooltipTrigger asChild>
						<Counter
							data-slot='counter'
							aria-hidden
							variant={active ? "neutral" : "secondary"}
							count={patients.length}
							className='transition-colors'
						/>
					</TooltipTrigger>
					<TooltipContent side='top'>{patientsText}</TooltipContent>
				</Tooltip>
			) : null}
			{severity && alertsText ? (
				<Tooltip>
					<TooltipTrigger asChild>
						<Counter
							data-slot='counter'
							aria-hidden
							variant={active || (onShowAlerts && alertsHovered) ? severity : `${severity}-muted`}
							count={alerts}
							className={cn("transition-colors", onShowAlerts && "cursor-pointer")}
							{...(onShowAlerts
								? {
										onPointerEnter: () => setAlertsHovered(true),
										onPointerLeave: () => setAlertsHovered(false),
										// Radix picks the tab on mousedown, and focusing the tab picks it too: neither may happen, or the
										// tab would switch before Monitoring opens.
										onMouseDown: (event: React.MouseEvent) => {
											event.preventDefault();
											event.stopPropagation();
										},
										onClick: (event: React.MouseEvent) => {
											event.preventDefault();
											event.stopPropagation();
											onShowAlerts();
										},
									}
								: {})}
						/>
					</TooltipTrigger>
					<TooltipContent side='top'>{alertsText}</TooltipContent>
				</Tooltip>
			) : null}
		</>
	);
}

/** The tab's accessible name: "Sidney, 14 patients, 4 active alerts, highest Critical". */
function hospitalTabLabel(name: string, patients: PanelPatient[]) {
	const { patientsText, alertsText } = hospitalTabCounts(patients);
	return [name, patientsText, alertsText].filter(Boolean).join(", ");
}

/**
 * Hospital tabs: All hospitals, then one per hospital in alphabetical order (as Group by hospital orders them), each
 * with its patient count and its active alert count (`HospitalTabCounters`; with `onShowAlerts`, clicking the alert
 * count opens Monitoring on that tab with Active alerts on). Fills the page's hospital bar: 40px tall, the active tab's
 * underline over the bar's bottom border.
 */
function HospitalTabs({
	hospitals,
	patients,
	value,
	onValueChange,
	onShowAlerts,
}: {
	hospitals: PanelHospital[];
	/** The patients the counters count (already narrowed to the patient scope). */
	patients: PanelPatient[];
	value: string;
	onValueChange: (value: string) => void;
	/** A tab's alert count, clicked: Monitoring on that tab (`"all"` for All hospitals) with Active alerts on. */
	onShowAlerts?: (hospitalId: string) => void;
}) {
	const alphabetical = [...hospitals].sort((a, b) => a.name.localeCompare(b.name));

	return (
		// When side panels leave the bar too little room, the tabs scroll sideways (scrollbar hidden; trackpads and the
		// arrow keys still reach every tab) instead of pushing the live feed out of the bar. The 1px overlap with the bar's
		// line is on the scroll box, so the active underline isn't clipped. The counters' tooltips close as soon as the
		// pointer leaves: they're only text, and the two counters are 2px apart, so keeping one open while the pointer
		// heads for it would block the other.
		<TooltipProvider disableHoverableContent>
			<Tabs
				value={value}
				onValueChange={onValueChange}
				className='-mb-px min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
			>
				<TabsList variant='line' size='lg' aria-label='Hospital'>
					<TabsTrigger value='all' aria-label={hospitalTabLabel("All hospitals", patients)}>
						All hospitals
						<HospitalTabCounters
							patients={patients}
							active={value === "all"}
							onShowAlerts={onShowAlerts ? () => onShowAlerts("all") : undefined}
						/>
					</TabsTrigger>
					{alphabetical.map((hospital) => {
						const hospitalPatients = patients.filter((patient) => patient.hospitalId === hospital.id);
						return (
							<TabsTrigger
								key={hospital.id}
								value={hospital.id}
								aria-label={hospitalTabLabel(hospital.name, hospitalPatients)}
							>
								{hospital.name}
								<HospitalTabCounters
									patients={hospitalPatients}
									active={value === hospital.id}
									onShowAlerts={onShowAlerts ? () => onShowAlerts(hospital.id) : undefined}
								/>
							</TabsTrigger>
						);
					})}
				</TabsList>
			</Tabs>
		</TooltipProvider>
	);
}

/**
 * My patients: a chip like the quick views, off by default, so the page shows everyone. On, it narrows everything below
 * it to the signed-in clinician's patients, the tab counters included. It's its own choice, so it combines with a quick
 * view. `count` is how many of the user's patients are in the current hospital and unit.
 */
function MyPatientsChip({
	value,
	onValueChange,
	count,
}: {
	value: PatientScope;
	onValueChange: (value: PatientScope) => void;
	count: number;
}) {
	return (
		<FilterBarChip
			count={count}
			pressed={value === "mine"}
			onPressedChange={(pressed) => onValueChange(pressed ? "mine" : "all")}
		>
			<UsersIcon aria-hidden='true' />
			My patients
		</FilterBarChip>
	);
}

/**
 * The quick-view chips: toggle buttons, at most one pressed; pressing the pressed one turns it off (`null`). Every chip
 * shows how many patients it matches among `patients`, so the counts follow the hospital tab, the unit and My patients.
 * `counts` overrides a chip's count, e.g. one held while a chip is pressed.
 */
function QuickViewChips<Patient>({
	views,
	value,
	onValueChange,
	patients,
	counts,
}: {
	views: readonly QuickView<Patient>[];
	value: string | null;
	onValueChange: (value: string | null) => void;
	/** The patients a chip's count counts: the page's patients in the current hospital, unit and scope. */
	patients: Patient[];
	/** Counts by chip id, in place of counting `patients`. */
	counts?: Partial<Record<string, number>>;
}) {
	return (
		// `contents`: the chips flow with the search and My patients in the filter bar's own row, wrapping one at a time
		// instead of as a block; the group keeps its name for screen readers.
		<div role='group' aria-label='Quick views' className='contents'>
			{views.map(({ id, icon: Icon, label, matches }) => (
				<FilterBarChip
					key={id}
					count={counts?.[id] ?? patients.filter(matches).length}
					pressed={value === id}
					onPressedChange={(pressed) => onValueChange(pressed ? id : null)}
				>
					<Icon aria-hidden='true' />
					{label}
				</FilterBarChip>
			))}
		</div>
	);
}

// The sort menu shows the chosen value in semibold. Radix drops `className` on SelectValue, so the trigger styles it.
const menuTriggerClassName = "gap-1.5 [&_[data-slot=select-value]]:font-semibold";

/**
 * The sort menu. Re-sorting reuses the grid's glide: cards are keyed by patient, so they move to their new slots. A page
 * can offer only the `orders` that make sense on it (e.g. no acuity sorts where the card doesn't show acuity).
 */
function SortSelect({
	value,
	onValueChange,
	orders = sortOrders.map((order) => order.id),
	scoreName,
}: {
	value: SortOrderId;
	onValueChange: (value: SortOrderId) => void;
	orders?: readonly SortOrderId[];
	/**
	 * The score's name from the data ("NEWS2"), so the score sorts read "NEWS2" and "NEWS2 change", as the card names it
	 * (PRD PC-030). Without it they read "Score" and "Score change".
	 */
	scoreName?: string;
}) {
	const label = (order: (typeof sortOrders)[number]) => {
		if (scoreName && order.id === "acuity") return scoreName;
		if (scoreName && order.id === "change") return `${scoreName} change`;
		return order.label;
	};
	return (
		<Select value={value} onValueChange={(next) => onValueChange(next as SortOrderId)}>
			{/* The sort icon, then the order's name (Intercept-Live Census `167:5543`). */}
			<SelectTrigger aria-label='Sort by' className={menuTriggerClassName}>
				<ArrowDownUpIcon aria-hidden='true' />
				<SelectValue />
			</SelectTrigger>
			<SelectContent position='popper' align='start'>
				{sortOrders
					.filter((order) => orders.includes(order.id))
					.map((order) => (
						<SelectItem key={order.id} value={order.id}>
							{label(order)}
						</SelectItem>
					))}
			</SelectContent>
		</Select>
	);
}

/* -------------------------------------------------------------------------- */
/* Grid                                                                       */
/* -------------------------------------------------------------------------- */

// Under reduced motion a filtered card still fades in and out, just at once and without the upward move. Variants carry
// their own transitions, so this needs its own set rather than a resolve() override.
const cardReducedVariants: Variants = {
	initial: { opacity: 0 },
	animate: { opacity: 1, transition: reducedMotionTransition },
	exit: { opacity: 0, transition: reducedMotionTransition },
};

// A card's shared-element id, the same in the grid and the board, so switching Group by hospital glides each card from
// one to the other (Connect) instead of remounting it in place.
const panelCardLayoutId = (patientId: string) => `panel-card-${patientId}`;

/**
 * Whether `value` has changed since the component mounted: a view that appears because the user switched to it animates
 * in, one that's there from the start (page load, a page switch) doesn't.
 */
function useChangedSinceMount(value: unknown) {
	const first = React.useRef(value);
	const [changed, setChanged] = React.useState(false);
	if (!changed && !Object.is(value, first.current)) setChanged(true);
	return changed;
}

/**
 * A short window in which the grid's next order lands at once: no glide, and leaving cards vanish instead of fading.
 * Open it from a click that should re-sort on the spot (the Active alerts chip, Nov 1, 2026, user's call: "sorted by
 * severity in that click, without any delay"); it closes after `motionDuration.normal`, so later changes glide again.
 */
function useSnapOrder() {
	const [snap, setSnap] = React.useState(false);
	React.useEffect(() => {
		if (!snap) return;
		const timer = window.setTimeout(() => setSnap(false), motionDuration.normal * 1000);
		return () => window.clearTimeout(timer);
	}, [snap]);
	return [snap, () => setSnap(true)] as const;
}

// A leaving card's exit, by AnimatePresence's `custom`: gone at once while the grid snaps, its usual fade otherwise.
const snapExit: TargetAndTransition = { opacity: 0, transition: { duration: 0 } };
const withSnapExit = (variants: Variants): Variants => ({
	...variants,
	exit: (snap?: boolean) => (snap ? snapExit : (variants.exit as TargetAndTransition)),
});
const cardVariants = withSnapExit(revealVariants);
const cardReducedSnapVariants = withSnapExit(cardReducedVariants);

/**
 * One grid item, wrapped for the filter motion: Reveal in, fade out, and Reorder between slots (the reorder spring, and
 * while it travels it rises above the other cards with a larger shadow, so crossing cards stay readable). With a
 * `layoutId`, it also glides in from the item with the same id that just left another container (Connect).
 */
function PanelItem({
	reducedMotion,
	layoutTransition,
	snap = false,
	layoutId,
	className,
	children,
	ref,
}: {
	reducedMotion: boolean;
	layoutTransition: Transition;
	/** Move to the new slot at once (`useSnapOrder`). */
	snap?: boolean;
	layoutId?: string;
	className?: string;
	children: React.ReactNode;
	ref?: React.Ref<HTMLDivElement>;
}) {
	const [moving, setMoving] = React.useState(false);

	return (
		<motion.div
			ref={ref}
			layout='position'
			layoutId={layoutId}
			variants={reducedMotion ? cardReducedSnapVariants : cardVariants}
			initial='initial'
			animate='animate'
			exit='exit'
			transition={{ layout: snap ? { duration: 0 } : layoutTransition }}
			onLayoutAnimationStart={() => setMoving(true)}
			onLayoutAnimationComplete={() => setMoving(false)}
			data-moving={moving ? "" : undefined}
			// The card is the item's child; its own shadow transition (160ms) eases the lift in and out.
			className={cn("relative data-moving:z-10 data-moving:*:shadow-lg", className)}
		>
			{children}
		</motion.div>
	);
}

/**
 * The patient grid. When a filter, the sort or the data changes the set, cards that join Reveal, cards that leave fade
 * out and the rest glide to their new slots. Grouped, it splits into a section per hospital: a heading row, then that
 * hospital's cards (the patients must already be sorted by hospital).
 */
function PanelGrid<Patient extends PanelPatient>({
	patients,
	hospitals,
	grouped,
	snap = false,
	renderCard,
	className,
	...props
}: Omit<React.ComponentProps<"div">, "children"> & {
	patients: Patient[];
	hospitals: PanelHospital[];
	grouped: boolean;
	/** This order lands at once, without the glide (`useSnapOrder`). */
	snap?: boolean;
	renderCard: (patient: Patient) => React.ReactNode;
}) {
	const { prefersReducedMotion, resolve } = useMotionPreference();
	const reducedMotion = Boolean(prefersReducedMotion);
	const layoutTransition = resolve(reorderSpring);

	// A heading goes in wherever the hospital changes.
	const items = patients.flatMap((patient, index) => {
		const card = { kind: "card" as const, patient };
		if (!grouped || patients[index - 1]?.hospitalId === patient.hospitalId) return [card];
		const sectionPatients = patients.filter((other) => other.hospitalId === patient.hospitalId);
		const name = hospitals.find((hospital) => hospital.id === patient.hospitalId)?.name ?? patient.hospital ?? "";
		return [{ kind: "section" as const, id: patient.hospitalId, name, patients: sectionPatients }, card];
	});

	return (
		// popLayout takes a leaving card out of the grid at once (the grid is `relative` for it), so the others move while
		// it fades. initial={false}: the first render doesn't animate. Hospital sections are full-width heading rows in the
		// same grid, so cards keep their parent and key and glide into their section instead of remounting. Hidden once
		// empty (after any exits), so it adds no gap above the empty state.
		<div className={cn("relative grid grid-cols-1 gap-4 empty:hidden", className)} {...props}>
			<AnimatePresence initial={false} mode='popLayout' custom={snap}>
				{items.map((item) =>
					item.kind === "section" ? (
						<PanelItem
							key={`section-${item.id}`}
							reducedMotion={reducedMotion}
							layoutTransition={layoutTransition}
							snap={snap}
							className='col-span-full first:mt-2 not-first:mt-4'
						>
							<HospitalSectionHeader
								name={item.name}
								patientCount={item.patients.length}
								alertCount={activeAlertCount(item.patients)}
							/>
						</PanelItem>
					) : (
						<PanelItem
							key={item.patient.id}
							reducedMotion={reducedMotion}
							layoutTransition={layoutTransition}
							snap={snap}
							layoutId={panelCardLayoutId(item.patient.id)}
							// `grid-cols-1` is minmax(0, 1fr): the card takes the cell's width and its hospital truncates. An `auto`
							// column would grow to the card's one-line location and push it past the cell.
							className='grid grid-cols-1'
						>
							{renderCard(item.patient)}
						</PanelItem>
					),
				)}
			</AnimatePresence>
		</div>
	);
}

/**
 * How Group by hospital shows the panel: a Kanban board, a column per hospital (the default since Oct 30, 2026), or
 * sections in the grid.
 */
type GroupedView = "board" | "sections";

/**
 * The user's Group by hospital choice, off to start. Inside the shell it's kept there, so it holds when the user
 * switches pages (`usePagePreferences`); a page on its own keeps it itself. Choosing another grouped view (a new
 * `groupedView`) turns it on and calls `onViewChange`, where the panel shows the view at once
 * (cards, All hospitals). The panel turns grouping off while one hospital is picked, keeping this choice for All
 * hospitals.
 */
function useGrouping(groupedView: GroupedView, onViewChange: () => void) {
	const preferences = usePagePreferences();
	const [ownGrouped, setOwnGrouped] = React.useState(false);
	const grouped = preferences ? preferences.groupByHospital : ownGrouped;
	const setGrouped = preferences ? preferences.onGroupByHospitalChange : setOwnGrouped;
	// After render, not during it: the shell's state can't be set while a page renders. A page mounted on a view (after a
	// page switch) doesn't count it as a change.
	const previousView = React.useRef(groupedView);
	React.useEffect(() => {
		if (groupedView === previousView.current) return;
		previousView.current = groupedView;
		setGrouped(true);
		onViewChange();
	});
	return [grouped, setGrouped] as const;
}

/**
 * The page's Sort by choice, `initial` to start. Inside the shell it's kept there, per page, so it holds when the user
 * switches pages or opens a patient and comes back (`usePagePreferences`); a page on its own keeps it itself.
 */
function useSortBy(page: SortPage, initial: SortOrderId) {
	const preferences = usePagePreferences();
	const [ownSortBy, setOwnSortBy] = React.useState(initial);
	const sortBy = preferences ? (preferences.sortBy[page] ?? initial) : ownSortBy;
	const setSortBy = preferences ? (next: SortOrderId) => preferences.onSortByChange(page, next) : setOwnSortBy;
	return [sortBy, setSortBy] as const;
}

/**
 * The page's My patients chip, everyone's patients to start. Inside the shell it's kept there, per page, like the sort,
 * so the alert toasts can follow it (`usePagePreferences`); a page on its own keeps it itself.
 */
function usePatientScope(page: SortPage) {
	const preferences = usePagePreferences();
	const [ownScope, setOwnScope] = React.useState<PatientScope>("all");
	const scope = preferences ? (preferences.scope[page] ?? "all") : ownScope;
	const setScope = preferences ? (next: PatientScope) => preferences.onScopeChange(page, next) : setOwnScope;
	return [scope, setScope] as const;
}

// The page's sticky header, compact while the page scrolls (AppHeader): where the filter bar sticks, and the board's
// header row without one.
const stickyTop = 52;
// The filter bar's space above and below it, kept while it's stuck: the page's 24px between rows.
const filterBarPadding = 24;
// The board's header row has a 16px opaque band over its headers (PanelBoard).
const boardHeadBand = 16;
// The room a card needs above it to lift on hover: the Lift's rise and the top of its `shadow-lg`.
const liftRoom = motionDistance.hover + 2;

/**
 * The page's filter bar, stuck under the page header while the page scrolls (Nov 5, 2026, user's call), keeping its
 * 24px above and below, opaque edge to edge so the cards pass under it. It must be a direct child of the page's `main`
 * (sticky can't leave its parent), which has 24px padding: the bar takes it back on the sides and the 24px above.
 *
 * The band below (padding and an equal negative margin, so nothing moves) grows only as the content scrolls under it,
 * up to 24px, and stays `liftRoom` clear of the first row's top until then (Nov 6, 2026): a full band as soon as the bar
 * stuck covered the gap above the first row, clipping a card that lifts on hover (its top border went under the bar). `onBoardTopChange` reports where the board's
 * header row should stick (`PanelBoard`'s `stickyTop`): under the bar, its 16px band over the bar's bottom padding, so
 * the headers sit 24px under the chips, as at rest.
 */
function StickyFilterBar({
	children,
	onBoardTopChange,
}: {
	children: React.ReactNode;
	onBoardTopChange?: (top: number) => void;
}) {
	const bar = React.useRef<HTMLDivElement>(null);
	const content = React.useRef<HTMLDivElement>(null);
	// The band under the chips, in px: 0 until the bar sticks, then how far the content has scrolled into the 24px gap
	// under the chips, less `liftRoom`, so a resting first row keeps room to lift (`StickyFilterBar`'s rule).
	const [band, setBand] = React.useState(0);

	// Any scroll may move it (the page's canvas scrolls, not the window), so the listener captures them all.
	React.useEffect(() => {
		const element = bar.current;
		if (!element) return;
		const check = () => {
			const stuck = element.getBoundingClientRect().top <= stickyTop + 0.5;
			const chips = content.current?.getBoundingClientRect().bottom ?? 0;
			// What follows the bar (the summary-less grid, the board): how far its top has come into the gap. Without
			// anything after it, a full band.
			const next = element.nextElementSibling?.getBoundingClientRect().top;
			const scrolledIn = next === undefined ? filterBarPadding : filterBarPadding - (next - chips);
			setBand(stuck ? Math.round(Math.min(filterBarPadding, Math.max(0, scrolledIn - liftRoom))) : 0);
		};
		check();
		window.addEventListener("scroll", check, { capture: true, passive: true });
		window.addEventListener("resize", check);
		return () => {
			window.removeEventListener("scroll", check, { capture: true });
			window.removeEventListener("resize", check);
		};
	}, []);

	// The bar's height changes when its chips wrap or the search opens, and the board's headers follow it.
	const onBoardTopChangeRef = React.useRef(onBoardTopChange);
	onBoardTopChangeRef.current = onBoardTopChange;
	React.useEffect(() => {
		const element = content.current;
		if (!element) return;
		const report = () =>
			onBoardTopChangeRef.current?.(stickyTop + filterBarPadding * 2 + element.offsetHeight - boardHeadBand);
		report();
		const observer = new ResizeObserver(report);
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	return (
		<div
			ref={bar}
			className='sticky top-[52px] z-[15] -mx-6 -mt-6 bg-background px-6 pt-6'
			style={band ? { paddingBottom: band, marginBottom: -band } : undefined}
		>
			<div ref={content}>{children}</div>
		</div>
	);
}
// How far above the screen's bottom a column taller than the screen stops.
const columnBottomGap = 16;

/**
 * Group by hospital as a Kanban board (its default view since Oct 30, 2026): a column per hospital, in the panel's order
 * (hospital name, then the sort), each with its HospitalSectionHeader over its cards. The columns share the width, at
 * least the width `className` sets in `--board-column` (`[--board-column:minmax(…,1fr)]`); more than fit scroll
 * sideways. Only hospitals with patients get a column (Nov 3, 2026, user's call; until then every hospital kept its
 * column while filters emptied it, saying "No patients match these filters"): a column that empties fades out, one that
 * fills fades in, and the cards glide to their new places. The columns keep their width (a track per hospital), so the
 * ones left don't stretch across the page. `spareColumns` adds empty tracks after them: Compact passes
 * one, so its columns are narrower, as its grid has a card more a row. With no patients at all it renders nothing, and
 * the page's empty state takes over.
 */
function PanelBoard<Patient extends PanelPatient>({
	patients,
	hospitals,
	spareColumns = 0,
	animateIn = false,
	snap = false,
	stickyTop: headTop = stickyTop,
	renderCard,
	className,
	style,
	...props
}: Omit<React.ComponentProps<"div">, "children"> & {
	/** Where the header row sticks, its 16px band included: under the page header, or the filter bar (StickyFilterBar). */
	stickyTop?: number;
	patients: Patient[];
	hospitals: PanelHospital[];
	/** Empty tracks after the hospitals' columns, so each column is narrower (Compact: 1). */
	spareColumns?: number;
	/**
	 * The columns' headers and backgrounds fade in as the board mounts: on when the user switched to it (Group by
	 * hospital), off when it's there from the start. Its cards glide in from the grid either way, when they were in it.
	 */
	animateIn?: boolean;
	/** This order lands at once, without the glide (`useSnapOrder`). */
	snap?: boolean;
	renderCard: (patient: Patient) => React.ReactNode;
}) {
	const { prefersReducedMotion, resolve } = useMotionPreference();
	const reducedMotion = Boolean(prefersReducedMotion);
	const layoutTransition = resolve(reorderSpring);
	// The columns' chrome only: fading the columns themselves would fade the cards gliding into them. A column that joins
	// after the board is up (a filter brought its hospital back) fades its chrome in too.
	const mounted = React.useRef(false);
	React.useEffect(() => {
		mounted.current = true;
	}, []);
	const chromeMotion = {
		variants: reducedMotion ? cardReducedVariants : fadeVariants,
		initial: animateIn || mounted.current ? "initial" : false,
		animate: "animate",
	} as const;
	// A column that empties fades out whole: it has no cards left to fade with it.
	const columnExit = { opacity: 0, transition: reducedMotion ? { duration: 0 } : undefined };
	// The header row follows the columns' sideways scroll (it can't share their scroll box: that box would hold it, and a
	// sticky row must stick to the page's scroll).
	const headRef = React.useRef<HTMLDivElement>(null);
	const hasPatients = patients.length > 0;
	// One column per hospital with patients, by name as `panelOrder` groups them; the patients come in the sort's order.
	const columns = [...hospitals]
		.sort((a, b) => a.name.localeCompare(b.name))
		.map((hospital) => ({
			id: hospital.id,
			name: hospital.name,
			patients: patients.filter((patient) => patient.hospitalId === hospital.id),
		}))
		.filter((column) => column.patients.length > 0);
	const columnKey = columns.map((column) => column.id).join();
	// Each column follows the page like a two-way sticky sidebar (Oct 30, 2026, user's call; two-way since Oct 31, 2026):
	// one that fits on screen stays under the header row while longer ones scroll on. A taller one scrolls with the page
	// until its last card reaches the screen's bottom (16px above it) and stays there while the page goes on down;
	// scrolling back up, it moves down with the page (every column does, not just the tallest) until its top reaches the
	// header row, and stays there. None leaves the board. Sticky can't do it inside the sideways scroll box, so each
	// column gets a transform driven by the page's scroll: a scroll-driven animation (ScrollTimeline), which the browser
	// runs with the scroll itself. Its keyframes are worked out from where the column is when the scroll changes
	// direction (or on a resize or render), and hold until it turns again. Moving it from a scroll listener instead lags a
	// frame behind the scroll and shakes; that's only the fallback where ScrollTimeline isn't supported.
	const bodyRef = React.useRef<HTMLDivElement>(null);
	const placeRef = React.useRef<(anchorAt?: number) => void>(undefined);
	const placeIfMovedRef = React.useRef<() => void>(undefined);
	// While cards glide in from the grid, the columns stay unmoved: a transformed column is a stacking context of its own,
	// so a card crossing it on its way to another column would pass under its fill. They follow the page once landed.
	const settling = React.useRef(animateIn && !reducedMotion);
	React.useEffect(() => {
		if (!settling.current) return;
		const timer = window.setTimeout(() => {
			settling.current = false;
			placeRef.current?.();
		}, motionDuration.deliberate * 1000);
		return () => window.clearTimeout(timer);
	}, []);
	React.useEffect(() => {
		const body = bodyRef.current;
		const head = headRef.current;
		if (!body || !head) return;
		// The page's scroll, found from the header row: from the body it would be the board's own sideways scroll box.
		const scroller = scrollContainerOf(head);
		const timeline = typeof ScrollTimeline === "undefined" ? null : new ScrollTimeline({ source: scroller, axis: "block" });
		// Each column's running animation, with its keyframes as a key, so an unchanged movement is left running.
		const animations = new Map<Element, { key: string; animation: Animation }>();
		const stop = (column: Element) => {
			animations.get(column)?.animation.cancel();
			animations.delete(column);
		};
		// Each column's offset (px down its board) as a function of the page's scroll, from its last anchor.
		const offsets = new Map<Element, (at: number) => number>();
		// What the movement is worked out from: the board's place in the page's scroll, its height, the columns' heights,
		// the scroll's extent and where the header row rests. While none of it changes, the movement doesn't either.
		const geometry = () => {
			const box = scroller.getBoundingClientRect();
			const board = body.getBoundingClientRect();
			return [
				Math.round(board.top - box.top + scroller.scrollTop),
				Math.round(board.height),
				Math.round(box.height),
				scroller.scrollHeight,
				scroller.clientHeight,
				headTop + head.offsetHeight,
				...Array.from(body.children, (column) => (column as HTMLElement).offsetHeight),
			].join();
		};
		let placedGeometry = "";
		// Works each column's movement out again from where it is at the scroll position `anchorAt` (default: now). It must
		// never leave a column unmoved for a frame: the cards' layout animation would read that frame as the cards moving
		// and glide them back (Nov 11, 2026). So an unchanged movement keeps its animation, and a changed one updates it.
		const place = (anchorAt = scroller.scrollTop) => {
			placedGeometry = geometry();
			const columns = Array.from(body.children);
			for (const column of animations.keys()) if (!columns.includes(column)) stop(column);
			const box = scroller.getBoundingClientRect();
			const board = body.getBoundingClientRect();
			const scrolled = scroller.scrollTop;
			const maxScroll = scroller.scrollHeight - scroller.clientHeight;
			// The board's top in the page's scroll, so the numbers below don't depend on where the page is now.
			const boardTop = board.top - box.top + scrolled;
			const topRest = headTop + head.offsetHeight;
			for (const column of columns as HTMLElement[]) {
				const height = column.offsetHeight;
				// How far the column can move down its board: the tallest one can't, and stays put.
				const travel = board.height - height;
				if (travel <= 0 || maxScroll <= 0 || settling.current) {
					stop(column);
					column.style.transform = "";
					offsets.delete(column);
					continue;
				}
				// Its two resting places on screen: its top under the header row, and (taller than the screen) its end 16px
				// above the bottom; a column that fits has only the first. Each holds from the scroll that brings it there.
				const bottomRest = Math.min(topRest, box.height - columnBottomGap - height);
				const startTop = boardTop - topRest;
				const startBottom = boardTop - bottomRest;
				const clampTravel = (at: number) => Math.min(Math.max(at, 0), travel);
				// The offsets that hold it at each resting place; between the two, it moves with the page.
				const atBottom = (at: number) => clampTravel(at - startBottom);
				const atTop = (at: number) => clampTravel(at - startTop);
				const held = offsets.get(column)?.(anchorAt) ?? atBottom(anchorAt);
				const offsetAt = (at: number) => Math.min(Math.max(held, atBottom(at)), atTop(at));
				offsets.set(column, offsetAt);
				if (!timeline) {
					const now = offsetAt(scrolled);
					column.style.transform = now ? `translateY(${now}px)` : "";
					continue;
				}
				column.style.transform = "";
				// Keyframes where the movement can change: where each resting place starts and ends, and where the column,
				// moving with the page from where it's held, reaches one.
				const kinks = [startTop, startTop + travel, startBottom, startBottom + travel, startTop + held, startBottom + held];
				const stops = [...new Set([0, maxScroll, ...kinks].map((at) => Math.min(Math.max(at, 0), maxScroll)))].sort(
					(x, y) => x - y,
				);
				const keyframes = stops.map((at) => ({ offset: at / maxScroll, transform: `translateY(${offsetAt(at)}px)` }));
				const key = JSON.stringify(keyframes);
				const current = animations.get(column);
				if (current?.key === key) continue;
				// One animation per column for as long as it's shown; a new movement changes its keyframes in place. A second
				// animation, even for a frame, makes Chrome run the column's movement on the main thread for good (it checks
				// when an animation starts: "target has incompatible animations"), a frame behind the scroll, so a column
				// resting on screen shook while the page scrolled (Nov 11, 2026). Cancelling first instead leaves the column
				// unmoved for a frame while the new one starts.
				if (current?.animation.effect instanceof KeyframeEffect) {
					current.animation.effect.setKeyframes(keyframes);
					current.key = key;
					continue;
				}
				animations.set(column, { key, animation: column.animate(keyframes, { timeline, fill: "both", easing: "linear" }) });
			}
		};
		placeRef.current = place;
		// After a render, only when the board moved or resized: the live numbers re-render the board every second, and
		// working the movement out again then re-anchored every column mid-scroll, swapping its animation each second, and
		// a column resting on screen shook a frame behind the scroll (Nov 11, 2026). Between turns the movement holds.
		placeIfMovedRef.current = () => {
			if (geometry() !== placedGeometry) place();
		};
		place();
		// The columns' movement depends on the way the page is going: when it turns, work it out again from where the
		// column is now. Not from where the page turned: by the time the scroll event arrives, the browser has already drawn
		// the turned scroll with the old movement, so anchoring at the turn snapped each moving column back by the scroll's
		// last step (60px a wheel notch), a visible jump at every turn (Nov 11, 2026). Without ScrollTimeline, every scroll
		// moves the columns this way.
		let lastScroll = scroller.scrollTop;
		let direction = 0;
		const onScroll = () => {
			const now = scroller.scrollTop;
			const way = Math.sign(now - lastScroll);
			if (!timeline) place(lastScroll);
			else if (way && direction && way !== direction) place();
			if (way) direction = way;
			lastScroll = now;
		};
		scroller.addEventListener("scroll", onScroll, { passive: true });
		const resize = new ResizeObserver(() => place());
		resize.observe(scroller);
		resize.observe(body);
		for (const column of Array.from(body.children)) resize.observe(column);
		return () => {
			scroller.removeEventListener("scroll", onScroll);
			resize.disconnect();
			for (const column of [...animations.keys()]) stop(column);
			placeRef.current = undefined;
			placeIfMovedRef.current = undefined;
		};
	}, [hasPatients, columnKey, headTop]);
	// Content above or inside the board can move it without resizing anything observed.
	React.useEffect(() => placeIfMovedRef.current?.());
	if (!hasPatients) return null;
	// One track per hospital, shown or not, plus any spare ones, so a column keeps its width however many hospitals have
	// patients (Nov 3, 2026, user's call): two columns of four stay a quarter wide each, from the left, and the rest of
	// the row stays empty. A column fading out takes a free track meanwhile (the columns flow sideways).
	const tracks = {
		gridTemplateColumns: `repeat(${hospitals.length + spareColumns}, var(--board-column))`,
		gridAutoFlow: "column",
		gridAutoColumns: "var(--board-column)",
	};

	// The columns are 8px apart (Oct 31, 2026, user's call; 16px, 12px in Compact, before): the header row and the
	// columns take this gap (`[gap:inherit]`).
	return (
		<div className={cn("gap-2", className)} style={style} {...props}>
			{/* The columns' headers stay under the page's sticky header (52px once the page scrolls, AppHeader `compact`),
			    16px below it, while the board scrolls, so a long column keeps its hospital in view (Oct 30, 2026, user's
			    call). Opaque, the 16px band too, so cards pass under it; the band overlaps the space above the board, so the
			    board doesn't move before it sticks. No shadow (removed Oct 30, 2026, user's call). */}
			<div
				ref={headRef}
				className='sticky z-10 -mt-4 overflow-hidden bg-background pt-4 [gap:inherit]'
				style={{ top: headTop }}
			>
				<div className='grid [gap:inherit]' style={tracks}>
					<AnimatePresence initial={false}>
						{columns.map((column) => (
							<motion.div key={column.id} {...chromeMotion} exit={columnExit}>
								<HospitalSectionHeader
									name={column.name}
									patientCount={column.patients.length}
									alertCount={activeAlertCount(column.patients)}
									className='rounded-t-card bg-background-subtle px-4 pt-3'
								/>
							</motion.div>
						))}
					</AnimatePresence>
				</div>
			</div>
			<div
				onScroll={(event) => {
					if (headRef.current) headRef.current.scrollLeft = event.currentTarget.scrollLeft;
				}}
				className='overflow-x-auto pb-2 scrollbar-soft [gap:inherit]'
			>
				<div ref={bodyRef} className='grid items-start [gap:inherit]' style={tracks}>
					<AnimatePresence initial={false}>
						{columns.map((column) => (
							<motion.section
								key={column.id}
								exit={columnExit}
								aria-label={column.name}
								// The 12px between the header and the first card is the column's, not the header's: a card lifting on hover
								// (Lift, 3px, with its shadow) stays inside the column, clear of the header row and of the sideways scroll
								// box's top edge, which would cut it.
								className='relative flex min-w-0 flex-col gap-3 px-3 pt-3 pb-3'
							>
								{/* The column's fill, a layer of its own so it can fade in under the cards (positioned, so the content
								    after it is too). */}
								<motion.div
									{...chromeMotion}
									aria-hidden='true'
									className='absolute inset-0 rounded-b-card bg-background-subtle'
								/>
								{/* As in the grid: a leaving card pops out at once while the others glide. */}
								<div className='relative flex flex-col gap-3 empty:hidden'>
									<AnimatePresence initial={false} mode='popLayout' custom={snap}>
										{column.patients.map((patient) => (
											<PanelItem
												key={patient.id}
												reducedMotion={reducedMotion}
												layoutTransition={layoutTransition}
												snap={snap}
												layoutId={panelCardLayoutId(patient.id)}
												className='grid grid-cols-1'
											>
												{renderCard(patient)}
											</PanelItem>
										))}
									</AnimatePresence>
								</div>
							</motion.section>
						))}
					</AnimatePresence>
				</div>
			</div>
		</div>
	);
}

/** Wraps the page's empty state: Reveals in, centered both ways in the space below the filter bar. */
function PanelEmpty({ children }: { children: React.ReactNode }) {
	const { prefersReducedMotion } = useMotionPreference();

	return (
		<motion.div
			variants={prefersReducedMotion ? cardReducedVariants : revealVariants}
			initial='initial'
			animate='animate'
			className='flex flex-1 items-center justify-center py-16'
		>
			{children}
		</motion.div>
	);
}

export {
	patientCardActions,
	activeAlertCount,
	matchesSearch,
	hasActiveAlert,
	hasOrganSupport,
	hasRisingAcuity,
	HospitalTabs,
	MyPatientsChip,
	PanelEmpty,
	PanelBoard,
	PanelGrid,
	QuickViewChips,
	StickyFilterBar,
	panelOrder,
	resolvedTimes,
	sortOrderById,
	shownAlert,
	useChangedSinceMount,
	useSnapOrder,
	useFadingResolvedAlerts,
	useGrouping,
	useHeldOrder,
	useRecentActivity,
	useResolvedHolds,
	usePatientScope,
	useSortBy,
	useSortCadence,
	useSortOnNewAlert,
	useSortPause,
	withResolvedHolds,
	SortSelect,
	type PanelHospital,
	type PanelPatient,
	type PatientScope,
	type QuickView,
	type GroupedView,
	type SortOrderId,
};
