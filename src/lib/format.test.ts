import { describe, expect, test } from "bun:test";
import { formatRelativeTime, toDateTimeAttribute } from "@/lib/format";

const NOW = Date.parse("2026-08-23T12:00:00.000Z");
const HOUR_MS = 60 * 60_000;
const ago = (ms: number) => new Date(NOW - ms);

describe("formatRelativeTime", () => {
  test("anything under a minute is 'now'", () => {
    expect(formatRelativeTime(ago(0), NOW)).toBe("now");
    expect(formatRelativeTime(ago(59_000), NOW)).toBe("now");
  });

  test("rounds down through each unit", () => {
    expect(formatRelativeTime(ago(90_000), NOW)).toBe("1m");
    expect(formatRelativeTime(ago(3 * 60 * 60_000), NOW)).toBe("3h");
    expect(formatRelativeTime(ago(2 * 24 * 60 * 60_000), NOW)).toBe("2d");
    expect(formatRelativeTime(ago(5 * 30 * 24 * 60 * 60_000), NOW)).toBe("5mo");
    expect(formatRelativeTime(ago(2 * 365 * 24 * 60 * 60_000), NOW)).toBe("2y");
  });

  // The rows appended by infinite scroll come back as JSON, where a Date is a
  // string. Both representations have to render identically or a row would
  // change its timestamp just by being on page 2.
  test("accepts an ISO string as well as a Date", () => {
    const date = ago(3 * 60 * 60_000);
    expect(formatRelativeTime(date.toISOString(), NOW)).toBe(
      formatRelativeTime(date, NOW),
    );
  });

  test("a future timestamp reads as 'now' rather than going negative", () => {
    expect(formatRelativeTime(new Date(NOW + 60_000), NOW)).toBe("now");
  });

  test("null and unparseable input render nothing at all", () => {
    expect(formatRelativeTime(null, NOW)).toBeNull();
    expect(formatRelativeTime("not a date", NOW)).toBeNull();
  });
});

describe("toDateTimeAttribute", () => {
  test("normalises both representations to the same ISO string", () => {
    const date = ago(HOUR_MS);
    expect(toDateTimeAttribute(date)).toBe(date.toISOString());
    expect(toDateTimeAttribute(date.toISOString())).toBe(date.toISOString());
  });

  test("is undefined for null or unparseable input, so the attribute is omitted", () => {
    expect(toDateTimeAttribute(null)).toBeUndefined();
    expect(toDateTimeAttribute("not a date")).toBeUndefined();
  });
});
