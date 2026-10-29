import type { CareTeamMember } from "../patient-details";
import { samplePatientBaseRecords } from "../sample-patient-records";
import type { CameraPerson, CameraPreset, CameraSession, PatientCamera } from "./camera-section";

// Synthetic data (PRD Patient details PD-150): every Census patient's bedside camera. Who's here comes from each
// record's care team (`sample-patient-records.ts`), with what each person is doing now; anyone else in the room (a
// respiratory therapist, a perfusionist) is added per patient. Cameras and consent follow the hospital: Harbor Point
// General is all-party, so a huddle waits for consent before the AI Scribe listens (PD-073); CVMC's cameras have no
// two-way audio and no door preset; Mercy West's have no pump preset.

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const preset = {
	bed: { id: "bed", label: "Bed" },
	monitor: { id: "monitor", label: "Monitor" },
	pumps: { id: "pumps", label: "Pumps" },
	door: { id: "door", label: "Door" },
} satisfies Record<CameraPreset["id"], CameraPreset>;

const hospitals = {
	hpg: { presets: [preset.bed, preset.monitor, preset.pumps, preset.door], talk: true, consent: "all-party" },
	mwh: { presets: [preset.bed, preset.monitor, preset.door], talk: true, consent: "one-party" },
	cvmc: { presets: [preset.bed, preset.monitor, preset.pumps], talk: false, consent: "one-party" },
} satisfies Record<string, Pick<PatientCamera, "presets" | "talk" | "consent">>;

const presenceOrder: CameraPerson["presence"][] = ["online", "away", "offline"];

// What someone's doing when the patient's spec doesn't say.
const defaultActivity = (member: CareTeamMember) =>
	member.you
		? "Viewing the chart"
		: member.name === "James Tan"
			? "On another patient"
			: member.name === "Maria Ruiz"
				? "Away · on break"
				: { online: "Available", away: "Away", offline: "Off shift" }[member.presence ?? "offline"];

/** Who's here: the patient's care team with what each is doing, plus anyone else in the room; present first, you last. */
function people(patientId: string, activities: Record<string, string>, others: CameraPerson[]): CameraPerson[] {
	const careTeam = samplePatientBaseRecords.find((record) => record.id === patientId)?.careTeam ?? [];
	const team = careTeam.map(
		(member): CameraPerson => ({
			name: member.name,
			role: member.role,
			initials: member.initials,
			src: member.src,
			tone: member.tone,
			presence: member.presence ?? "offline",
			activity: activities[member.name] ?? defaultActivity(member),
			you: member.you,
		}),
	);
	return [...others, ...team].sort(
		(a, b) => Number(Boolean(a.you)) - Number(Boolean(b.you)) || presenceOrder.indexOf(a.presence) - presenceOrder.indexOf(b.presence),
	);
}

/** A past session: kind, who started it, how long ago (minutes), how long (minutes) and the scribe's note, if any. */
type SessionSpec = [kind: CameraSession["kind"], by: string, ago: number, minutes: number, note?: CameraSession["scribeNote"]];

function camera(
	patientId: string,
	hospital: keyof typeof hospitals,
	room: string,
	activities: Record<string, string>,
	sessions: SessionSpec[],
	others: CameraPerson[] = [],
): PatientCamera {
	return {
		room,
		...hospitals[hospital],
		people: people(patientId, activities, others),
		sessions: sessions
			.map(([kind, by, ago, minutes, scribeNote], index) => ({
				id: `${patientId}-session-${index}`,
				kind,
				by,
				startedAt: minutesAgo(ago),
				minutes,
				scribeNote,
			}))
			.sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
	};
}

/** Someone in the room who isn't on the care team. */
const visitor = (name: string, role: string, initials: string, tone: CameraPerson["tone"], activity: string): CameraPerson => ({
	name,
	role,
	initials,
	tone,
	presence: "online",
	activity,
});

