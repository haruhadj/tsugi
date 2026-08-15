import { describe, expect, test } from "bun:test";
import { formatScore, scoreOptions } from "./score";

describe("formatScore", () => {
  test("POINT_3 renders smiley labels, never a fraction", () => {
    expect(formatScore(1, "POINT_3")).toBe("disliked it");
    expect(formatScore(2, "POINT_3")).toBe("it was fine");
    expect(formatScore(3, "POINT_3")).toBe("liked it");
  });

  test("every other format names its scale", () => {
    expect(formatScore(87, "POINT_100")).toBe("87/100");
    expect(formatScore(8.7, "POINT_10_DECIMAL")).toBe("8.7/10");
    expect(formatScore(7, "POINT_10")).toBe("7/10");
    expect(formatScore(4, "POINT_5")).toBe("4/5");
  });

  test("POINT_10_DECIMAL keeps a trailing zero decimal", () => {
    expect(formatScore(8, "POINT_10_DECIMAL")).toBe("8.0/10");
  });
});

describe("scoreOptions", () => {
  test("has no zero position (D35)", () => {
    for (const format of ["POINT_100", "POINT_10_DECIMAL", "POINT_10", "POINT_5", "POINT_3"] as const) {
      expect(scoreOptions(format)).not.toContain(0);
    }
  });

  test("POINT_5 yields exactly 1..5", () => {
    expect(scoreOptions("POINT_5")).toEqual([1, 2, 3, 4, 5]);
  });

  test("POINT_10_DECIMAL yields 1.0..10.0 in 0.1 steps, 91 values", () => {
    const options = scoreOptions("POINT_10_DECIMAL");
    expect(options.length).toBe(91);
    expect(options[0]).toBe(1);
    expect(options.at(-1)).toBe(10);
  });
});
