/**
 * Relative timestamps for feed rows.
 *
 * Deliberately not `Intl.RelativeTimeFormat`: that renders "3 hours ago", which
 * at `text-[11px]` in a metadata line is three times the width of the fact it
 * carries. The rundown wants Reddit's `3h` — the shortest thing that is still
 * unambiguous.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * `value` is typed loosely because the same `FeedEntry` reaches this from two
 * directions: the server component hands over a real `Date`, while the pages
 * appended by infinite scroll arrive as JSON, where a date is a string. Both
 * are the same row, so both have to render the same way.
 *
 * A future timestamp reads as "now" rather than a negative age — clock skew
 * between the database and the browser is the only way to get one, and
 * "in 4s" would be a worse lie than a rounding error.
 */
export function formatRelativeTime(
  value: Date | string | null,
  now: number = Date.now(),
): string | null {
  if (value === null) return null;

  const then = value instanceof Date ? value.getTime() : Date.parse(value);
  if (Number.isNaN(then)) return null;

  const elapsed = now - then;
  if (elapsed < MINUTE) return "now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`;
  if (elapsed < MONTH) return `${Math.floor(elapsed / DAY)}d`;
  if (elapsed < YEAR) return `${Math.floor(elapsed / MONTH)}mo`;
  return `${Math.floor(elapsed / YEAR)}y`;
}

/** The machine-readable half of a `<time>` element, from either representation. */
export function toDateTimeAttribute(value: Date | string | null): string | undefined {
  if (value === null) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
