import samplePhoto1 from "@/components/data-display/avatar/images/sample-photo-1.png";
import samplePhoto2 from "@/components/data-display/avatar/images/sample-photo-2.png";
import samplePhoto3 from "@/components/data-display/avatar/images/sample-photo-3.png";
import type { AccountMenuShift } from "@/components/navigation/account-menu";
import type { AppHeaderPerson, AppHeaderUser } from "@/components/navigation/app-header";

import type { PanelHospital } from "../shared/patient-panel";

// Synthetic data (PRD PC-180) shared by every Intercept Live screen: the user's hospitals, the user and their team.

// Each hospital's record system (`ehr`) is the Demo Use Cases' site table, so the census reads from four systems at once
// (Scenario 5, step 1): a badge on every card says which.
const sampleHospitals: PanelHospital[] = [
	// The hub (Demo Use Cases: "Regional West, Scottsbluff: hub; tele-critical-care command center", on Epic): its own ICU
	// is on the console too. Added Nov 17, 2026 (user's call) for Scenario 5, so the census has five sites and four EHRs.
	{ id: "regional-west", name: "Regional West", ehr: "Epic" },
	// A critical access hospital about 40 miles from the hub, with no ICU: one RN on the inpatient side at night, an APP
	// on call from home, the hub's tele-RN and intensivist covering remotely (Demo Use Cases, Scenario 4). Five patients
	// on Med-Surg, a swing bed, observation and the ED (Nov 6, 2026, user's call). Was Harbor Point General until Nov 6,
	// 2026 (user's call); its ICU patients moved to Sidney.
	{ id: "bridgeport", name: "Bridgeport Valley", ehr: "TruBridge" },
	// A critical access hospital: an ED with an ED physician and two nurses at night, a small med-surg floor under
	// tele-ICU coverage (Demo Use Cases, Scenario 2). Was Mercy West Hospital until Nov 4, 2026 (user's call).
	{ id: "alliance", name: "Alliance Community", ehr: "Cerner" },
	// A spoke hospital: an ED that boards patients when the inpatient unit is full, two nurses and a hospitalist APP
	// (Demo Use Cases, Scenario 3). Was CVMC until Nov 6, 2026 (user's call).
	{ id: "sidney", name: "Sidney Regional", ehr: "Meditech" },
	// A 25-bed critical access hospital: one RN on the floor at night, the family physician on call from home (Demo Use
	// Cases, Scenario 1).
	{ id: "chadron", name: "Chadron Memorial", ehr: "Meditech" },
];

const sampleUser: AppHeaderUser = {
	name: "Joanna Smith",
	initials: "JS",
	src: samplePhoto3,
	tone: 1,
	role: "Intensivist",
	// Shown until the countdown (sampleShiftEndsAt) takes over on the first client render.
	shiftEnds: "Shift ends at 8:00 PM",
};

// The user's day shift ends at 8:00 PM: today's, or tomorrow's once today's has passed, so the countdown always runs.
const sampleShiftEndsAt = (() => {
	const end = new Date();
	end.setHours(20, 0, 0, 0);
	if (end.getTime() <= Date.now()) end.setDate(end.getDate() + 1);
	return end.toISOString();
})();

// What the user covers this shift, for the account menu's My shift: every hospital, and the hub's call queues.
const sampleShift: Omit<AccountMenuShift, "ends"> = {
	hospitals: sampleHospitals.map((hospital) => hospital.name),
	callQueues: ["Tele-ICU", "Rapid response"],
};

const sampleTeam: AppHeaderPerson[] = [
	{ name: "Maria Ruiz", initials: "MR", src: samplePhoto2, tone: 3 },
	{ name: "James Turner", initials: "JT", src: samplePhoto1, tone: 6 },
	{ name: "Ava Brooks", initials: "AB", tone: 2 },
];

export { sampleHospitals, sampleShift, sampleShiftEndsAt, sampleTeam, sampleUser };
