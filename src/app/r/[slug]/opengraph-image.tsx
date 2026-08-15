import { ImageResponse } from "next/og";
import { formatScore, type ScoreFormat } from "@/lib/score";
import { loadOgFonts } from "@/lib/og-fonts";
import { getRecommendationBySlug } from "@/server/services/recommendations";

export const alt = "A recommendation shared on Tsugi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Eyecatch palette, hardcoded hex — the single sanctioned exception to the
// no-hardcoded-colors rule (context/ui-tokens.md § OG card). Satori cannot
// parse oklch(), so the CSS variable originals are kept here as comments.
const COLOR = {
  background: "#0B0A14", // oklch(0.1516 0.0213 288.2)
  card: "#14132B", // oklch(0.2024 0.047 283.2)
  border: "#2E2D44", // oklch(0.31 0.041 286)
  foreground: "#EDEAFF", // oklch(0.9456 0.0283 292.4)
  mutedForeground: "#8C87B0", // oklch(0.6426 0.061 290.2)
  primary: "#6C63FF", // oklch(0.5973 0.2237 279.8)
  bloom: "#4CE0D2", // oklch(0.8257 0.1252 186)
};

type Params = Promise<{ slug: string }>;

function Cover({ src, width, height }: { src: string | null; width: number; height: number }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 2,
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
  const rec = await getRecommendationBySlug(slug);
  const [{ unbounded, jetbrainsMono }] = await Promise.all([loadOgFonts()]);

  const items = rec?.items ?? [];
  const title = rec?.caption ?? items.map((item) => item.title).join(", ") ?? "Tsugi";
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
              color: COLOR.bloom,
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
              textTransform: "uppercase",
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
                      color: COLOR.primary,
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
                          backgroundColor: "rgba(11, 10, 20, 0.72)",
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
