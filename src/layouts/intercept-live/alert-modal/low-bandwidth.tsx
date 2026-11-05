import * as React from "react";
import { WifiOffIcon } from "lucide-react";

import { useCurrentSecond } from "@/lib/hooks/use-current-second";
import { cn } from "@/lib/utils";

// Low-bandwidth mode (Demo Use Cases, Scenario 2, step 2; PRD Bedside camera CAM-014): when a hospital's connection
// drops mid-consult, the call falls back to audio only, the monitor's numbers come every few seconds instead of
// streaming, and the bedside sends still photos (a device's screen, a blood gas) as they're taken. Every part says so,
// so nobody takes held data for live (DESIGN.md "Low-bandwidth mode").

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

/** A still photo the bedside sent during the consult, e.g. the BiPAP's screen or a blood gas printout. */
type BedsidePhoto = {
  id: string;
  /** What it shows, e.g. "BiPAP screen". */
  title: string;
  /** What's drawn when there's no `src`: a device's screen or a blood gas printout. */
  kind: "device-screen" | "blood-gas";
  /** The readings in it, e.g. `{ label: "IPAP", value: "14" }`: drawn into the picture and listed under it. */
  values: { label: string; value: string }[];
  /** When it was taken, ISO 8601. */
  takenAt: string;
  /** Who took it, e.g. "Megan Foster, RN". */
  takenBy: string;
  /** The photo's URL. Without it, the photo is drawn from its values. */
  src?: string;
};

/** The consult's connection to the patient's hospital. */
type ConsultConnection = {
  /** `low-bandwidth`: audio only, vitals every `vitalsEvery` seconds, photos as they're taken. */
  mode: "video" | "low-bandwidth";
  /** When the mode started, ISO 8601. */
  since?: string;
  /** The hospital's short name, e.g. "Alliance", for "Alliance's connection dropped". */
  site?: string;
  /** How often the monitor's numbers arrive in low-bandwidth mode, in seconds. 30 by default. */
  vitalsEvery?: number;
  /** The photos the bedside sent, oldest first. */
  photos?: BedsidePhoto[];
};

const defaultVitalsEvery = 30;

/** "0:42", "12:05". */
function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

/* -------------------------------------------------------------------------- */
/* Banner and the monitor's line                                              */
/* -------------------------------------------------------------------------- */

/**
 * The mode, at the top of the Video consult panel: what dropped, and what the call and the data do now. A status, so a
 * screen reader hears it once as it appears.
 */
function LowBandwidthBanner({ connection }: { connection: ConsultConnection }) {
  const now = useCurrentSecond();
  const since = connection.since ? Date.parse(connection.since) : null;
  const elapsed =
    since !== null && now !== null
      ? Math.max(0, Math.floor((now - since) / 1000))
      : null;
  const every = connection.vitalsEvery ?? defaultVitalsEvery;
  return (
    <div
      role="status"
      className="flex gap-3 rounded-xl border border-warning-muted bg-warning-subtle p-3 text-sm text-foreground"
    >
      <WifiOffIcon
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-warning"
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="font-semibold">
          Low-bandwidth mode
          {elapsed !== null ? (
            <span className="font-normal text-muted-foreground">
              {" "}
              · <time className="tabular-nums">{formatElapsed(elapsed)}</time>
            </span>
          ) : null}
        </p>
        <p>
          {connection.site
            ? `${connection.site}'s connection dropped.`
            : "The connection dropped."}{" "}
          Audio only, vitals every {every} s, photos as they're taken.
        </p>
      </div>
    </div>
  );
}

/**
 * Over the monitor in low-bandwidth mode: the numbers are held, not streaming, and how old they are. Not a live
 * region: it changes every second.
 */
function MonitorHeldLine({
  every,
  updatedAt,
}: {
  every: number;
  updatedAt: number;
}) {
  const now = useCurrentSecond();
  const age =
    now !== null ? Math.max(0, Math.floor((now - updatedAt) / 1000)) : 0;
  return (
    <p className="flex items-center gap-1.5 text-sm text-foreground">
      <WifiOffIcon
        aria-hidden="true"
        className="size-4 shrink-0 text-warning"
      />
      <span>
        <span className="font-semibold">Low bandwidth:</span> vitals every{" "}
        {every} s · updated <time className="tabular-nums">{age} s</time> ago
      </span>
    </p>
  );
}

/**
 * The value as it was at the last update, refreshed every `every` seconds while `active`, and when that turns on.
 * Inactive, the value as it is now. `updatedAt` is when the held value was taken.
 */
