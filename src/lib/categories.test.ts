import { describe, expect, test } from "bun:test";
import { listCategoryEnum } from "@/db/enums";
import { FALLBACK_LIST_CATEGORY, isListCategory, LIST_CATEGORIES } from "@/lib/categories";
import { listCategorySchema } from "@/lib/validators/list";

/**
 * The category vocabulary is consumed in three places — the Postgres enum, the
 * Zod schema, and the builder's picker — from one array. These tests exist to
 * catch the day somebody "fixes" one of them by hand: a value present in Zod but
 * not in the enum is a 500 at insert time, and the reverse is a category nobody
 * can ever select.
 */
describe("LIST_CATEGORIES", () => {
  test("the Postgres enum carries exactly the same values, in the same order", () => {
    expect(listCategoryEnum.enumValues).toEqual([...LIST_CATEGORIES]);
  });

  test("the Zod schema accepts every category and nothing else", () => {
    for (const category of LIST_CATEGORIES) {
      expect(listCategorySchema.safeParse(category).success).toBe(true);
    }
    expect(listCategorySchema.safeParse("Not A Category").success).toBe(false);
    // 'All' is the prototype's UI-only "show everything" pseudo-category. It
    // must never be storable — a list filed under "All" would filter to itself.
    expect(listCategorySchema.safeParse("All").success).toBe(false);
  });

  test("the fallback is itself a real category", () => {
    expect(isListCategory(FALLBACK_LIST_CATEGORY)).toBe(true);
  });

  test("isListCategory rejects a near-miss rather than coercing it", () => {
    expect(isListCategory("Romance")).toBe(true);
    expect(isListCategory("romance")).toBe(false);
  });
});
