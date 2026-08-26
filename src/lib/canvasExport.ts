import {
  COLOR,
  COVER_HEIGHT,
  COVER_OVERLAP,
  COVER_ROW_GAP,
  COVER_WIDTH,
  MARK_SIZE,
  MAX_COVERS,
  PADDING,
  loadImage,
  roundedRect,
  wrapText,
  type CardItem,
  type SocialCardInput,
} from "@/lib/canvas-export/helpers";
import { computeCardLayout } from "@/lib/canvas-export/layout";

export type { CardItem, SocialCardInput };

async function drawCard(input: SocialCardInput): Promise<HTMLCanvasElement> {
  const covers = input.items.slice(0, MAX_COVERS);
  const { width: WIDTH, height: HEIGHT, perRow, rows, coversTop, metaText } =
    computeCardLayout(input);

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
