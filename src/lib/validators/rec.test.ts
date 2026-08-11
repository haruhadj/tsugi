import { describe, expect, test } from "bun:test";
import { createRecSchema } from "./rec";

function anilistItem(overrides: Record<string, unknown> = {}) {
  return { provider: "anilist", externalId: 154587, mediaType: "anime", ...overrides };
}

describe("createRecSchema", () => {
  // Criterion 8.
  test("an item omitting provider returns an error, never a default", () => {
    const result = createRecSchema.safeParse({
      items: [{ externalId: 154587, mediaType: "anime", comment: "hi" }],
    });
    expect(result.success).toBe(false);
  });

  // Criterion 10.
  test("scoreRaw without scoreFormat is rejected", () => {
    const result = createRecSchema.safeParse({ items: [anilistItem({ scoreRaw: 5 })] });
    expect(result.success).toBe(false);
  });

  test("scoreFormat without scoreRaw is rejected", () => {
    const result = createRecSchema.safeParse({
      items: [anilistItem({ scoreFormat: "POINT_10" })],
    });
    expect(result.success).toBe(false);
  });

  // Criterion 11 — per-format, not a single 1–10 rule.
  test("87 with POINT_10 is out of range", () => {
    const result = createRecSchema.safeParse({
      items: [anilistItem({ scoreRaw: 87, scoreFormat: "POINT_10" })],
    });
    expect(result.success).toBe(false);
  });

  test("87 with POINT_100 is in range and is stored, not normalised", () => {
    const result = createRecSchema.safeParse({
      items: [anilistItem({ scoreRaw: 87, scoreFormat: "POINT_100" })],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0]?.scoreRaw).toBe(87);
    }
  });

  // Criterion 11a — D35: 0 means unrated at every format, never "rated zero".
  test.each(["POINT_100", "POINT_10_DECIMAL", "POINT_10", "POINT_5", "POINT_3"] as const)(
    "scoreRaw: 0 is rejected for %s",
    (scoreFormat) => {
      const result = createRecSchema.safeParse({
        items: [anilistItem({ scoreRaw: 0, scoreFormat })],
      });
      expect(result.success).toBe(false);
    },
  );

  // POINT_10_DECIMAL precision.
  test("7.5 is valid for POINT_10_DECIMAL", () => {
    const result = createRecSchema.safeParse({
      items: [anilistItem({ scoreRaw: 7.5, scoreFormat: "POINT_10_DECIMAL" })],
    });
    expect(result.success).toBe(true);
  });

  test("7.55 (two decimals) is rejected for POINT_10_DECIMAL", () => {
    const result = createRecSchema.safeParse({
      items: [anilistItem({ scoreRaw: 7.55, scoreFormat: "POINT_10_DECIMAL" })],
    });
    expect(result.success).toBe(false);
  });

  test("7.5 (one decimal) is rejected for POINT_10, which is integer-only", () => {
    const result = createRecSchema.safeParse({
      items: [anilistItem({ scoreRaw: 7.5, scoreFormat: "POINT_10" })],
    });
    expect(result.success).toBe(false);
  });

  // Criterion 13 / invariant 8.
  test("no score and no comment anywhere is rejected", () => {
    const result = createRecSchema.safeParse({ items: [anilistItem()] });
    expect(result.success).toBe(false);
  });

  test("only a group comment is enough", () => {
    const result = createRecSchema.safeParse({ comment: "great picks", items: [anilistItem()] });
    expect(result.success).toBe(true);
  });

  test("only an item comment is enough", () => {
    const result = createRecSchema.safeParse({
      items: [anilistItem({ comment: "loved this" })],
    });
    expect(result.success).toBe(true);
  });

  test("only an item score is enough", () => {
    const result = createRecSchema.safeParse({
      items: [anilistItem({ scoreRaw: 9, scoreFormat: "POINT_10" })],
    });
    expect(result.success).toBe(true);
  });

  // Criterion 14 / 14a — D36's cap.
  test("an empty items array is rejected", () => {
    const result = createRecSchema.safeParse({ comment: "hi", items: [] });
    expect(result.success).toBe(false);
  });

  test("10 items succeeds, 11 is rejected", () => {
    const item = (i: number) => anilistItem({ externalId: i, comment: "x" });
    const ten = createRecSchema.safeParse({ items: Array.from({ length: 10 }, (_, i) => item(i + 1)) });
    const eleven = createRecSchema.safeParse({
      items: Array.from({ length: 11 }, (_, i) => item(i + 1)),
    });
    expect(ten.success).toBe(true);
    expect(eleven.success).toBe(false);
  });

  // Criterion 15 — invariant 7, both levels.
  test("a 281-character item comment is rejected", () => {
    const result = createRecSchema.safeParse({
      items: [anilistItem({ comment: "a".repeat(281) })],
    });
    expect(result.success).toBe(false);
  });

  test("a 281-character group comment is rejected", () => {
    const result = createRecSchema.safeParse({
      comment: "a".repeat(281),
      items: [anilistItem({ scoreRaw: 5, scoreFormat: "POINT_10" })],
    });
    expect(result.success).toBe(false);
  });

  test("a 121-character caption is rejected", () => {
    const result = createRecSchema.safeParse({
      caption: "a".repeat(121),
      comment: "hi",
      items: [anilistItem()],
    });
    expect(result.success).toBe(false);
  });

  test("a 280-character comment (the boundary) is accepted", () => {
    const result = createRecSchema.safeParse({
      items: [anilistItem({ comment: "a".repeat(280) })],
    });
    expect(result.success).toBe(true);
  });

  // Criterion 9 — a client-supplied title has nowhere to go: `itemSchema`
  // has no `title` field at all, so Zod strips it before anything downstream
  // could read it. This is a type-level guarantee, not just a runtime one —
  // `CreateRecItem` has no `title` key for `createRecommendation` to
  // accidentally trust.
  test("an unrecognised field such as title is silently stripped, not an error", () => {
    const result = createRecSchema.safeParse({
      items: [anilistItem({ comment: "hi", title: "totally made up" })],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0]).not.toHaveProperty("title");
    }
  });
});
