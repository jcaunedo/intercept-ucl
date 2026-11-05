import bipapScreenPhoto from "./images/sample-photo-bipap-screen.jpg";
import bloodGas1hPhoto from "./images/sample-photo-blood-gas-1h.jpg";
import bloodGas2hPhoto from "./images/sample-photo-blood-gas-2h.jpg";
import {
  sampleScenario2AlertDetail,
  sampleScenario2ResolvedDetail,
} from "../alert-modal/sample-alert-modal";
import {
  sampleScenario2Census,
  sampleScenario2ResolvedCensus,
} from "../census/sample-census";
import {
  sampleScenario2Monitoring,
  sampleScenario2ResolvedMonitoring,
} from "../monitoring/sample-monitoring";
import type { AlertDetailData } from "../alert-modal/alert-modal";
import type { DischargePlan } from "../alert-modal/discharge-plan";
import type { ConsultMessage } from "../alert-modal/consult-messages";
import type { BedsidePhoto } from "../alert-modal/low-bandwidth";
import type { PatientRecord } from "../patient-details/patient-details";
import {
  sampleScenario2BaseRecord,
  sampleScenario2ResolvedRecord,
} from "../patient-details/sample-patient-records";
import { sampleScenario2Camera } from "../patient-details/sections/sample-camera";
import { sampleScenario2Chart } from "../patient-details/sections/sample-chart";
import { sampleScenarioEmr } from "../patient-details/sections/sample-epic";
import { sampleScenario2Medications } from "../patient-details/sections/sample-medications";
import { sampleScenario2Notes } from "../patient-details/sections/sample-notes";
import { sampleScenario2Orders } from "../patient-details/sections/sample-orders";
import {
  sampleScenario2ResolvedTimeline,
  sampleScenario2Timeline,
} from "../patient-details/sections/sample-timeline";
import {
  sampleScenario2ResolvedVitals,
  sampleScenario2Vitals,
} from "../patient-details/sections/sample-vitals";
import { sampleEhrByHospital } from "./sample-ehr";
import type { ScenarioBeat, ScenarioDefinition } from "./sample-scenario-1";

// Story-only: Scenario 2 of the Demo Use Cases, "COPD respiratory failure during a blizzard", as beats the Prototype
// menu plays. Dale Reynolds (`p21`), 64, a rancher with severe COPD, uninsured, out of the home oxygen he can't afford.
// In Alliance's ED, as in the scenario (Mercy West was renamed Alliance for it, Nov 4, 2026).
// He isn't on the Census until the ED requests the hub's consult, the first beat: it puts him on every page with his
// Critical alert, and Dr. Keller's call rings as a consult request; Answer opens his alert with the call on. Step 3 (keep or transfer, with air grounded and the road closed) and step 4 (the COPD pathway's NIV
// checkpoints, with the intubation plan prepared) are the clinician's, in his alert; step 5 (resolution, 2 h on NIV)
// plays once he's kept at Alliance.
//
// Step 2 (the network drops) plays 6 s after his video consult first goes live: Alliance's connection drops, the call
// freezes and goes on as audio, the monitor's numbers come every 30 s, 3 s later the ED nurse's word arrives and
// opens the alert panel's Messages column, and a photo of the BiPAP screen 8 s after the drop (PRD Bedside camera CAM-014; the photos moved
// from under the call to the messages on Nov 5, 2026, user's call). The blood gases' photos come with the resolution.
//
// Step 6 (social needs flagged) plays 10 s after he's kept, once the resolution has played: the discharge workflow
// flags "Uninsured" and "Can't afford home oxygen" from his chart, records the payer, and drafts the two referrals,
// which the clinician sends (with who agreed) or skips, in his alert's Pathway panel or his page's Discharge section.
// With his alert closed, a toast (a notice) says so and its Review referrals opens the alert at them.

