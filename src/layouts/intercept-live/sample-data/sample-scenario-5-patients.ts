import { sampleScenario5LindaCensus } from "./sample-census";
import type { PatientRecord } from "../patient-details/patient-details";
import { samplePatientRecords, withEtco2Lane } from "../patient-details/sample-patient-details";
import {
	sampleScenario5LindaBaseRecord,
	sampleScenario5LindaRecordAt,
	sampleScenario5WalterRecordAt,
} from "../patient-details/sample-patient-records";
import { sampleScenario5LindaCamera, sampleScenario5WalterCamera } from "../patient-details/sections/sample-camera";
import { sampleScenario5LindaChart, sampleScenario5WalterChart } from "../patient-details/sections/sample-chart";
import { sampleScenarioEmr } from "../patient-details/sections/sample-epic";
import { withGlucose } from "../patient-details/sections/sample-glucose";
import { sampleScenario5LindaMedications, sampleScenario5WalterMedications } from "../patient-details/sections/sample-medications";
import {
	sampleScenario5DocumentationMinutes,
	sampleScenario5LindaNotes,
	sampleScenario5WalterNotes,
} from "../patient-details/sections/sample-notes";
import { sampleScenario5LindaOrders, sampleScenario5WalterOrders } from "../patient-details/sections/sample-orders";
import { sampleScenario5LindaTimeline, sampleScenario5WalterTimeline } from "../patient-details/sections/sample-timeline";
import { sampleScenario5LindaVitals, sampleScenario5WalterVitals } from "../patient-details/sections/sample-vitals";
import { sampleEhrByHospital } from "./sample-ehr";

// Story-only: Scenario 5's two patients' full records, at each stage, for the scenario's beats (`sample-scenario-5.ts`)
// to patch in, as `kesslerRecord` does for Scenario 4. Walter Pierce (`p30`, Regional West MICU Bed 4) is a base
// patient: his record before the scenario is the census's (`samplePatientRecords`). Linda Shaw (`p31`, Sidney ED Bay 4)
// arrives with her stroke alert, so her record is built when the beat plays (its times read "just now"). Every value
// is illustrative until clinical review.

/** Who's who in Scenario 5, as their names read in the activity log and the notes. */
const sampleScenario5Staff = {
	/** Walter Pierce's nurse at Regional West, the one his video consult calls. */
	lauren: "Lauren Fisher, RN",
	/** His respiratory therapist. */
	kevin: "Kevin Doyle, RRT",
	/** His pulmonologist, the attending of record, off until 07:00. */
	neil: "Neil Foster, MD",
	/** Linda Shaw's nurse in Sidney's ED, the one her video consult calls. */
	ashley: "Ashley Brooks, RN",
	/** The second ED nurse. */
	kristen: "Kristen Webb, RN",
	/** Sidney's hospitalist APP, who leads her case and co-signs the remote orders. */
	jenna: "Jenna Collins, NP",
	/** Intercept's backup intensivist, who takes Linda's stroke alert when the hub sends it (step 3). */
	mark: "Mark Sullivan, MD",
};

/**
 * Walter Pierce's record at a stage of Scenario 5, with every section: `base` (holding before it; the same as his record
 * on the census), `desat` (03:10) or `stabilized` (about 04:30). `drafted` adds the AI's event note for the
 * desaturation to his Notes (step 6), for the hub intensivist to review and sign.
 */
function pierceRecord(stage: "base" | "desat" | "stabilized", { drafted = false }: { drafted?: boolean } = {}): PatientRecord {
	const base = samplePatientRecords.find((record) => record.id === "p30");
	if (!base) throw new Error("Walter Pierce (p30) is missing from the census's records");
	if (stage === "base" && !drafted) return base;
	const record: PatientRecord = stage === "base" ? base : { ...base, ...sampleScenario5WalterRecordAt(stage) };
	const notes = sampleScenario5WalterNotes({ drafted });
	if (stage === "base") return { ...record, notes: { ...base.notes, emr: base.notes?.emr ?? "Epic", notes } };
	const vitals = sampleScenario5WalterVitals(stage);
	return {
		...record,
		...withGlucose("p30", {
			vitals,
			timeline: withEtco2Lane(sampleScenario5WalterTimeline(stage), vitals),
			admittedAt: record.icuAdmittedAt ?? record.admittedAt,
		}),
		chart: sampleScenario5WalterChart(record),
		medications: sampleScenario5WalterMedications(stage, record),
		orders: sampleScenario5WalterOrders(stage),
		notes: { emr: base.notes?.emr ?? "Epic", writeBack: base.notes?.writeBack, notes },
		camera: sampleScenario5WalterCamera(stage),
	};
}

/**
 * Linda Shaw's record at a stage of Scenario 5, with every section: at her stroke alert (`alert`, 03:11), thrombolysed
 * with the CTA in (`lysed`, about 04:15) or at door-out (`transferred`, 04:38). `drafted` adds the AI's event note for
 * the stroke code to her Notes (step 6), for Intercept's backup intensivist to review and sign.
 */
function shawRecord(stage: "alert" | "lysed" | "transferred", { drafted = false }: { drafted?: boolean } = {}): PatientRecord {
	const census = sampleScenario5LindaCensus();
	const base = sampleScenario5LindaBaseRecord();
	const record: PatientRecord = stage === "alert" ? base : { ...base, ...sampleScenario5LindaRecordAt(stage) };
	const notes = sampleScenario5LindaNotes(stage, { drafted });
	return {
		...record,
		...withGlucose("p31", { vitals: sampleScenario5LindaVitals(stage), timeline: sampleScenario5LindaTimeline(stage) }),
		chart: sampleScenario5LindaChart(record, stage),
		medications: sampleScenario5LindaMedications(stage),
		orders: sampleScenario5LindaOrders(stage),
		emr: sampleScenarioEmr(record, census, notes),
		notes: { emr: sampleEhrByHospital[census.hospital ?? ""] ?? "Meditech", writeBack: true, notes },
		camera: sampleScenario5LindaCamera(),
	};
}

export { pierceRecord, sampleScenario5DocumentationMinutes, sampleScenario5Staff, shawRecord };
