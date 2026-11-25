import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { TooltipProvider } from "@/components/overlays/tooltip";

import { sampleMonitoringAlerts, sampleMonitoringPatients } from "../monitoring/sample-data/sample-monitoring";
import { samplePatients } from "../sample-data/sample-census";
import { hayesTransition } from "../sample-data/sample-scenario-6";
import { PatientDetailsTab, type PatientDetailsTabProps } from "./patient-details";
import { samplePatientRecords } from "./sample-data/sample-patient-details";

// Each Patient details tab on its own (Nov 25, 2026, user's call): the tab's content as the page shows it under its tab,
// without the Sidebar, the app header, the Patient Header or the other tabs, so each can be reviewed and handed off
// alone. The full page is in "Patient details". Sarah Miller (`p1`), the reference patient, except Discharge, which
// only Margaret Hayes (`p15`, Scenario 6) has.

/** A patient as the page gets them: their card's identity, their record, their monitor and their alerts. */
function patientTab(id: string): Omit<PatientDetailsTabProps, "section"> {
	const patient = samplePatients.find((item) => item.id === id)!;
	const live = sampleMonitoringPatients.find((item) => item.id === id);
	return {
		patient,
		record: samplePatientRecords.find((item) => item.id === id),
		monitor: live
			? { vitals: live.vitals, limits: live.limits, alarmPriorities: live.alarmPriorities, acknowledgedAlarms: live.acknowledgedAlarms, trends: live.trends }
			: undefined,
		alerts: sampleMonitoringAlerts.filter((alert) => alert.patientId === id),
	};
}

const meta = {
	title: "Layouts/Intercept Live/Patient details/Tabs",
	component: PatientDetailsTab,
	parameters: { layout: "fullscreen" },
	// The page's canvas: its background, and the tooltips the app shell provides.
	decorators: [
		(Story) => (
			<TooltipProvider>
				<div className='min-h-screen bg-background text-foreground'>
					<Story />
				</div>
			</TooltipProvider>
		),
	],
	args: {
		...patientTab("p1"),
		section: "overview",
		onAction: fn(),
		onShowSection: fn(),
		onDischargeDecision: fn(),
		onTransitionDecision: fn(),
	},
} satisfies Meta<typeof PatientDetailsTab>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Overview: the AI clinical summary, the clinical findings (key labs, then what matters for her situation), then cards. */
export const Overview: Story = {
	play: async ({ canvasElement }) => {
		await expect(await within(canvasElement).findByText("Lactate")).toBeVisible();
	},
};

/** Timeline: every value on one time axis, each lane ending in its Previous and Now values. */
export const Timeline: Story = {
	args: { section: "timeline" },
	play: async ({ canvasElement }) => {
		await expect(await within(canvasElement).findByRole("group", { name: /^Timeline chart/ }, { timeout: 5000 })).toBeVisible();
	},
};

/**
 * Labs: the labs' AI summary and the key labs across the top, then Lab trends (the chart and the tests that drive it), then
 * the results by panel, newest first, with Abnormal only, then microbiology.
 */
