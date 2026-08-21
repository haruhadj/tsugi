import { type NextRequest, NextResponse } from "next/server";

/**
 * Per-session view dedup for /r/[slug] (the list detail route).
 *
 * The view counter is incremented in the page's after() hook, but only when
 * this middleware signals a first view via the `x-tsugi-first-view` request
 * header. We track already-seen slugs in a session cookie (no Max-Age, so it
 * clears when the browser session ends) — this dedups repeat visits by the
 * same visitor without requiring an account. It is per-device/per-session by
 * design: clearing cookies or switching devices counts as a fresh viewer.
 */

const COOKIE = "tsugi_viewed";
// Bound cookie growth; keep the most-recently-seen slugs only.
const MAX_SLUGS = 200;

export function middleware(request: NextRequest) {
  const slug = request.nextUrl.pathname.slice("/r/".length);

  const seen = (request.cookies.get(COOKIE)?.value ?? "")
    .split(",")
    .filter(Boolean);

  const firstView = !seen.includes(slug);

  const headers = new Headers(request.headers);
  if (firstView) headers.set("x-tsugi-first-view", "1");

  const response = NextResponse.next({ request: { headers } });

  if (firstView) {
    const next = [...seen, slug].slice(-MAX_SLUGS);
    response.cookies.set(COOKIE, next.join(","), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  return response;
}

// Only run on list detail pages, not their sub-routes (e.g. opengraph-image).
export const config = {
  matcher: "/r/:slug",
};
