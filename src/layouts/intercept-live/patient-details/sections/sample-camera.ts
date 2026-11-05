import type { CareTeamMember } from "../patient-details";
import { samplePatientBaseRecords, sampleScenarioCareTeams } from "../sample-patient-records";
import type { CameraPerson, CameraPreset, CameraSession, PatientCamera } from "./camera-section";

// Synthetic data (PRD Patient details PD-150): every Census patient's bedside camera. Who's here comes from each
// record's care team (`sample-patient-records.ts`), with what each person is doing now; anyone else in the room (a
// respiratory therapist, a perfusionist) is added per patient. Cameras and consent follow the hospital: Harbor Point
// General is all-party, so a huddle waits for consent before the AI Scribe listens (PD-073); CVMC's cameras have no
// two-way audio and no door preset; Alliance's have no pump preset; Chadron's med-surg room has only bed and monitor.

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const preset = {
	bed: { id: "bed", label: "Bed" },
	monitor: { id: "monitor", label: "Monitor" },
	pumps: { id: "pumps", label: "Pumps" },
	door: { id: "door", label: "Door" },
} satisfies Record<CameraPreset["id"], CameraPreset>;

const hospitals = {
	hpg: { presets: [preset.bed, preset.monitor, preset.pumps, preset.door], talk: true, consent: "all-party" },
	alliance: { presets: [preset.bed, preset.monitor, preset.door], talk: true, consent: "one-party" },
	cvmc: { presets: [preset.bed, preset.monitor, preset.pumps], talk: false, consent: "one-party" },
	chadron: { presets: [preset.bed, preset.monitor], talk: true, consent: "one-party" },
} satisfies Record<string, Pick<PatientCamera, "presets" | "talk" | "consent">>;

const presenceOrder: CameraPerson["presence"][] = ["online", "away", "offline"];

// What someone's doing when the patient's spec doesn't say.
const defaultActivity = (member: CareTeamMember) =>
	member.you
		? "Viewing the chart"
		: member.name === "James Turner"
			? "On another patient"
			: member.name === "Maria Ruiz"
				? "Away · on break"
				: { online: "Available", away: "Away", offline: "Off shift" }[member.presence ?? "offline"];