const sampleCameraByPatient: Record<string, PatientCamera> = {
	// Miller: septic shock, ventilated, on pressors.
	p1: camera("p1", "hpg", "Bed 11", { "Kevin Ortiz": "At the bedside", "Priya Shah": "Away · in the OR", "James Tan": "Viewing the chart" }, [
		["look-in", "James Tan", 48, 4],
		["huddle", "Joanna Smith", 205, 12, "drafted"],
		["huddle", "Maria Ruiz", 1180, 9, "signed"],
	]),
	// Johnson: ARDS, proned.
	p2: camera(
		"p2",
		"mwh",
		"Bed 3",
		{ "Aisha Bello": "At the bedside", "Marcus Lee": "Rounding in the unit" },
		[
			["huddle", "Joanna Smith", 90, 14, "drafted"],
			["look-in", "Maria Ruiz", 370, 3],
		],
		[visitor("Lena Fox", "Respiratory therapist", "LF", 5, "At the bedside · prone check")],
	),
	p3: camera("p3", "cvmc", "Bed 7", { "Tom Becker": "At the bedside", "Elena Petrova": "Away · family meeting", "James Tan": "Viewing the chart" }, [
		["look-in", "James Tan", 25, 5],
		["huddle", "Joanna Smith", 300, 10, "signed"],
	]),
	p4: camera("p4", "cvmc", "Bed 5", { "Grace Okafor": "Charting at the station", "Daniel Reyes": "At the bedside" }, [
		["look-in", "Joanna Smith", 70, 3],
		["look-in", "Maria Ruiz", 520, 2],
	]),
	// Carter: on NIV, Kevin also covers Miller in Bed 11.
	p5: camera("p5", "hpg", "Bed 6", { "Kevin Ortiz": "In Bed 11", "Priya Shah": "Away · in the OR" }, [
		["look-in", "James Tan", 15, 6],
		["huddle", "Maria Ruiz", 400, 8, "drafted"],
	]),
	p6: camera("p6", "cvmc", "Bed 2", { "Lucy Nguyen": "At the bedside" }, [["look-in", "Maria Ruiz", 240, 2]]),
	p7: camera("p7", "mwh", "Bed 12", { "Hannah Cole": "Gowning in · contact isolation", "Marcus Lee": "Away · in the ED" }, [
		["look-in", "Joanna Smith", 130, 4],
	]),
	p8: camera("p8", "hpg", "Bed 14", { "Rosa Delgado": "Charting at the station", "Priya Shah": "Away · in the OR" }, [
		["look-in", "James Tan", 600, 2],
	]),
	// Harris: a vent-order mismatch.
	p9: camera(
		"p9",
		"hpg",
		"Bed 8",
		{ "Kevin Ortiz": "In Bed 11", "Priya Shah": "Away · in the OR" },
		[
			["huddle", "Joanna Smith", 55, 9, "drafted"],
			["look-in", "James Tan", 200, 3],
		],
		[visitor("Owen Price", "Respiratory therapist", "OP", 9, "At the bedside · checking vent settings")],
	),
	// Moore: on CRRT and norepinephrine.
	p10: camera("p10", "hpg", "Bed 4", { "Rosa Delgado": "At the bedside", "Nathan Brooks": "Rounding in the unit" }, [
		["huddle", "James Tan", 80, 11, "signed"],
		["look-in", "Maria Ruiz", 380, 4],
	]),
	p11: camera("p11", "hpg", "Bed 1", { "Amara Diallo": "At the bedside", "Helen Park": "At the bedside" }, [
		["look-in", "Joanna Smith", 35, 5],
	]),
	p12: camera("p12", "hpg", "Bed 2", { "Amara Diallo": "On another patient", "Victor Hale": "Away · in clinic" }, [
		["look-in", "Maria Ruiz", 150, 3],
		["huddle", "Joanna Smith", 1300, 15, "signed"],
	]),
	// Walker: VA-ECMO, with the perfusionist in the room.
	p13: camera(
		"p13",
		"cvmc",
		"Bed 3",
		{ "Grace Okafor": "At the bedside", "Daniel Reyes": "At the bedside", "James Tan": "Viewing the chart" },
		[
			["huddle", "Joanna Smith", 20, 16, "drafted"],
			["huddle", "Maria Ruiz", 330, 10, "signed"],
		],
		[visitor("Omar Haddad", "Perfusionist", "OH", 2, "At the ECMO console")],
	),
	p14: camera("p14", "cvmc", "Bed 9", { "Lucy Nguyen": "On another patient", "Elena Petrova": "At the bedside" }, [
		["look-in", "James Tan", 95, 4],
	]),
	p15: camera("p15", "mwh", "Bed 5", { "Aisha Bello": "At the bedside", "Marcus Lee": "On another patient" }, [
		["look-in", "James Tan", 60, 3],
	]),
};

export { sampleCameraByPatient };
