import type { AvatarFallbackProps } from "@/components/data-display/avatar";

// A patient's avatar, the same wherever it shows (the Census's and Monitoring's cards, the Patient details header): their
// photo when there is one, otherwise their initials in their own color.

// The ten colors; `none` (neutral) isn't one a patient gets.
type AvatarTone = Exclude<NonNullable<AvatarFallbackProps["tone"]>, "none">;

type AvatarPatient = { id: string; lastName: string; firstName?: string; hospital?: string; photo?: string };

/** "Miller, Sarah" → "MS". */
const patientInitials = ({ lastName, firstName }: { lastName: string; firstName?: string }) =>
	`${lastName[0] ?? ""}${firstName?.[0] ?? ""}`;

/**
 * A patient's avatar color from their id alone: one of Avatar's ten tones (Oct 31, 2026, user's call: random colors),
 * the same for a patient every time. Two patients can share one; `avatarTones` spreads a roster instead, so use this
 * only for a patient outside it.
 */
function avatarTone(patientId: string): AvatarTone {
	// FNV-1a, then a final mix (MurmurHash3's), so even sequential ids ("p1", "p2"…) land on unrelated tones.
	let hash = 0x811c9dc5;
	for (const character of patientId) hash = Math.imul(hash ^ character.charCodeAt(0), 0x01000193);
	hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
	hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
	hash = (hash ^ (hash >>> 16)) >>> 0;
	return ((hash % 10) + 1) as AvatarTone;
}

// The ten tones in an order where each looks least like the one before it: deep (1, 3, 9, 8, 10) and light (4, 2, 6, 7,
// 5) alternate, and no two in a row share a family. Among equal costs, the first wins.
const toneOrder: AvatarTone[] = [1, 4, 3, 2, 9, 6, 8, 7, 10, 5];
// Tones that read alike at a glance: the blues, the greens, purple and pink, red and orange.
const toneFamily: Record<AvatarTone, string> = {
	1: "blue",
	6: "blue",
	10: "blue",
	2: "green",
	8: "green",
	3: "purple",
	7: "purple",
	5: "warm",
	9: "warm",
	4: "olive",
};
// Most sorts end on the name, so patients near each other by name sit near each other on the page: beside each other,
// or one row apart in a grid of up to `nameWindow` columns.
const nameWindow = 7;

/**
 * Each patient's avatar color across a roster (Nov 1, 2026, user's call: tell patients apart in a fast scan). Patients
 * with a photo need none, so the rest share the ten tones. Going by name, each patient takes the tone that costs least:
 * every tone is used once before any repeats; a repeat goes to a patient in another hospital and far away by name; and
 * look-alike tones stay off name neighbors. So a hospital's patients all differ (up to ten without photos), and the same
 * color rarely meets itself whatever the sort. It depends on the roster only, not on the page's sort or filters, so
 * pass every patient: the same roster gives a patient the same color on every page.
 */
function avatarTones(patients: AvatarPatient[]): Map<string, AvatarTone> {
	const roster = [...new Map(patients.map((patient) => [patient.id, patient])).values()].sort(
		(a, b) =>
			a.lastName.localeCompare(b.lastName) ||
			(a.firstName ?? "").localeCompare(b.firstName ?? "") ||
			a.id.localeCompare(b.id, undefined, { numeric: true }),
	);
	const tones = new Map<string, AvatarTone>();
	const uses = new Map<AvatarTone, number>();
	const dealt: { index: number; hospital?: string; tone: AvatarTone }[] = [];

	roster.forEach((patient, index) => {
		if (patient.photo) return;
		const cost = (tone: AvatarTone) => {
			let total = (uses.get(tone) ?? 0) * 1000;
			for (const other of dealt) {
				const distance = index - other.index;
				const sameHospital = other.hospital === patient.hospital;
				if (other.tone === tone) {
					if (sameHospital) total += 100;
					if (distance <= nameWindow) total += (nameWindow + 1 - distance) * 10;
				} else if (toneFamily[other.tone] === toneFamily[tone]) {
					if (sameHospital) total += 5;
					if (distance <= 2) total += (3 - distance) * 5;
				}
			}
			return total;
		};
		const tone = toneOrder.reduce((best, candidate) => (cost(candidate) < cost(best) ? candidate : best));
		tones.set(patient.id, tone);
		uses.set(tone, (uses.get(tone) ?? 0) + 1);
		dealt.push({ index, hospital: patient.hospital, tone });
	});
	return tones;
}

export { avatarTone, avatarTones, patientInitials };
