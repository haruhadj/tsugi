import { ImageResponse } from "next/og";
import { formatScore, type ScoreFormat } from "@/lib/score";
import { loadOgFonts } from "@/lib/og-fonts";
import { getListBySlug } from "@/server/services/lists";

export const alt = "A list shared on Tsugi";
const WIDTH = 1200;
const HEIGHT = 630;
export const size = { width: WIDTH, height: HEIGHT };
export const contentType = "image/png";

// Hardcoded hex — the single sanctioned exception to the no-hardcoded-colors rule
// (context/ui-tokens.md § OG card), because Satori cannot parse oklch(). Every value
// here is the exact sRGB equivalent of its token in globals.css, kept as a comment so
// the two can be checked against each other. If the palette changes there, change it
// here too: nothing will fail to build, the card will just stop matching the site.
const COLOR = {
  background: "#101434", // --background, oklch(0.209 0.062 274.305)
  card: "#181C40", // --card, oklch(0.245 0.068 275.454)
  border: "#262B54", // --border, oklch(0.307 0.073 275.948)
  foreground: "#FAFAFA", // --foreground, oklch(0.985 0 0)
  mutedForeground: "#9CA0C4", // --muted-foreground, oklch(0.715 0.052 280.003)
  primary: "#9A66E0", // --primary, oklch(0.62 0.18 300.959)
  highlight: "#D0B070", // --highlight, oklch(0.771 0.09 83.857)
};

type Params = Promise<{ slug: string }>;

function Cover({ src, width, height }: { src: string | null; width: number; height: number }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexShrink: 0,
        backgroundColor: COLOR.card,
        border: `1px solid ${COLOR.border}`,
      }}
    >
      {src && (
        // Satori needs a raw <img>, not next/image
        <img src={src} width={width} height={height} style={{ objectFit: "cover" }} alt="" />
      )}
    </div>
  );
}

export default async function Image({ params }: { params: Params }) {
  const { slug } = await params;
  const rec = await getListBySlug(slug, null);
  const [{ unbounded, jetbrainsMono }] = await Promise.all([loadOgFonts()]);

  const items = rec?.items ?? [];
  // D48 — `name` is the list's title now, so the card leads with it. It used to
  // hold the category, which is why the caption was the headline here before.
  const title = rec?.name ?? items.map((item) => item.title).join(", ") ?? "Tsugi";
  const visible = items.slice(0, 4);
  const overflowCount = items.length > 4 ? items.length - 4 : 0;
  const comment = rec?.comment
    ? rec.comment.length > 200
      ? `${rec.comment.slice(0, 200).trimEnd()}…`
      : rec.comment
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: COLOR.background,
          padding: 64,
          fontFamily: "Inter Tight, sans-serif",
        }}
      >
        {/*
          The brand rule across the top, matching /r/[slug]'s card and the canvas
          exporter. Absolute so it sits flush with the edge rather than inside the
          64px padding the rest of the card uses.
        */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: WIDTH,
            height: 8,
            display: "flex",
            backgroundImage: `linear-gradient(90deg, ${COLOR.primary} 0%, ${COLOR.highlight} 100%)`,
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Unbounded",
              fontSize: 12,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: COLOR.primary,
            }}
          >
            Tsugi
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Unbounded",
              fontSize: 56,
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: -1,
              color: COLOR.foreground,
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 24,
            alignItems: items.length === 1 ? "flex-start" : "flex-end",
          }}
        >
          {items.length === 1 ? (
            <>
              <Cover src={items[0]!.coverImage} width={220} height={320} />
              <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 800 }}>
                <div
                  style={{
                    display: "flex",
                    fontSize: 32,
                    color: COLOR.foreground,
                    overflow: "hidden",
                  }}
                >
                  {items[0]!.title}
                </div>
                {items[0]!.scoreRaw !== null && items[0]!.scoreFormat !== null && (
                  <div
                    style={{
                      display: "flex",
                      fontFamily: "JetBrains Mono",
                      fontSize: 24,
                      letterSpacing: 2,
                      color: COLOR.highlight,
                    }}
                  >
                    {formatScore(items[0]!.scoreRaw, items[0]!.scoreFormat as ScoreFormat)}
                  </div>
                )}
                {comment && (
                  <div
                    style={{
                      display: "flex",
                      fontSize: 20,
                      lineHeight: 1.4,
                      color: COLOR.mutedForeground,
                      overflow: "hidden",
                    }}
                  >
                    {comment}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%" }}>
              <div style={{ display: "flex", gap: 16 }}>
                {visible.map((item, index) => (
                  <div key={item.position} style={{ display: "flex", position: "relative" }}>
                    <Cover src={item.coverImage} width={180} height={260} />
                    {index === visible.length - 1 && overflowCount > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "rgba(9, 9, 11, 0.72)", // COLOR.background at 72%
                          fontFamily: "JetBrains Mono",
                          fontSize: 28,
                          color: COLOR.foreground,
                        }}
                      >
                        +{overflowCount} more
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {comment && (
                <div
                  style={{
                    display: "flex",
                    fontSize: 20,
                    lineHeight: 1.4,
                    color: COLOR.mutedForeground,
                    overflow: "hidden",
                  }}
                >
                  {comment}
                </div>
              )}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            fontFamily: "JetBrains Mono",
            fontSize: 18,
            color: COLOR.mutedForeground,
          }}
        >
          tsugi
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Unbounded", data: unbounded, weight: 800, style: "normal" },
        { name: "JetBrains Mono", data: jetbrainsMono, weight: 500, style: "normal" },
      ],
    },
  );
}
