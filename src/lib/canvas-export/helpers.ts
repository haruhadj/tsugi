/**
 * Draws the shareable card to a canvas so the reader can save it as a PNG. Unlike
 * /r/[slug]/opengraph-image.tsx — which is pinned at 1200×630 because that's the OG
 * image spec crawlers expect — this one is a real download with no such constraint,
 * so its height grows with the cover count instead of cropping or shrinking covers
 * to fit a fixed box. Keep the two visually in step where they overlap — the palette
 * below is the same hex block, for the same reason (Satori and canvas both need
 * literal colours, not oklch).
 */
export const COLOR = {
  background: "#101434",
  card: "#181C40",
  border: "#262B54",
  foreground: "#FAFAFA",
  mutedForeground: "#9CA0C4",
  primary: "#9A66E0",
  highlight: "#D0B070",
};

export const MIN_WIDTH = 700;
export const MAX_WIDTH = 1200;
export const PADDING = 48;
export const MAX_COVERS = 10;
export const COVER_WIDTH = 168;
export const COVER_HEIGHT = 250;
export const COVER_OVERLAP = 26;
export const COVER_ROW_GAP = 24;
export const MAX_COVERS_PER_ROW = 5;
export const MARK_SIZE = 28;

export type CardItem = { title: string; coverImage: string | null };

export type SocialCardInput = {
  title: string;
  subtitle: string | null;
  comment: string | null;
  itemCount: number;
  items: CardItem[];
  username: string | null;
};

/**
 * Cover art is remote (s4.anilist.co, cdn.myanimelist.net). Without crossOrigin the
 * draw succeeds but taints the canvas, and every later toBlob/toDataURL throws a
 * SecurityError — so a failure to load anonymously has to degrade to "no cover"
 * rather than being drawn anyway.
 */
export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

export function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

/** Greedy wrap. Returns the lines actually drawn, capped at `maxLines` with an ellipsis. */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }

  if (lines.length < maxLines && current) lines.push(current);

  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (last !== undefined) {
      const consumed = lines.join(" ");
      if (consumed.length < text.length) {
        let truncated = last;
        while (
          truncated.length > 0 &&
          ctx.measureText(`${truncated}…`).width > maxWidth
        ) {
          truncated = truncated.slice(0, -1);
        }
        lines[maxLines - 1] = `${truncated}…`;
      }
    }
  }

  return lines;
}

/** Rows sized to fit MAX_COVERS_PER_ROW per line, filling as evenly as two rows allow. */
export function coverLayout(count: number): { perRow: number; rows: number } {
  if (count <= MAX_COVERS_PER_ROW) return { perRow: count, rows: count > 0 ? 1 : 0 };
  const rows = Math.ceil(count / MAX_COVERS_PER_ROW);
  return { perRow: Math.ceil(count / rows), rows };
}