export const Labs: Story = {
	args: { section: "labs" },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(await canvas.findByRole("region", { name: "AI labs summary" })).toBeVisible();
		await expect(within(canvas.getByRole("region", { name: "Key labs" })).getByText("Lactate")).toBeVisible();
		await expect(canvas.getByRole("heading", { name: "Lab trends" })).toBeVisible();
		// The tests are a legend under the chart, each a toggle.
		const legend = within(canvas.getByRole("list", { name: "Tests on the chart" }));
		await expect(legend.getByRole("button", { name: "Lactate", pressed: true })).toBeVisible();
		// The key lab tiles are toggles, several at once; the last one off puts back the chart from before.
		const creatinine = canvas.getByRole("button", { name: "Creatinine, view trend" });
		const lactate = canvas.getByRole("button", { name: "Lactate, view trend" });
		await userEvent.click(creatinine);
		await expect(creatinine).toHaveAttribute("aria-pressed", "true");
		await expect(legend.getByRole("button", { name: "Lactate", pressed: false })).toBeVisible();
		await expect(canvas.getByRole("button", { name: "Actual values" })).toHaveAttribute("aria-pressed", "true");
		await userEvent.click(lactate);
		await expect(lactate).toHaveAttribute("aria-pressed", "true");
		await expect(legend.getByRole("button", { name: "Creatinine", pressed: true })).toBeVisible();
		await expect(legend.getByRole("button", { name: "Lactate", pressed: true })).toBeVisible();
		await expect(canvas.getByRole("button", { name: "Relative change" })).toHaveAttribute("aria-pressed", "true");
		await userEvent.click(creatinine);
		await expect(creatinine).toHaveAttribute("aria-pressed", "false");
		await expect(legend.getByRole("button", { name: "Creatinine", pressed: false })).toBeVisible();
		await userEvent.click(lactate);
		await expect(lactate).toHaveAttribute("aria-pressed", "false");
		await expect(legend.getByRole("button", { name: "WBC", pressed: true })).toBeVisible();
		await expect(legend.getByRole("button", { name: "Procalcitonin", pressed: true })).toBeVisible();
		// Lactate, WBC and procalcitonin have different units, so the chart opens in Relative change; Actual values keeps
		// the first test alone.
		await expect(canvas.getByRole("button", { name: "Relative change" })).toHaveAttribute("aria-pressed", "true");
		await userEvent.click(canvas.getByRole("button", { name: "Actual values" }));
		await expect(canvas.getByRole("button", { name: "Actual values" })).toHaveAttribute("aria-pressed", "true");
		await expect(legend.getByRole("button", { name: "WBC", pressed: false })).toBeVisible();
		// A test with another unit takes the chart alone; the mode stays Actual values.
		await userEvent.click(legend.getByRole("button", { name: "WBC" }));
		await expect(legend.getByRole("button", { name: "Lactate", pressed: false })).toBeVisible();
		await expect(canvas.getByRole("button", { name: "Actual values" })).toHaveAttribute("aria-pressed", "true");
		// A key lab tile charts its test alone.
		await userEvent.click(creatinine);
		await expect(await legend.findByRole("button", { name: "Creatinine", pressed: true })).toBeVisible();
		await expect(legend.getByRole("button", { name: "Lactate", pressed: false })).toBeVisible();
		await userEvent.click(legend.getByRole("button", { name: "Lactate" }));
		await expect(legend.getByRole("button", { name: "Lactate", pressed: true })).toBeVisible();
		// Add test picks any other test, which joins the legend.
		await userEvent.click(legend.getByRole("button", { name: "Add test" }));
		const all = within(await within(document.body).findByRole("region", { name: "All tests" }));
		await userEvent.click(all.getByRole("checkbox", { name: /Hemoglobin/ }));
		await userEvent.keyboard("{Escape}");
		await expect(await legend.findByRole("button", { name: "Hemoglobin", pressed: true })).toBeVisible();
		await userEvent.click(legend.getByRole("button", { name: "Back to the suggested tests" }));
		await expect(legend.queryByRole("button", { name: "Hemoglobin" })).toBeNull();
		await expect(canvas.getByRole("heading", { name: "Results" })).toBeVisible();
		await expect(canvas.getByRole("heading", { name: "Microbiology" })).toBeVisible();
	},
};

/** Chart: problems, allergies, history, home medications and imaging, from the hospital's record. */
export const Chart: Story = { args: { section: "chart" } };

/** Care Plan: the hospital's plan of care, each problem with its goal, interventions and pathways. */
export const CarePlan: Story = { args: { section: "care-plan" } };

/** Sepsis: her screening and the bundle's elements against time zero. */
export const Sepsis: Story = { args: { section: "sepsis" } };

/** Discharge: Margaret Hayes's transition of care to her primary care clinic (Scenario 6), as a draft to send. */
export const Discharge: Story = {
	args: (() => {
		const margaret = patientTab("p15");
		return { ...margaret, section: "discharge" as const, record: margaret.record && { ...margaret.record, transition: hayesTransition("draft") } };
	})(),
};

/** Medications: infusions, scheduled and as-needed medications, read only from the hospital's record. */
export const Medications: Story = { args: { section: "medications" } };

/** Orders: recommendations first, then active orders. */
export const Orders: Story = { args: { section: "orders" } };

/** Notes: the note list and the open note, edge to edge, with New note. */
export const Notes: Story = {
	args: { section: "notes" },
	play: async ({ canvasElement }) => {
		await expect(await within(canvasElement).findByRole("button", { name: /New note/ })).toBeVisible();
	},
};

/** EMR: the hospital's record system, as its own tab. */
export const Emr: Story = { name: "EMR", args: { section: "emr" } };

/** Live Camera: the bedside camera with her vitals, infusions and ventilator beside it. */
export const LiveCamera: Story = { args: { section: "camera" } };