/** Dale Reynolds's record with every section, at a stage of the scenario; built when the beat plays. */
function reynoldsRecord(stage: "alert" | "resolved"): PatientRecord {
  const census = sampleScenario2Census();
  const base = sampleScenario2BaseRecord();
  const record: PatientRecord =
    stage === "alert" ? base : { ...base, ...sampleScenario2ResolvedRecord() };
  const notes = sampleScenario2Notes();
  return {
    ...record,
    vitals:
      stage === "alert"
        ? sampleScenario2Vitals()
        : sampleScenario2ResolvedVitals(),
    timeline:
      stage === "alert"
        ? sampleScenario2Timeline()
        : sampleScenario2ResolvedTimeline(),
    chart: sampleScenario2Chart(base),
    medications: sampleScenario2Medications(),
    orders: sampleScenario2Orders(),
    emr: sampleScenarioEmr(record, census, notes),
    notes: { emr: sampleEhrByHospital[census.hospital ?? ""] ?? "Epic", notes },
    camera: sampleScenario2Camera(),
  };
}

/** Adds photos to the alert's low-bandwidth connection, as they arrive. Without one, nothing. */
const withPhotos =
  (...photos: BedsidePhoto[]) =>
  (detail: AlertDetailData): AlertDetailData =>
    detail.connection
      ? {
          ...detail,
          connection: {
            ...detail.connection,
            photos: [...(detail.connection.photos ?? []), ...photos],
          },
        }
      : detail;

/** Adds the ED nurse's messages to the consult's thread (the Messages column), as they're sent. */
const withMessages =
  (...messages: ConsultMessage[]) =>
  (detail: AlertDetailData): AlertDetailData => ({
    ...detail,
    messages: [...(detail.messages ?? []), ...messages],
  });

/**
 * Step 6: what the discharge workflow finds in Dale Reynolds's chart, and the referrals it drafts. Pulmonary rehab is
 * "closer to home": Alliance, not Scottsbluff. Programs and wording are illustrative until a case manager reviews them.
 */
const sampleScenario2Discharge = (): DischargePlan => ({
  source: "Discharge workflow, from his chart's social history and home meds",
  needs: [
    {
      id: "uninsured",
      label: "Uninsured",
      detail: "Since a seasonal job ended in 2025. No coverage on file at Alliance.",
      evidence: "social history: “uninsured since a seasonal job ended”",
    },
    {
      id: "home-oxygen",
      label: "Can't afford home oxygen",
      detail: "Prescribed 2 L/min. He often can't refill it, and ran out 4 days before this visit.",
      evidence: "social history and home meds",
    },
  ],
  payer: "Uninsured",
  referrals: [
    {
      id: "medicaid",
      title: "Medicaid eligibility screening",
      to: "Alliance financial counseling",
      detail: "Screens him for Nebraska Medicaid before he leaves. If he's eligible, it covers his home oxygen.",
      needIds: ["uninsured", "home-oxygen"],
    },
    {
      id: "pulmonary-rehab",
      title: "Pulmonary rehab, closer to home",
      to: "Alliance outpatient pulmonary rehab",
      detail: "Twice a week in Alliance instead of 60 mi away in Scottsbluff, starting once he's home.",
      needIds: [],
      reason: "Severe COPD (GOLD 3) after a hypercapnic exacerbation",
    },
  ],
});

/** The flags the discharge workflow adds to his card, after NIV, each opening what's behind it. */
const scenario2SocialFlags = () => {
  const updatedAt = new Date().toISOString();
  return [
    { label: "NIV" },
    {
      label: "Uninsured",
      details: {
        items: [{ label: "Payer", value: "None on file" }, { label: "Since a seasonal job ended in 2025" }],
        source: "Discharge workflow",
        updatedAt,
      },
    },
    {
      label: "Can't afford home oxygen",
      details: {
        items: [{ label: "Home oxygen", value: "2 L/min" }, { label: "Ran out 4 days before this visit" }],
        source: "Discharge workflow",
        updatedAt,
      },
    },
  ];
};

const secondsAgo = (seconds: number) =>
  new Date(Date.now() - seconds * 1000).toISOString();

