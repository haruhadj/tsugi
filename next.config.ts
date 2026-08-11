import type { NextConfig } from "next";
import { getEnv } from "./src/lib/env";

const env = getEnv();

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
const devOrigin = new URL(env.NEXT_PUBLIC_APP_URL).hostname;

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
