import { describe, expect, test } from "bun:test";
import { isSynthesizedTrackerEmail, synthesizeTrackerEmail } from "./synthesize-tracker-email";

// PHASE-2.md criterion 4: `user.email` for tracker sign-ins matches
// `^(anilist|mal)-\d+@users\.tsugi\.invalid$` — a hyphen, not a colon.
describe("synthesizeTrackerEmail", () => {
  test("builds the AniList address with a hyphen separator", () => {
    expect(synthesizeTrackerEmail("anilist", "502992")).toBe(
      "anilist-502992@users.tsugi.invalid",
    );
  });

  test("builds the MAL address with a hyphen separator", () => {
    expect(synthesizeTrackerEmail("mal", "6885281")).toBe("mal-6885281@users.tsugi.invalid");
  });

  test("both providers' output satisfies criterion 4's pattern", () => {
    expect(isSynthesizedTrackerEmail(synthesizeTrackerEmail("anilist", "1"))).toBe(true);
    expect(isSynthesizedTrackerEmail(synthesizeTrackerEmail("mal", "1"))).toBe(true);
  });
});

describe("isSynthesizedTrackerEmail", () => {
  test("rejects a colon separator — the invalid RFC 5322 local part this replaced", () => {
    expect(isSynthesizedTrackerEmail("anilist:502992@users.tsugi.invalid")).toBe(false);
  });

  test("rejects a non-numeric id", () => {
    expect(isSynthesizedTrackerEmail("anilist-abc@users.tsugi.invalid")).toBe(false);
  });

  test("rejects a provider outside the two trackers", () => {
    expect(isSynthesizedTrackerEmail("google-1@users.tsugi.invalid")).toBe(false);
  });

  test("rejects a real-looking address, since one could collide otherwise", () => {
    expect(isSynthesizedTrackerEmail("anilist-1@gmail.com")).toBe(false);
  });
});
