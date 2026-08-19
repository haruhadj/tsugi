import { describe, expect, test } from "bun:test";
import { buildFeedHref, normalizeFeedQuery, normalizeMediaType } from "@/lib/feed-params";

describe("normalizeFeedQuery", () => {
  test("floors at two characters, so a single letter does not filter", () => {
    expect(normalizeFeedQuery("a")).toBeUndefined();
    expect(normalizeFeedQuery(" a ")).toBeUndefined();
    expect(normalizeFeedQuery("ab")).toBe("ab");
  });

  test("trims, and treats whitespace and absence alike", () => {
    expect(normalizeFeedQuery("  frieren  ")).toBe("frieren");
    expect(normalizeFeedQuery("   ")).toBeUndefined();
    expect(normalizeFeedQuery(undefined)).toBeUndefined();
  });

  test("caps the length rather than passing an unbounded pattern to ILIKE", () => {
    expect(normalizeFeedQuery("x".repeat(500))).toHaveLength(100);
  });
});

describe("normalizeMediaType", () => {
  test("an unknown value falls back to unfiltered, never to an empty page", () => {
    expect(normalizeMediaType("anime")).toBe("anime");
    expect(normalizeMediaType("manga")).toBe("manga");
    expect(normalizeMediaType("light-novel")).toBeUndefined();
    expect(normalizeMediaType(undefined)).toBeUndefined();
  });
});

describe("buildFeedHref", () => {
  const current = {
    sort: "new",
    page: 3,
    category: "Fantasy",
    genre: "Action",
    mediaType: "anime" as const,
    q: "frieren",
  };

  test("keeps every filter whose key is absent from the override", () => {
    const href = buildFeedHref(current, { sort: "top" });
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("sort")).toBe("top");
    expect(params.get("category")).toBe("Fantasy");
    expect(params.get("genre")).toBe("Action");
    expect(params.get("mediaType")).toBe("anime");
    expect(params.get("q")).toBe("frieren");
  });

  test("an explicit undefined clears that one filter — this is the remove-chip link", () => {
    const params = new URLSearchParams(
      buildFeedHref(current, { genre: undefined }).split("?")[1],
    );
    expect(params.has("genre")).toBe(false);
    expect(params.get("category")).toBe("Fantasy");
  });

  test("changing a filter returns to page 1, since page 3 of the old results means nothing", () => {
    expect(buildFeedHref(current, { category: "Horror" })).not.toContain("page=");
    expect(buildFeedHref(current, { page: 4 })).toContain("page=4");
  });
});
