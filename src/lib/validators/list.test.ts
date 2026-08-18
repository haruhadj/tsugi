import { describe, expect, test } from "bun:test";
import { createListSchema, updateListSchema } from "@/lib/validators/list";

const validItem = { provider: "anilist", externalId: 154587, mediaType: "anime" } as const;

function input(overrides: Record<string, unknown> = {}) {
  return {
    name: "Ten romances that actually end",
    category: "Romance",
    items: [{ ...validItem, scoreRaw: 8, scoreFormat: "POINT_10" }],
    ...overrides,
  };
}

describe("createListSchema — category (D48)", () => {
  test("accepts a category from the vocabulary", () => {
    expect(createListSchema.safeParse(input()).success).toBe(true);
  });

  test("rejects a category outside the vocabulary", () => {
    expect(createListSchema.safeParse(input({ category: "Vibes" })).success).toBe(false);
  });

  test("rejects a list with no category at all — there is no uncategorised state", () => {
    const { category: _category, ...withoutCategory } = input();
    expect(createListSchema.safeParse(withoutCategory).success).toBe(false);
  });
});

describe("createListSchema — publish (D48)", () => {
  test("publish is optional, and its absence is a draft", () => {
    const parsed = createListSchema.safeParse(input());
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.publish).toBeUndefined();
  });

  test("accepts publish: true", () => {
    const parsed = createListSchema.safeParse(input({ publish: true }));
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.publish).toBe(true);
  });

  test("rejects a non-boolean publish", () => {
    expect(createListSchema.safeParse(input({ publish: "yes" })).success).toBe(false);
  });
});

describe("createListSchema — the pair invariant still holds (D47)", () => {
  // D47 fixed the *format* typed scores use; it did not loosen invariant 6.
  test("a score without its format is rejected", () => {
    expect(
      createListSchema.safeParse(input({ items: [{ ...validItem, scoreRaw: 8 }] })).success,
    ).toBe(false);
  });

  test("an imported score keeps a format that is not POINT_10", () => {
    const parsed = createListSchema.safeParse(
      input({ items: [{ ...validItem, scoreRaw: 87, scoreFormat: "POINT_100" }] }),
    );
    expect(parsed.success).toBe(true);
  });

  test("a list that says nothing at all is still rejected (invariant 8)", () => {
    expect(createListSchema.safeParse(input({ items: [validItem] })).success).toBe(false);
  });
});

describe("updateListSchema (D48)", () => {
  test("accepts a name alone, a category alone, or both", () => {
    expect(updateListSchema.safeParse({ name: "New title" }).success).toBe(true);
    expect(updateListSchema.safeParse({ category: "Horror" }).success).toBe(true);
    expect(updateListSchema.safeParse({ name: "New title", category: "Horror" }).success).toBe(true);
  });

  // An empty PATCH would reach Drizzle as an empty `set`, which throws at
  // runtime rather than no-oping — so it has to be refused here.
  test("rejects an empty edit", () => {
    expect(updateListSchema.safeParse({}).success).toBe(false);
  });
});
