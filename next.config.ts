import type { NextConfig } from "next";
import { DEFAULT_APP_URL } from "./src/lib/env";

// Read the one variable directly rather than through `getEnv()` (D53).
// `allowedDevOrigins` below is development-only — Next ignores it in a production
// build — but `getEnv()` validates the *whole* server env, so deriving a single
// hostname through it made every build in every environment require all seven
// secrets. A preview deploy without them died here, at config load, before one
// page was compiled. `env.ts` still owns shape validation for every surface that
// actually runs server code; this file only needs a hostname.
const appUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;

// A malformed URL must not fail a build over a dev-only setting: env.ts reports
// it properly, with the variable's name, the moment any server module runs.
function hostnameOf(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return new URL(DEFAULT_APP_URL).hostname;
  }
}

// Next 16 blocks cross-origin requests to dev-only assets (HMR, chunks) from any
// host other than the one the server was started on — which is localhost, even
// when bound to 0.0.0.0. Browsing the dev server by LAN IP therefore loads the
// HTML fine and then silently fails to load every script and stylesheet, so the
// page renders unstyled and dead rather than erroring. `curl` does not reproduce
// it: with no Origin header the request is not cross-origin.
//
// Derived from NEXT_PUBLIC_APP_URL rather than hardcoded, so the dev host stays
// in step with the OAuth redirect URI registered with AniList and MAL — those
// two have to agree, and this is the file that would otherwise drift.
// Ignored outside development.
const devOrigin = hostnameOf(appUrl);

const nextConfig: NextConfig = {
  allowedDevOrigins: [devOrigin],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "cdn.myanimelist.net" },
    ],
  },
};

export default nextConfig;