const scenario2Beats: ScenarioBeat[] = [
  {
    after: "start",
    // 1. Consult starts (22:15): the ED physician has started BiPAP and asks for the hub intensivist. Blood gas pH 7.24,
    // PaCO₂ 78; RR 30, HR 112, SpO₂ 88% on BiPAP. NEWS2 7 (High, SpO₂ scale 2), up from 6 on arrival.
    label:
      "Alliance ED requests a consult for Reynolds: hypercapnic respiratory failure",
    changes: () => ({
      admit: [
        {
          census: sampleScenario2Census(),
          monitoring: sampleScenario2Monitoring(),
          record: reynoldsRecord("alert"),
        },
      ],
      fire: [
        {
          ...sampleScenario2AlertDetail().alert,
          // The ED physician calls the hub: it rings as a consult request until answered or declined (Nov 4, 2026, user's call).
          consultRequest: {
            title: "Urgent video consult request",
            // Urgent: it rings fast (Nov 4, 2026, user's call).
            urgency: "high",
            requester: {
              name: "Dr. Brian Keller",
              role: "ED physician",
              site: "Alliance ED",
              initials: "BK",
            },
            question: "Hypercapnic failure on BiPAP. Can we keep him here?",
            latest: "pH 7.24 · PaCO₂ 78 · RR 30 · SpO₂ 88% on BiPAP",
            // His Critical alert reaches his card and toasts first; the call rings 4 s later in its own toast (Nov 5, 2026,
            // user's call).
            ringAfter: 4,
          },
          evidence: [
            "ABG pH 7.24, PaCO₂ 78, PaO₂ 58, HCO₃ 33 (30 min ago)",
            "RR 30/min, HR 112 bpm, SpO₂ 88% on BiPAP FiO₂ 35%",
            "Severe COPD (GOLD 3), out of home oxygen for 4 days",
            "Transfer: air grounded, highway to Scottsbluff closed",
          ],
        },
      ],
    }),
  },
  {
    after: "consult",
    // 2. Network drops: Alliance's link falls to a fraction of normal mid-consult. The call freezes, then goes on
    // as audio only; vitals come every 30 s; photos are sent as they're taken. The banner says so, so nobody takes held
    // data for live.
    label:
      "Alliance's connection drops: Reynolds's consult goes on as audio, vitals every 30 s",
    changes: () => {
      // Taken once, as the beat plays: the change below is applied on every render.
      const since = new Date().toISOString();
      return {
        details: {
          // The ED nurse's word follows 3 s later (next beat) and opens the alert panel's Messages column.
          "live-reynolds": (detail) => ({
            ...detail,
            connection: {
              mode: "low-bandwidth",
              since,
              site: "Alliance",
              vitalsEvery: 30,
              photos: [],
            },
          }),
        },
        log: [
          {
            patientId: "p21",
            kind: "consult",
            title: "Low-bandwidth mode: audio only",
            detail:
              "Alliance's connection dropped mid-consult. Vitals every 30 s; photos sent as they're taken",
          },
        ],
      };
    },
  },
  {
    after: "consult",
    // 3 s after the low-bandwidth banner (Nov 5, 2026, user's call), the ED nurse says what comes next. The drop plays at
    // 6 s (`beatDelays.consult`), so 9 s.
    delay: 9,
    label: "Alliance's ED nurse: video froze, photos coming in Messages",
    changes: () => {
      // Taken once, as the beat plays: the change below is applied on every render.
      const sentAt = new Date().toISOString();
      return {
        details: {
          "live-reynolds": withMessages({
            id: "p21-message-dropped",
            from: "bedside",
            text: "Video froze on our side. Rachel will send the BiPAP screen and the next gases here.",
            sentAt,
          }),
        },
      };
    },
  },
  {
    after: "consult",
    delay: 14,
    // The BiPAP's screen, photographed by the respiratory therapist and sent as it's taken.
    label: "Photo from Alliance: Reynolds's BiPAP screen",
    changes: () => ({
      details: {
        "live-reynolds": withPhotos({
          id: "p21-photo-bipap",
          title: "BiPAP screen",
          kind: "device-screen",
          values: [
            { label: "IPAP", value: "12" },
            { label: "EPAP", value: "5" },
            { label: "FiO₂", value: "35%" },
            { label: "Vt", value: "380 mL" },
            { label: "RR", value: "28" },
            { label: "Leak", value: "16 L/min" },
          ],
          // AI-generated (Figma, Nov 5, 2026), its readings checked against `values`; no real patient or device.
          src: bipapScreenPhoto,
          takenAt: new Date().toISOString(),
          takenBy: "Rachel Lindgren, RRT",
        }),
      },
      log: [
        {
          patientId: "p21",
          kind: "consult",
          title: "Photo received: BiPAP screen",
          by: "Rachel Lindgren, RRT",
        },
      ],
    }),
  },
  {
    after: "keep",
    // 5. Resolution (2 h on NIV): pH 7.31 and PaCO₂ 64. Both checkpoints passed: NIV is working, no intubation and no
    // transfer. He stays in a monitored bed under hub follow-up. His nurse resolves the alert, as in Scenario 1. The
    // blood gases' photos, the 1 h one and the 2 h one, arrive with it.
    label:
      "Reynolds at 2 h: pH 7.31, PaCO₂ 64, NIV working, no transfer needed",
    changes: () => {
      // Taken once, as the beat plays: the change below is applied on every render.
      const addPhotos = withPhotos(
        {
          id: "p21-photo-abg-1h",
          title: "Blood gas, 1 h on BiPAP",
          kind: "blood-gas",
          values: [
            { label: "pH", value: "7.28" },
            { label: "PaCO₂", value: "70" },
            { label: "PaO₂", value: "62" },
            { label: "HCO₃", value: "32" },
          ],
          src: bloodGas1hPhoto,
          takenAt: secondsAgo(4),
          takenBy: "Rachel Lindgren, RRT",
        },
        {
          id: "p21-photo-abg-2h",
          title: "Blood gas, 2 h on BiPAP",
          kind: "blood-gas",
          values: [
            { label: "pH", value: "7.31" },
            { label: "PaCO₂", value: "64" },
            { label: "PaO₂", value: "66" },
            { label: "HCO₃", value: "32" },
          ],
          src: bloodGas2hPhoto,
          takenAt: new Date().toISOString(),
          takenBy: "Rachel Lindgren, RRT",
        },
      );
      // The ED nurse's word on the 2 h gas, after its photo.
      const addMessage = withMessages({
        id: "p21-message-resolved",
        from: "bedside",
        text: "2 h gas is back: pH 7.31, PaCO₂ 64. He stays with us on BiPAP.",
        sentAt: new Date(Date.now() + 1000).toISOString(),
      });
      return {
        census: { p21: sampleScenario2ResolvedCensus },
        monitoring: { p21: sampleScenario2ResolvedMonitoring },
        records: { p21: reynoldsRecord("resolved") },
        resolve: {
          "live-reynolds": {
            by: "Megan Foster, RN",
            reason: "Treated",
            note: "pH 7.31, PaCO₂ 64 at 2 h on BiPAP. Both checkpoints passed; staying at Alliance.",
          },
        },
        details: {
          "live-reynolds": (detail) =>
            addMessage(addPhotos(sampleScenario2ResolvedDetail(detail))),
        },
      };
    },
  },
  {
    after: "keep",
    // 10 s after he's kept, 4 s after the resolution (Nov 5, 2026, user's call; it was 14 s).
    delay: 10,
    // 6. Social needs flagged: the discharge workflow reads his chart, flags "uninsured" and "can't afford home oxygen",
    // and drafts referrals for Medicaid eligibility screening and pulmonary rehab closer to home. The clinician sends them.
    label:
      "Discharge workflow flags Reynolds's social needs: uninsured, can't afford home oxygen",
    changes: () => {
      const discharge = sampleScenario2Discharge();
      const tags = scenario2SocialFlags();
      return {
        census: { p21: { tags } },
        monitoring: { p21: { tags } },
        records: { p21: { discharge } },
        details: {
          "live-reynolds": (detail) => ({ ...detail, discharge, tags }),
        },
        // With his alert closed, a toast says there's something to send, and opens the referrals (Nov 5, 2026, user's call).
        notices: [
          {
            id: "p21-social-needs",
            patientId: "p21",
            alertId: "live-reynolds",
            title: "Social needs at discharge",
            description:
              "Uninsured and can't afford home oxygen. 2 referrals drafted: Medicaid eligibility screening and pulmonary rehab.",
            actionLabel: "Review referrals",
            focus: "discharge",
          },
        ],
        log: [
          {
            patientId: "p21",
            kind: "note",
            title: "Social needs flagged for discharge",
            detail:
              "Uninsured; can't afford home oxygen. Referrals drafted: Medicaid eligibility screening, pulmonary rehab in Alliance",
            by: "Discharge workflow",
          },
        ],
      };
    },
  },
];

const sampleScenario2: ScenarioDefinition = {
  patientIds: ["p21"],
  alertIds: ["live-reynolds"],
  beats: scenario2Beats,
};

export { sampleScenario2, sampleScenario2Discharge };
