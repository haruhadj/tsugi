import { describe, expect, test } from "bun:test";
import { aggregateGenres } from "@/server/services/lists";

/**
 * The genre cloud's ordering is load-bearing: it decides which three chips a
 * feed row shows, so an unstable sort would make the rundown reshuffle between
 * identical renders.
 */
describe("aggregateGenres", () => {
  test("counts how many items carry each genre", () => {
    expect(
      aggregateGenres([
        { genres: ["Fantasy", "Drama"] },
        { genres: ["Fantasy"] },
        { genres: ["Fantasy", "Adventure"] },
      ]),
    ).toEqual([
      { name: "Fantasy", count: 3 },
      { name: "Adventure", count: 1 },
      { name: "Drama", count: 1 },
    ]);
  });

  test("ties break alphabetically, so the order never wobbles between renders", () => {
    const result = aggregateGenres([{ genres: ["Zombie", "Action", "Mecha"] }]);
    expect(result.map((genre) => genre.name)).toEqual(["Action", "Mecha", "Zombie"]);
  });

  test("items with no genres contribute nothing", () => {
    expect(aggregateGenres([{ genres: [] }, { genres: [] }])).toEqual([]);
  });

  test("an empty list yields an empty cloud rather than throwing", () => {
    expect(aggregateGenres([])).toEqual([]);
  });

  test("whitespace-only genres are dropped, and padding is trimmed before counting", () => {
    expect(aggregateGenres([{ genres: ["  Fantasy  ", "   ", ""] }, { genres: ["Fantasy"] }])).toEqual(
      [{ name: "Fantasy", count: 2 }],
    );
  });
});