/** Who's here: the patient's care team with what each is doing, plus anyone else in the room; present first, you last. */
function people(patientId: string, activities: Record<string, string>, others: CameraPerson[]): CameraPerson[] {
	const careTeam =
		samplePatientBaseRecords.find((record) => record.id === patientId)?.careTeam ?? sampleScenarioCareTeams[patientId] ?? [];
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
	p1: camera("p1", "hpg", "Bed 11", { "Kelly Ortiz": "At the bedside", "Laura Mitchell": "Away · in the OR", "James Turner": "Viewing the chart" }, [
		["look-in", "James Turner", 48, 4],
		["huddle", "Joanna Smith", 205, 12, "drafted"],
		["huddle", "Maria Ruiz", 1180, 9, "signed"],
	]),
	// Johnson: ARDS, proned.
	p2: camera(
		"p2",
		"hpg",
		"Bed 3",
		{ "Brooke Sullivan": "At the bedside", "Laura Mitchell": "Rounding in the unit" },
		[
			["huddle", "Joanna Smith", 90, 14, "drafted"],
			["look-in", "Maria Ruiz", 370, 3],
		],
		[visitor("Lena Fox", "Respiratory therapist", "LF", 5, "At the bedside · prone check")],
	),
	p3: camera("p3", "cvmc", "Bed 7", { "Tara Becker": "At the bedside", "Ellen Parker": "Away · family meeting", "James Turner": "Viewing the chart" }, [
		["look-in", "James Turner", 25, 5],
		["huddle", "Joanna Smith", 300, 10, "signed"],
	]),
	p4: camera("p4", "cvmc", "Bed 5", { "Grace Holloway": "Charting at the station", "Daniel Reyes": "At the bedside" }, [
		["look-in", "Joanna Smith", 70, 3],
		["look-in", "Maria Ruiz", 520, 2],
	]),
	// Carter: on NIV, Kelly also covers Miller in Bed 11.
	p5: camera("p5", "hpg", "Bed 6", { "Kelly Ortiz": "In Bed 11", "Laura Mitchell": "Away · in the OR" }, [
		["look-in", "James Turner", 15, 6],
		["huddle", "Maria Ruiz", 400, 8, "drafted"],
	]),
	p6: camera("p6", "cvmc", "Bed 2", { "Lucy Hart": "At the bedside" }, [["look-in", "Maria Ruiz", 240, 2]]),
	p7: camera("p7", "cvmc", "Bed 12", { "Hannah Cole": "Gowning in · contact isolation", "Samuel Grant": "Away · in the OR" }, [
		["look-in", "Joanna Smith", 130, 4],
	]),
	p8: camera("p8", "hpg", "Bed 14", { "Rachel Dixon": "Charting at the station", "Laura Mitchell": "Away · in the OR" }, [
		["look-in", "James Turner", 600, 2],
	]),
	// Harris: a vent-order mismatch.
	p9: camera(
		"p9",
		"hpg",
		"Bed 8",
		{ "Kelly Ortiz": "In Bed 11", "Laura Mitchell": "Away · in the OR" },
		[
			["huddle", "Joanna Smith", 55, 9, "drafted"],
			["look-in", "James Turner", 200, 3],
		],
		[visitor("Owen Price", "Respiratory therapist", "OP", 9, "At the bedside · checking vent settings")],
	),
	// Moore: on CRRT and norepinephrine.
	p10: camera("p10", "hpg", "Bed 4", { "Rachel Dixon": "At the bedside", "Nathan Brooks": "Rounding in the unit" }, [
		["huddle", "James Turner", 80, 11, "signed"],
		["look-in", "Maria Ruiz", 380, 4],
	]),
	p11: camera("p11", "hpg", "Bed 1", { "Amy Dalton": "At the bedside", "Helen Foster": "At the bedside" }, [
		["look-in", "Joanna Smith", 35, 5],
	]),
	p12: camera("p12", "hpg", "Bed 2", { "Amy Dalton": "On another patient", "Victor Hale": "Away · in clinic" }, [
		["look-in", "Maria Ruiz", 150, 3],
		["huddle", "Joanna Smith", 1300, 15, "signed"],
	]),
	// Walker: VA-ECMO, with the perfusionist in the room.
	p13: camera(
		"p13",
		"cvmc",
		"Bed 3",
		{ "Grace Holloway": "At the bedside", "Daniel Reyes": "At the bedside", "James Turner": "Viewing the chart" },
		[
			["huddle", "Joanna Smith", 20, 16, "drafted"],
			["huddle", "Maria Ruiz", 330, 10, "signed"],
		],
		[visitor("Mark Hadley", "Perfusionist", "MH", 2, "At the ECMO console")],
	),
	p14: camera("p14", "cvmc", "Bed 9", { "Lucy Hart": "On another patient", "Ellen Parker": "At the bedside" }, [
		["look-in", "James Turner", 95, 4],
	]),
	// Hayes: no one from Intercept has looked in yet; Dr. Weller is on call from home.
	p15: camera("p15", "chadron", "Bed 4", { "Kayla Brandt": "At the bedside", "Tom Weller": "On call from home" }, []),
	// Erickson: asleep; his nurse is with Hayes next door.
	p16: camera("p16", "chadron", "Bed 6", { "Kayla Brandt": "With another patient", "Tom Weller": "On call from home" }, []),
	// Carlson and Hansen: asleep on the same floor.
	p19: camera("p19", "chadron", "Bed 2", { "Kayla Brandt": "With another patient", "Tom Weller": "On call from home" }, []),
	p20: camera("p20", "chadron", "Bed 8", { "Kayla Brandt": "With another patient", "Tom Weller": "On call from home" }, []),
	p17: camera("p17", "alliance", "Bed 10", { "Ashley Bell": "At the bedside", "Marcus Reed": "Away · in the OR" }, [
		["look-in", "James Turner", 180, 3],
	]),
	p18: camera("p18", "alliance", "Bed 5", { "Ashley Bell": "With another patient", "Marcus Reed": "Viewing the chart" }, [
		["look-in", "Joanna Smith", 240, 5],
	]),
	// Jensen: up in the chair after physical therapy.
	p22: camera("p22", "alliance", "Bed 3", { "Ashley Bell": "With another patient", "Marcus Reed": "Viewing the chart" }, [
		["look-in", "James Turner", 300, 3],
	]),
};

/** Dale Reynolds (Scenario 2): ED Bay 3, his nurse, the ED physician and the respiratory therapist at the BiPAP. */
const sampleScenario2Camera = () =>
	camera("p21", "alliance", "Bay 3", { "Megan Foster": "At the bedside", "Brian Keller": "At the bedside" }, [], [
		visitor("Rachel Lindgren", "Respiratory therapist", "RL", 4, "At the BiPAP"),
	]);

export { sampleCameraByPatient, sampleScenario2Camera };
