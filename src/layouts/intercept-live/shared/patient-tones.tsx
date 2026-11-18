import * as React from "react";

import { avatarTones, type AvatarPatient, type AvatarTone } from "./patient-avatar";

// One avatar color per patient across the whole app (Nov 18, 2026, user's call: "fix the avatar colors so they match
// everywhere"). Each page used to deal colors over its own list (Monitoring its monitors, the Inbox its rows, a toast
// the page's patients), so a patient missing from one list (discharged, off Monitoring) or a page with a shorter list
// (Virtual Sepsis) gave other colors. Now the layout deals them once over its whole roster, the Patients directory and
// Monitoring's patients, and every page, toast, alert and chat row reads them from here. Colors stick: a patient who
// joins later (a scenario's arrival) is dealt around the others, so nobody's color changes while the app is open.

type PatientToneStore = {
	/** Every patient's tone so far, by id. Patients with a photo have none. */
	tones: ReadonlyMap<string, AvatarTone>;
	/** Deals a tone to each patient who has none yet, around the ones already dealt, and returns every tone. */
	extend: (patients: AvatarPatient[]) => ReadonlyMap<string, AvatarTone>;
};

const PatientTonesContext = React.createContext<PatientToneStore | null>(null);

/** The layout's tone store, over `roster`: every patient the layout knows. Pass it to `PatientTonesProvider`. */
function usePatientToneStore(roster: AvatarPatient[]): PatientToneStore {
	const known = React.useRef(new Map<string, AvatarPatient>());
	const tones = React.useRef(new Map<string, AvatarTone>());
	const store = React.useMemo<PatientToneStore>(
		() => ({
			tones: tones.current,
			extend: (patients) => {
				const fresh = patients.filter((patient) => !known.current.has(patient.id));
				if (!fresh.length) return tones.current;
				for (const patient of fresh) known.current.set(patient.id, patient);
				// The first call deals the whole roster at once, as `avatarTones` always did; later ones keep what's dealt.
				for (const [id, tone] of avatarTones([...known.current.values()], tones.current)) {
					if (!tones.current.has(id)) tones.current.set(id, tone);
				}
				return tones.current;
			},
		}),
		[],
	);
	// Idempotent: a patient is dealt once.
	store.extend(roster);
	return store;
}

const PatientTonesProvider = PatientTonesContext.Provider;

/**
 * The tones for a page's patients: the app's, from the layout's store (dealing any it hasn't seen), or, outside a layout
 * (a page's own story), dealt over `patients` alone as before.
 */
function usePatientTones(patients: AvatarPatient[]): ReadonlyMap<string, AvatarTone> {
	const store = React.useContext(PatientTonesContext);
	return React.useMemo(() => (store ? store.extend(patients) : avatarTones(patients)), [store, patients]);
}

/**
 * A patient's tone from the app's store, else `fallback`: for avatars whose tone comes with their data (the alert's
 * detail, the chat's answers), so they match the cards.
 */
function usePatientTone() {
	const store = React.useContext(PatientTonesContext);
	return React.useCallback(
		<T,>(patientId: string | undefined, fallback?: T): AvatarTone | T | undefined =>
			(patientId ? store?.tones.get(patientId) : undefined) ?? fallback,
		[store],
	);
}

export { PatientTonesProvider, usePatientTone, usePatientToneStore, usePatientTones, type PatientToneStore };
