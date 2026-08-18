import { describe, expect, test } from "bun:test";
import { buildMarkdownExport } from "./markdown";

const URL = "https://tsugi.test/r/abc123";

describe("buildMarkdownExport", () => {
  test("numbers the items and bolds each score with its scale", () => {
    const output = buildMarkdownExport({
      name: "Comfort watches",
      caption: null,
      comment: null,
      url: URL,
      items: [
        { title: "Frieren", scoreRaw: 92, scoreFormat: "POINT_100", comment: null },
        { title: "Mushishi", scoreRaw: 9, scoreFormat: "POINT_10", comment: null },
      ],
    });

    expect(output).toContain("1. Frieren — **92/100**");
    expect(output).toContain("2. Mushishi — **9/10**");
  });

  test("POINT_3 exports its label, never a bare number (invariant 6)", () => {
    const output = buildMarkdownExport({
      name: "Picks",
      caption: null,
      comment: null,
      url: URL,
      items: [{ title: "Dungeon Meshi", scoreRaw: 3, scoreFormat: "POINT_3", comment: null }],
    });

    expect(output).toContain("**liked it**");
    expect(output).not.toContain("3/3");
  });

  test("an unscored item carries no score fragment at all", () => {
    const output = buildMarkdownExport({
      name: "Picks",
      caption: null,
      comment: null,
      url: URL,
      items: [{ title: "Monster", scoreRaw: null, scoreFormat: null, comment: null }],
    });

    // Scoped to the item line: the attribution footer legitimately contains an
    // em dash of its own.
    const itemLine = output.split("\n").find((line) => line.startsWith("1."));
    expect(itemLine).toBe("1. Monster");
  });

  test("per-item notes are indented under their title", () => {
    const output = buildMarkdownExport({
      name: "Picks",
      caption: null,
      comment: null,
      url: URL,
      items: [
        { title: "Monster", scoreRaw: null, scoreFormat: null, comment: "Watch it slowly." },
      ],
    });

    expect(output).toContain("   > Watch it slowly.");
  });

  test("the caption leads and the name follows it when both exist", () => {
    const output = buildMarkdownExport({
      name: "Comfort watches",
      caption: "Ten shows for a bad week",
      comment: null,
      url: URL,
      items: [],
    });

    expect(output.startsWith("## Ten shows for a bad week")).toBe(true);
    expect(output).toContain("*Comfort watches*");
  });

  test("the name is the heading when there is no caption, and is not repeated", () => {
    const output = buildMarkdownExport({
      name: "Comfort watches",
      caption: null,
      comment: null,
      url: URL,
      items: [],
    });

    expect(output.startsWith("## Comfort watches")).toBe(true);
    expect(output).not.toContain("*Comfort watches*");
  });

  test("always ends with an attribution link back to the list", () => {
    const output = buildMarkdownExport({
      name: "Picks",
      caption: null,
      comment: null,
      url: URL,
      items: [],
    });

    expect(output.trimEnd().endsWith(`— [via Tsugi](${URL})`)).toBe(true);
  });
});
