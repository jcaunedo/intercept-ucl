import samplePhoto1 from "@/components/data-display/avatar/images/sample-photo-1.png";
import samplePhoto2 from "@/components/data-display/avatar/images/sample-photo-2.png";
import samplePhoto3 from "@/components/data-display/avatar/images/sample-photo-3.png";
import type { AppHeaderPerson, AppHeaderUser } from "@/components/navigation/app-header";

import type { PanelHospital } from "../shared/patient-panel";

// Synthetic data (PRD PC-180) shared by every Intercept Live screen: the user's hospitals, the user and their team.

const sampleHospitals: PanelHospital[] = [
	{ id: "hpg", name: "Harbor Point General" },
	{ id: "mwh", name: "Mercy West Hospital" },
	{ id: "cvmc", name: "CVMC" },
	// A 25-bed critical access hospital: one RN on the floor at night, the family physician on call from home (Demo Use
	// Cases, Scenario 1).
	{ id: "chadron", name: "Chadron Community Hospital" },
];

const sampleUser: AppHeaderUser = {
	name: "Joanna Smith",
	initials: "JS",
	src: samplePhoto3,
	tone: 1,
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

const sampleTeam: AppHeaderPerson[] = [
	{ name: "Maria Ruiz", initials: "MR", src: samplePhoto2, tone: 3 },
	{ name: "James Tan", initials: "JT", src: samplePhoto1, tone: 6 },
	{ name: "Ava Brooks", initials: "AB", tone: 2 },
];

export { sampleHospitals, sampleShiftEndsAt, sampleTeam, sampleUser };
