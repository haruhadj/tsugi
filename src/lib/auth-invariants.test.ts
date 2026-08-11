import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dir, "..");

function listFilesRecursive(dir: string, predicate: (name: string) => boolean): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(full, predicate));
    } else if (predicate(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// PHASE-2.md criterion 7: the Hono catch-all is the only route.ts under
// src/app/api. A second one would reintroduce the routing-precedence
// question D6 exists to avoid, and would do it silently — Next does not
// error on two route.ts files resolving different paths.
test("criterion 7 — exactly one route.ts exists under src/app/api", () => {
  const routeFiles = listFilesRecursive(join(SRC, "app", "api"), (name) => name === "route.ts");
  expect(routeFiles).toEqual([join(SRC, "app", "api", "[[...route]]", "route.ts")]);
});

// PHASE-2.md criterion 9 / invariant 10: provider access and refresh tokens
// live in the account table and must never reach a client bundle. Scanning
// source text rather than the compiled bundle is deliberate — by the time a
// token string is in the bundle it has already been embedded in HTML or
// shipped to a browser at least once during testing, which is the leak this
// check exists to catch before that ever happens.
test("criterion 9 — no access or refresh token reference reaches app or components", () => {
  const candidates = [
    ...listFilesRecursive(join(SRC, "app"), (name) => /\.(ts|tsx)$/.test(name)),
    ...listFilesRecursive(join(SRC, "components"), (name) => /\.(ts|tsx)$/.test(name)),
  ];

  const offenders = candidates.filter((file) => {
    const text = readFileSync(file, "utf8");
    return /accessToken|refreshToken/.test(text);
  });

  expect(offenders).toEqual([]);
});
