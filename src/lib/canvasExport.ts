/**
 * Draws the shareable card to a canvas so the reader can save it as a PNG. Unlike
 * /r/[slug]/opengraph-image.tsx — which is pinned at 1200×630 because that's the OG
 * image spec crawlers expect — this one is a real download with no such constraint,
 * so its height grows with the cover count instead of cropping or shrinking covers
 * to fit a fixed box. Keep the two visually in step where they overlap — the palette
 * below is the same hex block, for the same reason (Satori and canvas both need
 * literal colours, not oklch).
 */
const COLOR = {
  background: "#101434",
  card: "#181C40",
  border: "#262B54",
  foreground: "#FAFAFA",
  mutedForeground: "#9CA0C4",
  primary: "#542C84",
  highlight: "#D0B070",
};

const MIN_WIDTH = 700;
const MAX_WIDTH = 1200;
const PADDING = 48;
const MAX_COVERS = 10;
const COVER_WIDTH = 168;
const COVER_HEIGHT = 250;
const COVER_OVERLAP = 26;
const COVER_ROW_GAP = 24;
const MAX_COVERS_PER_ROW = 5;
const MARK_SIZE = 28;

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
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function roundedRect(
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
function wrapText(
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
function coverLayout(count: number): { perRow: number; rows: number } {
  if (count <= MAX_COVERS_PER_ROW) return { perRow: count, rows: count > 0 ? 1 : 0 };
  const rows = Math.ceil(count / MAX_COVERS_PER_ROW);
  return { perRow: Math.ceil(count / rows), rows };
}

async function drawCard(input: SocialCardInput): Promise<HTMLCanvasElement> {
  const covers = input.items.slice(0, MAX_COVERS);
  const { perRow, rows } = coverLayout(covers.length);

  // A throwaway context purely to measure wrapped text before the real canvas — whose
  // height depends on that wrap — is sized.
  const measureCtx = document.createElement("canvas").getContext("2d");
  if (!measureCtx) throw new Error("Canvas 2D context unavailable");

  // Text wraps against the widest the card is allowed to get, then the card shrinks
  // to whatever the wrapped lines and the cover row actually need — so a short title
  // with few covers doesn't drag along the full 1200px canvas as dead space.
  const wrapBound = MAX_WIDTH - PADDING * 2;

  measureCtx.font = "800 58px system-ui, sans-serif";
  const measuredTitleLines = wrapText(measureCtx, input.title, wrapBound, 2);
  const titleWidth = Math.max(0, ...measuredTitleLines.map((l) => measureCtx.measureText(l).width));
  let measuredCursorY = PADDING + 110 + measuredTitleLines.length * 68;

  let subtitleWidth = 0;
  if (input.subtitle) {
    measureCtx.font = "400 26px system-ui, sans-serif";
    const [line] = wrapText(measureCtx, input.subtitle, wrapBound, 1);
    subtitleWidth = line ? measureCtx.measureText(line).width : 0;
    measuredCursorY += 44;
  }

  let commentWidth = 0;
  if (input.comment) {
    measureCtx.font = "400 22px system-ui, sans-serif";
    const commentLines = wrapText(measureCtx, input.comment, wrapBound, 2);
    commentWidth = Math.max(0, ...commentLines.map((l) => measureCtx.measureText(l).width));
    measuredCursorY += 16 + commentLines.length * 32;
  }

  const coversRowWidth =
    perRow > 0 ? COVER_WIDTH + (perRow - 1) * (COVER_WIDTH - COVER_OVERLAP) : 0;

  // The item count and byline sit beside the TSUGI wordmark up top rather than beside
  // the covers, so the cover row can claim the full card width for itself.
  measureCtx.font = "700 20px ui-monospace, monospace";
  const wordmarkWidth = MARK_SIZE + 10 + measureCtx.measureText("TSUGI").width;
  measureCtx.font = "500 13px ui-monospace, monospace";
  const metaText = [
    input.username ? `u/${input.username}` : null,
    `${input.itemCount} ${input.itemCount === 1 ? "title" : "titles"}`,
  ]
    .filter(Boolean)
    .join("  ·  ");
  const metaWidth = measureCtx.measureText(metaText).width;
  const topRowWidth = wordmarkWidth + 24 + metaWidth;

  const contentWidth = Math.max(titleWidth, subtitleWidth, commentWidth, coversRowWidth, topRowWidth);
  const WIDTH = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, contentWidth + PADDING * 2));

  const coversTop = rows > 0 ? measuredCursorY + 32 : measuredCursorY;
  const coversHeight = rows > 0 ? rows * COVER_HEIGHT + (rows - 1) * COVER_ROW_GAP : 0;
  const HEIGHT = Math.max(630, coversTop + coversHeight + PADDING);

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.fillStyle = COLOR.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // The same two off-screen light sources the site's body carries.
  const rose = ctx.createRadialGradient(120, 0, 0, 120, 0, 620);
  rose.addColorStop(0, "rgba(244, 63, 94, 0.20)");
  rose.addColorStop(1, "rgba(244, 63, 94, 0)");
  ctx.fillStyle = rose;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const amber = ctx.createRadialGradient(WIDTH, HEIGHT, 0, WIDTH, HEIGHT, 560);
  amber.addColorStop(0, "rgba(245, 158, 11, 0.14)");
  amber.addColorStop(1, "rgba(245, 158, 11, 0)");
  ctx.fillStyle = amber;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // The mark: 次 in the brand-gradient box, beside the wordmark — the same lockup
  // Wordmark.tsx renders in the app chrome, drawn a second way for the same reason
  // the rest of this file is (see the file header note).
  const markCenterY = PADDING + MARK_SIZE / 2;
  const markGradient = ctx.createLinearGradient(
    PADDING,
    PADDING,
    PADDING + MARK_SIZE,
    PADDING + MARK_SIZE,
  );
  markGradient.addColorStop(0, COLOR.primary);
  markGradient.addColorStop(1, COLOR.highlight);
  roundedRect(ctx, PADDING, PADDING, MARK_SIZE, MARK_SIZE, 8);
  ctx.fillStyle = markGradient;
  ctx.fill();

  ctx.fillStyle = COLOR.foreground;
  ctx.font =
    "700 15px 'Hiragino Sans', 'Yu Gothic', 'Noto Sans JP', 'Noto Sans CJK JP', ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("次", PADDING + MARK_SIZE / 2, markCenterY + 1);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = COLOR.primary;
  ctx.font = "700 20px ui-monospace, monospace";
  ctx.textBaseline = "middle";
  ctx.fillText("TSUGI", PADDING + MARK_SIZE + 10, markCenterY);
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = COLOR.mutedForeground;
  ctx.font = "500 13px ui-monospace, monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(metaText, WIDTH - PADDING, markCenterY);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = COLOR.foreground;
  ctx.font = "800 58px system-ui, sans-serif";
  const titleLines = wrapText(ctx, input.title, WIDTH - PADDING * 2, 2);
  titleLines.forEach((line, index) => {
    ctx.fillText(line, PADDING, PADDING + 110 + index * 68);
  });

  let cursorY = PADDING + 110 + titleLines.length * 68;

  if (input.subtitle) {
    ctx.fillStyle = COLOR.mutedForeground;
    ctx.font = "400 26px system-ui, sans-serif";
    const [line] = wrapText(ctx, input.subtitle, WIDTH - PADDING * 2, 1);
    if (line) ctx.fillText(line, PADDING, cursorY + 14);
    cursorY += 44;
  }

  if (input.comment) {
    ctx.fillStyle = COLOR.mutedForeground;
    ctx.font = "400 22px system-ui, sans-serif";
    wrapText(ctx, input.comment, WIDTH - PADDING * 2, 2).forEach((line, index) => {
      ctx.fillText(line, PADDING, cursorY + 16 + index * 32);
    });
  }

  // Covers fan out in rows, each rotated a little further than the last within its row.
  const coverImages = await Promise.all(
    covers.map((item) => (item.coverImage ? loadImage(item.coverImage) : null)),
  );

  coverImages.forEach((image, index) => {
    const row = Math.floor(index / perRow);
    const indexInRow = index % perRow;
    // The last row may hold fewer than `perRow` covers — recentre it instead of
    // fanning from a `perRow`-wide origin that would leave it lopsided.
    const coversInThisRow = Math.min(perRow, covers.length - row * perRow);
    const rowCenter = (coversInThisRow - 1) / 2;

    const x = PADDING + indexInRow * (COVER_WIDTH - COVER_OVERLAP);
    const y = coversTop + row * (COVER_HEIGHT + COVER_ROW_GAP);

    ctx.save();
    ctx.translate(x + COVER_WIDTH / 2, y + COVER_HEIGHT / 2);
    ctx.rotate((indexInRow - rowCenter) * 0.035);
    ctx.translate(-COVER_WIDTH / 2, -COVER_HEIGHT / 2);

    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;

    roundedRect(ctx, 0, 0, COVER_WIDTH, COVER_HEIGHT, 12);
    ctx.fillStyle = COLOR.card;
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    if (image) {
      ctx.save();
      roundedRect(ctx, 0, 0, COVER_WIDTH, COVER_HEIGHT, 12);
      ctx.clip();
      // Cover-fit: scale to fill, then centre the overflow.
      const scale = Math.max(COVER_WIDTH / image.width, COVER_HEIGHT / image.height);
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      ctx.drawImage(
        image,
        (COVER_WIDTH - drawWidth) / 2,
        (COVER_HEIGHT - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
      ctx.restore();
    }

    roundedRect(ctx, 0.5, 0.5, COVER_WIDTH - 1, COVER_HEIGHT - 1, 12);
    ctx.strokeStyle = COLOR.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  });

  return canvas;
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not encode the card"));
    }, "image/png");
  });
}

export async function downloadSocialCard(
  input: SocialCardInput,
  filename: string,
): Promise<void> {
  const canvas = await drawCard(input);
  const blob = await toBlob(canvas);
  const href = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(href);
}

/** Throws where ClipboardItem is unavailable (Firefox, older Safari) — callers offer
 *  the download as the fallback rather than treating this as the only path. */
export async function copySocialCard(input: SocialCardInput): Promise<void> {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
    throw new Error("Image clipboard unsupported");
  }
  const canvas = await drawCard(input);
  const blob = await toBlob(canvas);
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}
