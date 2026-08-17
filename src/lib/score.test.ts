import { describe, expect, test } from "bun:test";
import {
  formatScore,
  scoreFraction,
  scoreOptions,
  scoreTier,
  tierBandFor,
  type ScoreFormat,
} from "./score";

const FORMATS: ScoreFormat[] = [
  "POINT_100",
  "POINT_10_DECIMAL",
  "POINT_10",
  "POINT_5",
  "POINT_3",
];

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

describe("scoreFraction", () => {
  test("normalises against each format's own range, not a shared 0-100", () => {
    // The bug this prevents: 8 is near the top of POINT_10 and near the bottom
    // of POINT_100, so a bare number cannot be compared across formats.
    expect(scoreFraction(8, "POINT_10")).toBeCloseTo(7 / 9);
    expect(scoreFraction(8, "POINT_100")).toBeCloseTo(7 / 99);
  });

  test("the scale floor is 0, not one-tenth — 1/10 is the bottom", () => {
    expect(scoreFraction(1, "POINT_10")).toBe(0);
    expect(scoreFraction(1, "POINT_5")).toBe(0);
    expect(scoreFraction(1, "POINT_100")).toBe(0);
  });

  test("the scale ceiling is 1 in every format", () => {
    expect(scoreFraction(10, "POINT_10")).toBe(1);
    expect(scoreFraction(5, "POINT_5")).toBe(1);
    expect(scoreFraction(3, "POINT_3")).toBe(1);
    expect(scoreFraction(100, "POINT_100")).toBe(1);
  });

  test("clamps out-of-range input rather than returning a fraction outside 0-1", () => {
    expect(scoreFraction(200, "POINT_100")).toBe(1);
    expect(scoreFraction(-5, "POINT_10")).toBe(0);
  });
});

describe("scoreTier", () => {
  test("equivalent scores in different formats land in the same tier", () => {
    expect(scoreTier(90, "POINT_100")).toBe(scoreTier(9.1, "POINT_10_DECIMAL"));
    expect(scoreTier(100, "POINT_100")).toBe("excellent");
    expect(scoreTier(5, "POINT_5")).toBe("excellent");
  });

  test("the bottom of every scale is `poor`", () => {
    expect(scoreTier(1, "POINT_10")).toBe("poor");
    expect(scoreTier(1, "POINT_100")).toBe("poor");
    expect(scoreTier(1, "POINT_3")).toBe("poor");
  });
});

describe("tierBandFor", () => {
  test("assigns the tightest matching band, best-first", () => {
    expect(tierBandFor(100, "POINT_100").label).toBe("S");
    expect(tierBandFor(85, "POINT_100").label).toBe("A");
    expect(tierBandFor(70, "POINT_100").label).toBe("B");
    expect(tierBandFor(50, "POINT_100").label).toBe("C");
    expect(tierBandFor(10, "POINT_100").label).toBe("D");
  });

  test("every valid score in every format lands in some band", () => {
    for (const format of FORMATS) {
      for (const option of scoreOptions(format)) {
        expect(tierBandFor(option, format).label).toBeTruthy();
      }
    }
  });
});
