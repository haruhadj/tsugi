/**
 * Draws the shareable 1200×630 card to a canvas so the reader can save it as a PNG.
 *
 * This is the same card /r/[slug]/opengraph-image.tsx renders with Satori, drawn a
 * second way because the two run in different places: that one is server-rendered for
 * crawlers, this one runs in the browser to produce a file. Keep the two visually in
 * step — the palette below is the same hex block, for the same reason (Satori and
 * canvas both need literal colours, not oklch).
 */
const COLOR = {
  background: "#09090B",
  card: "#18181B",
  border: "#27272A",
  foreground: "#FAFAFA",
  mutedForeground: "#A1A1AA",
  primary: "#F43F5E",
  highlight: "#F59E0B",
};

const WIDTH = 1200;
const HEIGHT = 630;
const PADDING = 64;

export type CardItem = { title: string; coverImage: string | null };

export type SocialCardInput = {
  title: string;
  subtitle: string | null;
  comment: string | null;
  itemCount: number;
  items: CardItem[];
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

async function drawCard(input: SocialCardInput): Promise<HTMLCanvasElement> {
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

  // The brand rule across the top.
  const bar = ctx.createLinearGradient(0, 0, WIDTH, 0);
  bar.addColorStop(0, COLOR.primary);
  bar.addColorStop(1, COLOR.highlight);
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, WIDTH, 6);

  ctx.fillStyle = COLOR.primary;
  ctx.font = "700 20px ui-monospace, monospace";
  ctx.fillText("TSUGI", PADDING, PADDING + 24);

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

  // Covers fan out along the bottom, each rotated a little further than the last.
  const covers = await Promise.all(
    input.items.slice(0, 4).map((item) => (item.coverImage ? loadImage(item.coverImage) : null)),
  );

  const coverWidth = 168;
  const coverHeight = 250;
  const baseX = PADDING;
  const baseY = HEIGHT - PADDING - coverHeight;

  covers.forEach((image, index) => {
    const x = baseX + index * (coverWidth - 26);
    ctx.save();
    ctx.translate(x + coverWidth / 2, baseY + coverHeight / 2);
    ctx.rotate((index - 1.5) * 0.035);
    ctx.translate(-coverWidth / 2, -coverHeight / 2);

    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;

    roundedRect(ctx, 0, 0, coverWidth, coverHeight, 12);
    ctx.fillStyle = COLOR.card;
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    if (image) {
      ctx.save();
      roundedRect(ctx, 0, 0, coverWidth, coverHeight, 12);
      ctx.clip();
      // Cover-fit: scale to fill, then centre the overflow.
      const scale = Math.max(coverWidth / image.width, coverHeight / image.height);
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      ctx.drawImage(
        image,
        (coverWidth - drawWidth) / 2,
        (coverHeight - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
      ctx.restore();
    }

    roundedRect(ctx, 0.5, 0.5, coverWidth - 1, coverHeight - 1, 12);
    ctx.strokeStyle = COLOR.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  });

  ctx.fillStyle = COLOR.mutedForeground;
  ctx.font = "500 22px ui-monospace, monospace";
  ctx.textAlign = "right";
  ctx.fillText(
    `${input.itemCount} ${input.itemCount === 1 ? "title" : "titles"}`,
    WIDTH - PADDING,
    HEIGHT - PADDING - 8,
  );
  ctx.textAlign = "left";

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