function useHeldValue<T>(value: T, every: number, active: boolean) {
  const latest = React.useRef(value);
  latest.current = value;
  const [held, setHeld] = React.useState(() => ({
    value,
    updatedAt: Date.now(),
  }));
  React.useEffect(() => {
    if (!active) return;
    const take = () =>
      setHeld({ value: latest.current, updatedAt: Date.now() });
    take();
    const timer = window.setInterval(take, every * 1000);
    return () => window.clearInterval(timer);
  }, [active, every]);
  return active ? held : { value, updatedAt: held.updatedAt };
}

/* -------------------------------------------------------------------------- */
/* Photos                                                                     */
/* -------------------------------------------------------------------------- */

// The drawn photos' readings: a monitor's colors on the device screen, ink on the printout.
const screenInks = [
  "fill-(--green-300)",
  "fill-(--amber-300)",
  "fill-(--sky-300)",
  "fill-(--gray-100)",
];

/** A photo with no URL, drawn from its readings: a device's screen in its bezel, or a blood gas printout. */
function DrawnPhoto({ photo }: { photo: BedsidePhoto }) {
  const rows = photo.values.slice(0, 6);
  if (photo.kind === "blood-gas") {
    return (
      <svg viewBox="0 0 160 120" aria-hidden="true" className="block size-full">
        <rect width="160" height="120" className="fill-(--gray-700)" />
        <g transform="rotate(-3 80 60)">
          <rect
            x="30"
            y="6"
            width="100"
            height="112"
            rx="2"
            className="fill-(--gray-50)"
          />
          <text
            x="38"
            y="20"
            className="fill-(--gray-800) font-mono text-[8px] font-semibold"
          >
            BLOOD GAS
          </text>
          <rect
            x="38"
            y="24"
            width="84"
            height="0.8"
            className="fill-(--gray-400)"
          />
          {rows.map((row, index) => (
            <g
              key={row.label}
              className="fill-(--gray-800) font-mono text-[8px]"
            >
              <text x="38" y={36 + index * 13}>
                {row.label}
              </text>
              <text x="122" y={36 + index * 13} textAnchor="end">
                {row.value}
              </text>
            </g>
          ))}
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 160 120" aria-hidden="true" className="block size-full">
      <rect width="160" height="120" className="fill-(--gray-600)" />
      <rect
        x="8"
        y="8"
        width="144"
        height="104"
        rx="8"
        className="fill-(--graphite-800)"
      />
      <rect
        x="14"
        y="14"
        width="132"
        height="92"
        rx="3"
        className="fill-(--gray-950)"
      />
      {/* The pressure trace across the top, then the readings in two columns. */}
      <polyline
        points="18,44 30,44 34,26 52,26 56,44 70,44 74,26 92,26 96,44 110,44 114,26 132,26 136,44 142,44"
        className="fill-none stroke-(--amber-300)"
        strokeWidth="1.5"
      />
      {rows.map((row, index) => (
        <g
          key={row.label}
          className={cn("font-mono", screenInks[index % screenInks.length])}
        >
          <text
            x={index % 2 ? 84 : 20}
            y={64 + Math.floor(index / 2) * 16}
            className="text-[7px]"
          >
            {row.label}
          </text>
          <text
            x={index % 2 ? 140 : 76}
            y={64 + Math.floor(index / 2) * 16}
            textAnchor="end"
            className="text-[10px] font-semibold"
          >
            {row.value}
          </text>
        </g>
      ))}
    </svg>
  );
}

/**
 * A photo the bedside sent, as a 4:3 picture: the image, or drawn from its readings without one (a device screen or a
 * blood gas printout). Named for screen readers by its title. The Messages column shows it in the sender's message
 * (Nov 5, 2026, user's call: the photos moved there from under the call).
 */
function BedsidePhotoImage({ photo, className }: { photo: BedsidePhoto; className?: string }) {
  return (
    <div
      role="img"
      aria-label={`Photo: ${photo.title}`}
      className={cn(
        "aspect-[4/3] overflow-hidden rounded-lg border border-border bg-(--gray-900)",
        className,
      )}
    >
      {photo.src ? (
        <img src={photo.src} alt="" className="size-full object-cover" />
      ) : (
        <DrawnPhoto photo={photo} />
      )}
    </div>
  );
}

export {
  BedsidePhotoImage,
  defaultVitalsEvery,
  LowBandwidthBanner,
  MonitorHeldLine,
  useHeldValue,
  type BedsidePhoto,
  type ConsultConnection,
};
