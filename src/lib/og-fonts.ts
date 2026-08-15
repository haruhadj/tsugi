import "server-only";

/**
 * Satori (next/og) needs raw font bytes — it doesn't see next/font, which
 * only wires up CSS @font-face for the browser-rendered site. Google's CSS2
 * endpoint serves woff2 to modern user agents, which Satori can't parse, so
 * this requests it with an old-Android UA string, the standard trick to get
 * back a plain .ttf url.
 */
async function fetchGoogleFont(family: string, weight: number): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    family,
  )}:wght@${weight}&display=swap`;

  const css = await fetch(cssUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Linux; U; Android 4.2.1; en-us; Nexus 7 Build/JOP40D) AppleWebKit/535.19",
    },
  }).then((res) => res.text());

  const match = css.match(/src: url\((.+?)\) format\('truetype'\)/);
  if (!match) {
    throw new Error(`Could not resolve font url for ${family} ${weight}`);
  }

  return fetch(match[1]!).then((res) => res.arrayBuffer());
}

export type OgFonts = {
  unbounded: ArrayBuffer;
  jetbrainsMono: ArrayBuffer;
};

export async function loadOgFonts(): Promise<OgFonts> {
  const [unbounded, jetbrainsMono] = await Promise.all([
    fetchGoogleFont("Unbounded", 800),
    fetchGoogleFont("JetBrains Mono", 500),
  ]);
  return { unbounded, jetbrainsMono };
}
