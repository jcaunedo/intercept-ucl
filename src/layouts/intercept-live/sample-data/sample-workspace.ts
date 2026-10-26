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
];

const sampleUser: AppHeaderUser = {
	name: "Joanna Smith",
	initials: "JS",
	src: samplePhoto3,
	tone: 1,
	shiftEnds: "Shift ends on 3:45",
};

const sampleTeam: AppHeaderPerson[] = [
	{ name: "Maria Ruiz", initials: "MR", src: samplePhoto2, tone: 3 },
	{ name: "James Tan", initials: "JT", src: samplePhoto1, tone: 6 },
	{ name: "Ava Brooks", initials: "AB", tone: 2 },
];

export { sampleHospitals, sampleTeam, sampleUser };
