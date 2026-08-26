import {
  COVER_HEIGHT,
  COVER_OVERLAP,
  COVER_ROW_GAP,
  COVER_WIDTH,
  MARK_SIZE,
  MAX_WIDTH,
  MIN_WIDTH,
  PADDING,
  coverLayout,
  wrapText,
  type SocialCardInput,
} from "@/lib/canvas-export/helpers";

export type CardLayout = {
  width: number;
  height: number;
  perRow: number;
  rows: number;
  coversTop: number;
  metaText: string;
};

/**
 * Sizes the card before it's drawn: text wraps against the widest the card is
 * allowed to get, then the card shrinks to whatever the wrapped lines and the
 * cover row actually need — so a short title with few covers doesn't drag
 * along the full 1200px canvas as dead space. Uses a throwaway canvas context
 * purely to measure, since the real canvas's size depends on this result.
 */
export function computeCardLayout(input: SocialCardInput): CardLayout {
  const covers = input.items.slice(0, 10);
  const { perRow, rows } = coverLayout(covers.length);

  const measureCtx = document.createElement("canvas").getContext("2d");
  if (!measureCtx) throw new Error("Canvas 2D context unavailable");

  const wrapBound = MAX_WIDTH - PADDING * 2;

  measureCtx.font = "800 58px system-ui, sans-serif";
  const titleLines = wrapText(measureCtx, input.title, wrapBound, 2);
  const titleWidth = Math.max(0, ...titleLines.map((l) => measureCtx.measureText(l).width));
  let cursorY = PADDING + 110 + titleLines.length * 68;

  let subtitleWidth = 0;
  if (input.subtitle) {
    measureCtx.font = "400 26px system-ui, sans-serif";
    const [line] = wrapText(measureCtx, input.subtitle, wrapBound, 1);
    subtitleWidth = line ? measureCtx.measureText(line).width : 0;
    cursorY += 44;
  }

  let commentWidth = 0;
  if (input.comment) {
    measureCtx.font = "400 22px system-ui, sans-serif";
    const commentLines = wrapText(measureCtx, input.comment, wrapBound, 2);
    commentWidth = Math.max(0, ...commentLines.map((l) => measureCtx.measureText(l).width));
    cursorY += 16 + commentLines.length * 32;
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
  const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, contentWidth + PADDING * 2));

  const coversTop = rows > 0 ? cursorY + 32 : cursorY;
  const coversHeight = rows > 0 ? rows * COVER_HEIGHT + (rows - 1) * COVER_ROW_GAP : 0;
  const height = Math.max(630, coversTop + coversHeight + PADDING);

  return { width, height, perRow, rows, coversTop, metaText };
}
