import type { NextConfig } from "next";
import { getEnv } from "./src/lib/env";

getEnv();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "cdn.myanimelist.net" },
    ],
  },
};

export default nextConfig;
