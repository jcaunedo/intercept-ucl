import { CensusList, type CensusListPatient } from "@/components/data-display/census-list";
import { cn } from "@/lib/utils";

import { SidePanel } from "./side-panel";

// The census list (PRD Census list; the patient switcher, PRD Patient details PD-015): on a patient's page, the census, the patients in
// hospital now (Nov 16, 2026, user's call: it only shows the census), in the order and filters of the page the user
// came from (Monitoring's, or Patients' without those no longer in hospital), opened from the app header's list button.
// Picking a patient switches the page to them and keeps the list open, so the user can work down it. Ahead of Figma:
// intercept.ds draws the button, not the panel.

/** One patient in the list, as the source page shows them (UCL CensusList's patient). */
type CensusListEntry = CensusListPatient;

/**
 * The list beside the canvas, between the Sidebar and the page (the same place as Ask Intercept Live, which it takes
 * turns with). The open patient is marked and scrolled into view.
 */
function CensusListPanel({
	open,
	onOpenChange,
	carded,
	width,
	onWidthChange,
	patients,
	currentId,
	onSelectPatient,
	patientHref,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** The canvas's card edge, for when the Sidebar is collapsed. */
	carded: boolean;
	width: number;
	onWidthChange: (width: number) => void;
	/** The source page's list, in its order; only those in hospital show. */
	patients: CensusListEntry[];
	currentId: string;
	onSelectPatient: (patientId: string) => void;
	/** Each patient's page as an address: the rows become links (Cmd/Ctrl+click opens a new tab). */
	patientHref?: (patientId: string) => string | undefined;
}) {
	return (
		<SidePanel
			id='patient-list'
			side='left'
			// The census, from any page (Nov 16, 2026, user's call; PRD Patient details PD-015).
			title='Census'
			header='bar'
			open={open}
			onOpenChange={onOpenChange}
			width={width}
			onWidthChange={onWidthChange}
			className={cn(
				"transition-[border-radius,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
				carded && "rounded-l-2xl shadow-[0_0_26px_0_oklch(0_0_0/16%)]",
			)}
		>
			{/* No line under the title (Nov 16, 2026, user's call; PRD Census list CNL-011), so the list starts 12px under the
			    rule. It scrolls the open patient into view itself; it mounts each time the panel opens. */}
			<CensusList
				patients={patients}
				currentId={currentId}
				onSelectPatient={onSelectPatient}
				patientHref={patientHref}
				className='pt-3'
			/>
		</SidePanel>
	);
}

export { CensusListPanel, type CensusListEntry };
