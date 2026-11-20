import { DischargePlanPanel, type DischargeDecision, type DischargePlan } from "../../alert-panel/discharge-plan";
import { TransitionSection, type CareTransition, type TransitionDecision } from "./transition-section";

// The Discharge tab: the patient's way out of the hospital. The transition of care first (Scenario 6, PRD Transitions of
// care: the primary-care handoff, the readmission risk and the follow-up; `transition-section.tsx`), then the social
// needs and referrals (Scenario 2; the alert panel's `DischargePlanPanel`, the same one its pathway shows). Either part
// shows only with its data; the page shows the tab's empty state when there's neither.

/**
 * The Discharge tab: the transition of care, then the discharge plan, each with the record's data and the page's
 * handler for what the clinician decides.
 */
function DischargeSection({
	transition,
	discharge,
	patientName,
	onTransitionDecision,
	onDischargeDecision,
}: {
	transition?: CareTransition;
	discharge?: DischargePlan;
	/** As the handoff names them: "Margaret Hayes, 72, F". */
	patientName: string;
	onTransitionDecision?: (decision: TransitionDecision) => void;
	onDischargeDecision?: (decision: DischargeDecision) => void;
}) {
	return (
		<div className='flex max-w-2xl flex-col gap-10'>
			{transition ? <TransitionSection transition={transition} patientName={patientName} onDecision={onTransitionDecision} /> : null}
			{discharge ? <DischargePlanPanel plan={discharge} onDecision={onDischargeDecision} headingLevel='h2' /> : null}
		</div>
	);
}

export { DischargeSection };
