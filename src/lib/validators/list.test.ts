import { describe, expect, test } from "bun:test";
import { createListSchema, editListSchema } from "@/lib/validators/list";

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

describe("editListSchema (D59)", () => {
  test("accepts the same body a create takes, minus publish", () => {
    expect(editListSchema.safeParse(input()).success).toBe(true);
  });

  // The edit body is a whole-list replacement, not a patch — a partial body has
  // no defined meaning here, so a rename-only PATCH is a client bug, not a
  // shortcut the schema should quietly accept.
  test("rejects a partial body", () => {
    expect(editListSchema.safeParse({ name: "New title" }).success).toBe(false);
    expect(editListSchema.safeParse({}).success).toBe(false);
  });

  test("rejects an edit that would empty the list", () => {
    expect(editListSchema.safeParse(input({ items: [] })).success).toBe(false);
  });

  // Invariant 8 has to survive an edit as well as a create: stripping every
  // score and note would otherwise reach a state creating a list cannot.
  test("rejects an edit that removes every score and comment", () => {
    expect(
      editListSchema.safeParse(input({ items: [{ ...validItem }], comment: undefined })).success,
    ).toBe(false);
  });

  test("has no publish field of its own", () => {
    const parsed = editListSchema.parse(input({ publish: true }));
    expect("publish" in parsed).toBe(false);
  });
});
