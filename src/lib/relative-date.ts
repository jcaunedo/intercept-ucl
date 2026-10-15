/**
 * Shared timestamp formatter for date columns.
 *
 * One ladder, used by every date column so two columns never format the
 * same kind of value two different ways:
 *
 * | Age            | Rendered as        |
 * |----------------|--------------------|
 * | < 1 minute     | `Just now`         |
 * | < 1 hour       | `14 min ago`       |
 * | < 24 hours     | `5 hr ago`         |
 * | < 48 hours     | `Yesterday`        |
 * | < 7 days       | `4 days ago`       |
 * | >= 7 days      | `Mar 17, 2026`     |
 *
 * Units are abbreviated ("min"/"hr", not "minutes"/"hours") because the
 * column is narrow. A useful side
 * effect: abbreviations don't inflect and the days tier starts at 2 (day 1
 * is "Yesterday"), so no tier ever has to special-case a singular.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Exactly 7 days. At 6 days the value still reads "6 days ago"; at 7 it
 * switches to a full date. There is deliberately no coarse middle step
 * ("1 week ago", "last month") — past a week a full date is both more
 * precise and no harder to read.
 */
const RELATIVE_CUTOVER = 7 * DAY;

/** `Mar 17, 2026` — the year is always included, even in the current year. */
const absoluteDateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

/** `Mar 17, 2026, 4:05 PM` — the exact value behind every rendered label. */
const exactTimestampFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

type RelativeDate = {
  /** What the cell renders. */
  label: string;
  /**
   * The full timestamp, for the cell's `title` attribute — so a relative
   * value is resolvable on hover, and a truncated absolute one is still
   * recoverable.
   */
  title: string;
};

/**
 * Formats a timestamp for a date column.
 *
 * `now` is a parameter rather than a closed-over constant so callers can
 * format against a fixed clock in tests and stories. Left to its default it
 * reads the clock on every call, which is what keeps a long-open page's
 * relative values from going stale — this must be called during render, not
 * memoized against the fetch.
 */
function formatRelativeDate(
  value: string | number | Date,
  now: number = Date.now(),
): RelativeDate {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return { label: "—", title: "" };

  const title = exactTimestampFormat.format(time);
  // Negative when the timestamp is ahead of the client's clock — a few
  // seconds of skew on a just-created invite is normal, and rendering that
  // as anything other than "Just now" reads as a bug.
  const elapsed = now - time;

  if (elapsed < MINUTE) return { label: "Just now", title };
  if (elapsed < HOUR)
    return { label: `${Math.floor(elapsed / MINUTE)} min ago`, title };
  if (elapsed < DAY)
    return { label: `${Math.floor(elapsed / HOUR)} hr ago`, title };
  if (elapsed < 2 * DAY) return { label: "Yesterday", title };
  if (elapsed < RELATIVE_CUTOVER)
    return { label: `${Math.floor(elapsed / DAY)} days ago`, title };

  return { label: absoluteDateFormat.format(time), title };
}

export { formatRelativeDate, RELATIVE_CUTOVER };
export type { RelativeDate };
