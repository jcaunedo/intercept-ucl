import * as React from "react";
import {
	CircleStopIcon,
	MicIcon,
	MicOffIcon,
	PauseIcon,
	PlayIcon,
	ShieldIcon,
	SparklesIcon,
	UsersIcon,
	VideoIcon,
	VideoOffIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import type { MonitorVitals } from "@/components/cards/patient-monitoring-card";
import { Avatar, AvatarFallback, AvatarImage, type AvatarFallbackProps } from "@/components/data-display/avatar";
import { Badge } from "@/components/data-display/badge";
import { Switch } from "@/components/forms/switch";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { fadeVariants, reducedMotionTransition, standardTransition, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

import type { PatientDetailsPatient, PatientInfusion, PatientVentilator } from "../patient-details";
import { formatDateTime, formatTime, NoData, SectionCard } from "../section-parts";

// Camera view (PRD Patient details PD-090, PD-073; Monitoring SV-031): the bedside camera with telemetry-and-camera
// fusion, the session and audio controls, the huddle that starts the AI Scribe, who's in the room, and the room's recent
// camera sessions. The feed is a drawn, synthetic room: the prototype shows no real or placeholder video (Brief).

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

/** Someone in the room or on the patient's chart right now, from Presence and Status (Spec §6.12). */
type CameraPerson = {
	name: string;
	role: string;
	initials: string;
	src?: string;
	tone?: AvatarFallbackProps["tone"];
	presence: "online" | "away" | "offline";
	/** What they're doing, e.g. "At the bedside", "Viewing the chart", "Away · in the OR". */
	activity: string;
	/** The signed-in clinician: shown as "In camera" while the session is on. */
	you?: boolean;
};

/** An earlier camera session in this room. */
type CameraSession = {
	id: string;
	kind: "look-in" | "huddle";
	/** Who started it. */
	by: string;
	startedAt: string;
	/** Length in minutes. */
	minutes: number;
	/** What the AI Scribe made of it, for a huddle. */
	scribeNote?: "drafted" | "signed";
};

/** A camera preset. Which ones exist depends on the hospital's hardware (SV-031). */
type CameraPreset = { id: "bed" | "monitor" | "pumps" | "door"; label: string };

/** The patient's bedside camera. */
type PatientCamera = {
	/** The room's label on the feed, e.g. "Bed 11". */
	room: string;
	presets: CameraPreset[];
	/** Whether the hospital allows two-way audio. Without it, the controls say so instead of showing Talk. */
	talk: boolean;
	/**
	 * The hospital's recording consent profile (PD-073). Under `all-party`, the AI Scribe starts listening only after
	 * consent is recorded for everyone on the call.
	 */
	consent: "one-party" | "all-party";
	people: CameraPerson[];
	/** Newest first. */
	sessions: CameraSession[];
};

/** What the clinician did, reported to the app (Care Coordination and Telepresence records it). */
type CameraAction =
	| { type: "start-session" }
	| { type: "end-session" }
	| { type: "preset"; presetId: CameraPreset["id"] }
	| { type: "talk"; on: boolean }
	| { type: "overlay"; on: boolean }
	| { type: "start-huddle" }
	| { type: "scribe"; state: ScribeState };

type SessionState = "off" | "connecting" | "live";

/** Off, waiting for consent, listening, or paused. Stop returns it to off. */
type ScribeState = "off" | "consent" | "listening" | "paused";

type CameraSectionProps = {
	patient: PatientDetailsPatient;
	camera: PatientCamera;
	/** Live monitor values, for the overlay. */
	vitals?: MonitorVitals;
	infusions?: PatientInfusion[];
	ventilator?: PatientVentilator;
	onCameraAction?: (action: CameraAction) => void;
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

// Stands in for the camera's handshake, so the prototype shows the Connecting state.
const CONNECT_DELAY_MS = 1200;

// The drawn room is 640 × 360. Each preset frames part of it at the same 16:9, so the camera "moves" by scaling.
const SCENE = { width: 640, height: 360 };
const presetFrames: Record<CameraPreset["id"], { x: number; y: number; width: number }> = {
	bed: { x: 0, y: 0, width: 640 },
	monitor: { x: 430, y: 24, width: 192 },
	pumps: { x: 400, y: 96, width: 240 },
	door: { x: 0, y: 70, width: 340 },
};

/** What the room shows besides the bed, monitor and IV pole, from the patient's organ support. */
type RoomEquipment = {
	airway: "ventilator" | "niv" | "oxygen" | "none";
	/** Pumps on the IV pole, at most four. */
	pumps: number;
	/** A console beside the bed. */
	console?: "ecmo" | "crrt";
};

const isCrrt = (infusion: PatientInfusion) => infusion.drug.startsWith("CRRT");

/** The room's equipment, from the ventilator's support type, the patient's tags and the running infusions. */
function roomEquipment(patient: PatientDetailsPatient, ventilator?: PatientVentilator, infusions: PatientInfusion[] = []): RoomEquipment {
	const tags = (patient.tags ?? []).map((tag) => tag.label);
	const support = ventilator?.support;
	return {
		airway: support === "Invasive" ? "ventilator" : support === "NIV" ? "niv" : support === "Oxygen" ? "oxygen" : "none",
		pumps: Math.min(4, infusions.filter((infusion) => !isCrrt(infusion)).length),
		console: tags.includes("ECMO") ? "ecmo" : tags.includes("Dialysis") || infusions.some(isCrrt) ? "crrt" : undefined,
	};
}

const airwayDescriptions: Record<RoomEquipment["airway"], string | undefined> = {
	ventilator: "the ventilator",
	niv: "a non-invasive ventilation mask and its machine",
	oxygen: "a nasal cannula on wall oxygen",
	none: undefined,
};

const consoleDescriptions = { ecmo: "the ECMO console", crrt: "the CRRT machine" } as const;

const pumpCount = (count: number) => (count ? `${count} ${count === 1 ? "pump" : "pumps"}` : "an IV bag");

/** What the feed's text alternative says a preset shows. */
function presetDescription(preset: CameraPreset["id"], equipment: RoomEquipment) {
	const airway = airwayDescriptions[equipment.airway];
	const bedsideConsole = equipment.console ? consoleDescriptions[equipment.console] : undefined;
	const list = (items: (string | undefined)[]) => {
		const parts = items.filter((item): item is string => Boolean(item));
		return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : (parts[0] ?? "");
	};
	switch (preset) {
		case "bed":
			return list(["the whole bed", airway, `the IV pole with ${pumpCount(equipment.pumps)}`, bedsideConsole]);
		case "monitor":
			return "the wall monitor";
		case "pumps":
			return list([`the IV pole with ${pumpCount(equipment.pumps)}`, bedsideConsole]);
		case "door":
			return list(["the door", equipment.airway === "ventilator" || equipment.airway === "niv" ? airway : undefined]);
	}
}

// Short names for the overlay, as on a pump's screen.
// The ventilator settings the overlay shows, as the machine's screen leads with them.
const overlaySettings = ["FiO₂", "PEEP", "IPAP", "EPAP"];

const infusionShortNames: Record<string, string> = { Norepinephrine: "NE", Vasopressin: "Vaso" };

const presenceLabels = { online: "Online", away: "Away", offline: "Offline" } as const;

const sessionKinds = { "look-in": "Look in", huddle: "Huddle" } as const;

/** "03:12", or "1:03:12" past an hour. */
function formatClock(seconds: number) {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	const pad = (value: number) => String(value).padStart(2, "0");
	return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** "Today, 9:40 AM" or "Oct 26, 9:02 AM". */
function formatSessionStart(iso: string, now: number | null) {
	if (now !== null && new Date(iso).toDateString() === new Date(now).toDateString()) return `Today, ${formatTime(iso)}`;
	return formatDateTime(iso);
}

/* -------------------------------------------------------------------------- */
/* Feed                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The synthetic room: flat shapes in the gray primitives, so the feed stays a dark camera image in both themes (as the
 * circle Button keeps its light look). Decorative: the feed's text alternative describes it.
 */
function RoomScene({ preset, equipment }: { preset: CameraPreset["id"]; equipment: RoomEquipment }) {
	const { resolve } = useMotionPreference();
	const frame = presetFrames[preset];
	const scale = SCENE.width / frame.width;

	return (
		<svg viewBox={`0 0 ${SCENE.width} ${SCENE.height}`} aria-hidden='true' className='block size-full'>
			<motion.g
				initial={false}
				animate={{ x: -frame.x * scale, y: -frame.y * scale, scale }}
				transition={resolve(standardTransition)}
				style={{ originX: 0, originY: 0 }}
			>
				{/* Wall and floor */}
				<rect width='640' height='360' className='fill-(--gray-800)' />
				<rect y='272' width='640' height='88' className='fill-(--gray-900)' />
				{/* Door */}
				<rect x='22' y='92' width='56' height='180' rx='2' className='fill-(--graphite-700)' />
				<circle cx='70' cy='186' r='3' className='fill-(--gray-400)' />
				{/* Bed, patient and blanket */}
				<rect x='184' y='240' width='300' height='32' rx='3' className='fill-(--gray-700)' />
				<rect x='192' y='214' width='284' height='28' rx='6' className='fill-(--gray-300)' />
				<circle cx='236' cy='206' r='19' className='fill-(--gray-400)' />
				<rect x='262' y='200' width='196' height='26' rx='6' className='fill-(--blue-700) opacity-60' />
				<rect x='190' y='196' width='6' height='46' rx='2' className='fill-(--gray-500)' />

				{equipment.airway === "ventilator" ? (
					<g>
						<rect x='96' y='168' width='56' height='104' rx='4' className='fill-(--graphite-600)' />
						<rect x='104' y='178' width='40' height='24' rx='2' className='fill-(--gray-950)' />
						<polyline points='108,194 116,186 122,196 130,184 140,192' className='fill-none stroke-(--blue-300) stroke-2' />
						<path d='M152 200 C 190 176, 214 186, 232 204' className='fill-none stroke-(--gray-400) stroke-[5]' />
					</g>
				) : equipment.airway === "niv" ? (
					<g>
						<rect x='128' y='222' width='4' height='50' className='fill-(--gray-500)' />
						<rect x='110' y='194' width='40' height='28' rx='4' className='fill-(--graphite-600)' />
						<rect x='116' y='200' width='28' height='10' rx='1' className='fill-(--gray-950)' />
						<path d='M150 204 C 186 186, 220 190, 240 204' className='fill-none stroke-(--gray-400) stroke-[4]' />
						<ellipse cx='246' cy='209' rx='9' ry='11' className='fill-(--gray-200) opacity-80' />
						<path d='M238 200 C 228 190, 220 200, 222 214' className='fill-none stroke-(--gray-500) stroke-2' />
					</g>
				) : equipment.airway === "oxygen" ? (
					<g>
						<rect x='162' y='146' width='10' height='24' rx='3' className='fill-(--gray-300)' />
						<circle cx='167' cy='154' r='2.5' className='fill-(--green-300)' />
						<path d='M167 170 C 180 196, 214 196, 248 206' className='fill-none stroke-(--gray-300) stroke-[1.5]' />
					</g>
				) : null}

				{/* IV pole: a bag, and a pump per running infusion */}
				<rect x='508' y='112' width='4' height='160' className='fill-(--gray-500)' />
				<rect x='500' y='116' width='20' height='26' rx='4' className='fill-(--gray-200) opacity-50' />
				{[148, 174, 200, 226].slice(0, equipment.pumps).map((y) => (
					<g key={y}>
						<rect x='492' y={y} width='36' height='20' rx='2' className='fill-(--graphite-700)' />
						<rect x='498' y={y + 6} width='14' height='8' rx='1' className='fill-(--blue-300)' />
					</g>
				))}

				{equipment.console === "ecmo" ? (
					<g>
						<path d='M544 214 C 520 216, 500 226, 478 228' className='fill-none stroke-(--destructive-300) stroke-[4]' />
						<path d='M544 232 C 522 236, 500 238, 478 236' className='fill-none stroke-(--blue-300) stroke-[4]' />
						<rect x='544' y='186' width='58' height='86' rx='4' className='fill-(--graphite-600)' />
						<circle cx='573' cy='212' r='13' className='fill-(--gray-400)' />
						<circle cx='573' cy='212' r='5' className='fill-(--graphite-700)' />
						<rect x='552' y='238' width='42' height='14' rx='1' className='fill-(--gray-950)' />
					</g>
				) : equipment.console === "crrt" ? (
					<g>
						<path d='M548 220 C 520 220, 500 228, 478 230' className='fill-none stroke-(--destructive-300) stroke-[3]' />
						<rect x='548' y='158' width='48' height='114' rx='4' className='fill-(--graphite-600)' />
						<rect x='566' y='168' width='10' height='36' rx='5' className='fill-(--gray-300)' />
						<rect x='555' y='214' width='34' height='18' rx='1' className='fill-(--gray-950)' />
					</g>
				) : null}

				{/* Wall monitor with an ECG trace and a pleth bar */}
				<rect x='452' y='44' width='150' height='84' rx='3' className='fill-(--gray-950) stroke-(--gray-600) stroke-2' />
				<polyline
					points='462,72 478,72 482,60 486,84 490,72 512,72 516,60 520,84 524,72 546,72 550,60 554,84 558,72 590,72'
					className='fill-none stroke-(--green-300) stroke-2'
				/>
				<rect x='462' y='100' width='60' height='8' rx='1' className='fill-(--blue-300)' />
			</motion.g>
		</svg>
	);
}

/** One device's values in the overlay band: its name, then each value's label and reading. */
function OverlayGroup({ device, values }: { device: string; values: [string, string][] }) {
	return (
		<p className='flex flex-wrap items-baseline gap-x-2 gap-y-0.5'>
			<span className='text-(--gray-400)'>{device}</span>
			{values.map(([label, value]) => (
				<span key={label} className='whitespace-nowrap'>
					<span className='text-(--gray-300)'>{label}</span> <span className='font-bold text-(--white)'>{value}</span>
				</span>
			))}
		</p>
	);
}

/* -------------------------------------------------------------------------- */
/* CameraSection                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The patient's bedside camera (PRD PD-090): a session the clinician starts and ends, presets, Talk / mute (never
 * unmuted on its own), and the telemetry overlay, on by default. Start huddle opens the camera, the call and the AI
 * Scribe together; while the scribe listens, its state and Pause / Stop stay on screen (PD-073).
 */
function CameraSection({ patient, camera, vitals, infusions, ventilator, onCameraAction }: CameraSectionProps) {
	const now = useCurrentMinute();
	const { prefersReducedMotion } = useMotionPreference();
	const [session, setSession] = React.useState<SessionState>("off");
	const [startedAt, setStartedAt] = React.useState<number>();
	const [elapsed, setElapsed] = React.useState(0);
	const [preset, setPreset] = React.useState<CameraPreset["id"]>(camera.presets[0]?.id ?? "bed");
	const [talking, setTalking] = React.useState(false);
	const [overlay, setOverlay] = React.useState(true);
	const [huddle, setHuddle] = React.useState(false);
	const [scribe, setScribe] = React.useState<ScribeState>("off");
	const [sessions, setSessions] = React.useState(camera.sessions);
	const [announcement, setAnnouncement] = React.useState("");

	const report = (action: CameraAction) => onCameraAction?.(action);
	const live = session === "live";
	const presetLabel = camera.presets.find((item) => item.id === preset)?.label ?? "Bed";
	const equipment = roomEquipment(patient, ventilator, infusions);

	// Connecting stands in for the camera's handshake; the session clock starts when the feed is live.
	React.useEffect(() => {
		if (session !== "connecting") return;
		const timer = window.setTimeout(() => {
			setSession("live");
			setStartedAt(Date.now());
			setElapsed(0);
			setAnnouncement(`In camera, ${camera.room}`);
		}, CONNECT_DELAY_MS);
		return () => window.clearTimeout(timer);
	}, [session, camera.room]);

	React.useEffect(() => {
		if (!live || startedAt === undefined) return;
		const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
		return () => window.clearInterval(timer);
	}, [live, startedAt]);

	const setScribeState = (state: ScribeState, message: string) => {
		setScribe(state);
		setAnnouncement(message);
		report({ type: "scribe", state });
	};

	const startSession = () => {
		setSession("connecting");
		setAnnouncement("Connecting to the bedside camera");
		report({ type: "start-session" });
	};

	const endSession = () => {
		if (startedAt !== undefined) {
			setSessions((current) => [
				{
					id: `session-${startedAt}`,
					kind: huddle ? "huddle" : "look-in",
					by: camera.people.find((person) => person.you)?.name ?? "You",
					startedAt: new Date(startedAt).toISOString(),
					minutes: Math.max(1, Math.round(elapsed / 60)),
					scribeNote: huddle && scribe !== "off" ? "drafted" : undefined,
				},
				...current,
			]);
		}
		setSession("off");
		setStartedAt(undefined);
		setTalking(false);
		setHuddle(false);
		setScribe("off");
		setAnnouncement(huddle ? "Huddle ended. The camera is off." : "The camera is off.");
		report({ type: "end-session" });
	};

	const startHuddle = () => {
		if (session === "off") startSession();
		setHuddle(true);
		report({ type: "start-huddle" });
		if (camera.consent === "all-party") setScribeState("consent", "Huddle started. The AI Scribe is waiting for consent.");
		else setScribeState("listening", "Huddle started. The AI Scribe is listening.");
	};

	// CRRT runs on its own console, not a pump on the pole.
	const pumped = infusions?.filter((infusion) => !isCrrt(infusion)) ?? [];
	const ventilated =
		ventilator?.support === "Invasive" || ventilator?.support === "NIV"
			? ventilator.settings
					.filter((setting) => overlaySettings.includes(setting.label))
					.map((setting): [string, string] => [setting.label, setting.value.replace("%", "")])
			: [];
	const overlayGroups: { device: string; values: [string, string][] }[] = [
		{
			device: "Monitor",
			values: [
				["HR", vitals?.hr?.toString() ?? "--"],
				["SpO₂", vitals?.spo2?.toString() ?? "--"],
				["BP", vitals?.systolic && vitals.diastolic ? `${vitals.systolic}/${vitals.diastolic}` : "--"],
			],
		},
		...(pumped.length
			? [
					{
						device: "Pump",
						values: pumped.map(
							(infusion): [string, string] => [
								infusionShortNames[infusion.drug] ?? infusion.drug,
								infusion.rate?.split(" ")[0] ?? "unavailable",
							],
						),
					},
				]
			: []),
		// Only a ventilator or NIV machine has settings to overlay; charted oxygen and room air don't.
		...(ventilated.length ? [{ device: "Ventilator", values: ventilated }] : []),
	];

	const location = [patient.hospital, patient.unit].filter(Boolean).join(" ");
	const feedLabel = live
		? `Synthetic bedside camera feed, ${camera.room}, ${presetLabel} preset, showing ${presetDescription(preset, equipment)}.`
		: session === "connecting"
			? `Bedside camera, ${camera.room}, connecting.`
			: `Bedside camera, ${camera.room}, off.`;

	return (
		<div className='@container'>
			<p aria-live='polite' className='sr-only'>
				{announcement}
			</p>
			<div className='grid gap-6 @min-[56rem]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'>
				<SectionCard title='Patient room' meta={[camera.room, location].filter(Boolean).join(" · ")}>
					{scribe !== "off" ? (
						<ScribeBar
							state={scribe}
							onConsent={() => setScribeState("listening", "Consent recorded. The AI Scribe is listening.")}
							onPause={() => setScribeState("paused", "The AI Scribe is paused.")}
							onResume={() => setScribeState("listening", "The AI Scribe is listening.")}
							onStop={() => setScribeState("off", "The AI Scribe stopped. Nothing more is captured.")}
						/>
					) : null}

					<figure className='overflow-hidden rounded-lg bg-(--gray-900)'>
						<div role='img' aria-label={feedLabel} className='relative aspect-video'>
							<div
								className={cn(
									"absolute inset-0 transition-opacity motion-reduce:transition-none",
									live ? "opacity-100" : session === "connecting" ? "opacity-30" : "opacity-0",
								)}
							>
								<RoomScene preset={preset} equipment={equipment} />
							</div>

							<span className='absolute top-3 left-3 rounded-md bg-(--gray-950)/80 px-2 py-1 text-xs font-medium text-(--white)'>
								Synthetic feed · {camera.room}
							</span>
							<span
								className={cn(
									"absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold",
									live ? "bg-severity-critical text-severity-foreground" : "bg-(--gray-950)/80 text-(--gray-300)",
								)}
							>
								{live ? (
									<>
										<span aria-hidden='true' className='size-1.5 rounded-full bg-current' />
										In camera <span className='tabular-nums'>{formatClock(elapsed)}</span>
									</>
								) : session === "connecting" ? (
									"Connecting…"
								) : (
									"Off"
								)}
							</span>
							{live && scribe !== "off" ? (
								<span className='absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-md bg-(--gray-950)/80 px-2 py-1 text-xs font-medium text-(--white)'>
									<SparklesIcon aria-hidden='true' className='size-3.5' />
									{scribe === "listening" ? "AI Scribe on" : scribe === "paused" ? "AI Scribe paused" : "AI Scribe waiting"}
								</span>
							) : null}

							<AnimatePresence initial={false}>
								{session === "off" ? (
									<motion.div
										key='off'
										variants={fadeVariants}
										initial='initial'
										animate='animate'
										exit='exit'
										transition={prefersReducedMotion ? reducedMotionTransition : undefined}
										className='absolute inset-0 flex flex-col items-center justify-center gap-3 text-center'
									>
										<VideoOffIcon aria-hidden='true' className='size-6 text-(--gray-300)' />
										<p className='text-sm text-(--gray-300)'>The camera is off</p>
										<Button variant='circle' size='sm' className='px-3' onClick={startSession}>
											<VideoIcon aria-hidden='true' />
											Look in
										</Button>
									</motion.div>
								) : null}
							</AnimatePresence>
						</div>
						{live && overlay ? (
							<figcaption className='flex flex-wrap gap-x-5 gap-y-1 bg-(--gray-950) px-4 py-3 font-mono text-sm'>
								<span className='sr-only'>Live values: </span>
								{overlayGroups.map((group) => (
									<OverlayGroup key={group.device} device={group.device} values={group.values} />
								))}
							</figcaption>
						) : null}
					</figure>

					<div className='flex flex-wrap items-center gap-2'>
						{/* Off, the feed's own Look in starts the session. */}
						{session === "off" ? null : (
							<Button variant='outline' onClick={endSession}>
								<VideoOffIcon aria-hidden='true' />
								{huddle ? "End huddle" : "End session"}
							</Button>
						)}
						{camera.talk ? (
							<Button
								variant='outline'
								aria-pressed={talking}
								disabled={!live}
								onClick={() => {
									setTalking(!talking);
									setAnnouncement(talking ? "Muted" : "Talking into the room");
									report({ type: "talk", on: !talking });
								}}
							>
								{talking ? <MicIcon aria-hidden='true' /> : <MicOffIcon aria-hidden='true' />}
								{talking ? "Talking" : "Talk"}
							</Button>
						) : (
							<span className='text-xs text-muted-foreground'>No two-way audio{patient.hospital ? ` at ${patient.hospital}` : ""}</span>
						)}
						<div role='group' aria-label='Camera presets' className='flex flex-wrap gap-1'>
							{camera.presets.map((item) => (
								<Button
									key={item.id}
									variant={preset === item.id && live ? "secondary" : "ghost"}
									size='sm'
									aria-pressed={preset === item.id}
									disabled={!live}
									onClick={() => {
										setPreset(item.id);
										report({ type: "preset", presetId: item.id });
									}}
								>
									{item.label}
								</Button>
							))}
						</div>
						<Switch
							className='ml-auto'
							label='Overlay'
							checked={overlay}
							onCheckedChange={(on) => {
								setOverlay(on);
								report({ type: "overlay", on });
							}}
						/>
					</div>

					<div className='flex flex-col gap-3 border-t border-border-muted pt-4 @min-[40rem]:flex-row @min-[40rem]:items-start'>
						<Button className='shrink-0' disabled={huddle} onClick={startHuddle}>
							<UsersIcon aria-hidden='true' />
							{huddle ? "Huddle on" : "Start huddle"}
						</Button>
						<p className='flex items-start gap-2 text-sm text-muted-foreground'>
							<ShieldIcon aria-hidden='true' className='mt-0.5 size-4 shrink-0' />
							Starting a huddle opens the camera, the call and the AI Scribe together. Everyone on the call is told the
							scribe is on.
						</p>
					</div>
				</SectionCard>

				<div className='flex min-w-0 flex-col gap-6'>
					<SectionCard title='Who’s here' meta='Presence'>
						{camera.people.length ? (
							<ul className='flex flex-col gap-3'>
								{camera.people.map((person) => {
									const inCamera = person.you && live;
									return (
										<li key={person.name} className='flex items-center gap-3'>
											<Avatar size='md'>
												{person.src ? <AvatarImage src={person.src} alt='' /> : null}
												<AvatarFallback tone={person.tone}>{person.initials}</AvatarFallback>
											</Avatar>
											<div className='flex min-w-0 flex-1 flex-col'>
												<span className='truncate text-sm font-medium text-foreground'>
													{person.name}
													{person.you ? <span className='font-normal text-muted-foreground'> (you)</span> : null}
												</span>
												<span className='truncate text-xs text-muted-foreground'>
													{person.role} · {inCamera ? (huddle ? "In a huddle" : "In camera") : person.activity}
												</span>
											</div>
											<span
												aria-hidden='true'
												className={cn(
													"size-2.5 shrink-0 rounded-full",
													inCamera ? "bg-severity-critical" : person.presence === "online" ? "bg-success" : "bg-icon-muted",
												)}
											/>
											<span className='sr-only'>{inCamera ? "In camera" : presenceLabels[person.presence]}</span>
										</li>
									);
								})}
							</ul>
						) : (
							<NoData>No one's presence is shared for this room.</NoData>
						)}
					</SectionCard>

					<SectionCard title='Recent sessions'>
						{sessions.length ? (
							<ul className='flex flex-col divide-y divide-border-muted'>
								{sessions.map((item) => (
									<li key={item.id} className='flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0'>
										<div className='flex min-w-0 flex-col'>
											<span className='text-sm font-medium text-foreground'>
												{sessionKinds[item.kind]} · {item.by}
											</span>
											<span className='text-xs text-muted-foreground'>
												{formatSessionStart(item.startedAt, now)} · {item.minutes} min
											</span>
										</div>
										{item.scribeNote ? (
											<Badge variant='purple' size='xs' className='shrink-0'>
												<SparklesIcon aria-hidden='true' />
												{item.scribeNote === "signed" ? "Note signed" : "Note drafted"}
											</Badge>
										) : null}
									</li>
								))}
							</ul>
						) : (
							<NoData>No camera sessions in this room yet.</NoData>
						)}
					</SectionCard>
				</div>
			</div>
		</div>
	);
}

/**
 * The AI Scribe's state, on screen for as long as it's on (PD-073): waiting for consent under an all-party profile,
 * listening, or paused, with one action to pause and one to stop.
 */
function ScribeBar({
	state,
	onConsent,
	onPause,
	onResume,
	onStop,
}: {
	state: Exclude<ScribeState, "off">;
	onConsent: () => void;
	onPause: () => void;
	onResume: () => void;
	onStop: () => void;
}) {
	const text = {
		consent: "AI Scribe is waiting. Everyone on the call has to consent before it listens.",
		listening: "AI Scribe is listening and drafting a note from this huddle.",
		paused: "AI Scribe is paused. Nothing is captured until you resume.",
	}[state];

	return (
		<div className='flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-tone-accent-defined bg-tone-accent-subtle px-3 py-2'>
			<SparklesIcon aria-hidden='true' className='size-4 shrink-0 text-tone-accent' />
			<p className='min-w-0 flex-1 text-sm text-foreground'>{text}</p>
			<div className='flex gap-1'>
				{state === "consent" ? (
					<Button variant='outline' size='sm' onClick={onConsent}>
						Record consent
					</Button>
				) : state === "listening" ? (
					<Button variant='outline' size='sm' onClick={onPause}>
						<PauseIcon aria-hidden='true' />
						Pause
					</Button>
				) : (
					<Button variant='outline' size='sm' onClick={onResume}>
						<PlayIcon aria-hidden='true' />
						Resume
					</Button>
				)}
				<Button variant='ghost' size='sm' onClick={onStop}>
					<CircleStopIcon aria-hidden='true' />
					Stop
				</Button>
			</div>
		</div>
	);
}

export {
	CameraSection,
	type CameraAction,
	type CameraPerson,
	type CameraPreset,
	type CameraSectionProps,
	type CameraSession,
	type PatientCamera,
	type ScribeState,
};
