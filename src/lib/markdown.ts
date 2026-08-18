import { formatScore, type ScoreFormat } from "./score";

export type MarkdownItem = {
  title: string;
  scoreRaw: number | null;
  scoreFormat: string | null;
  comment: string | null;
};

/**
 * A list as a markdown block, for pasting into a forum post, a Discord message, or
 * anywhere a link preview will not render.
 *
 * Scores go through formatScore like every other surface, so a POINT_3 rating reads
 * "liked it" here too rather than becoming a bare `2` that means nothing (invariant 6).
 */
export function buildMarkdownExport(params: {
  name: string;
  caption: string | null;
  comment: string | null;
  url: string;
  items: MarkdownItem[];
}): string {
  const { name, caption, comment, url, items } = params;
  const lines: string[] = [`## ${caption ?? name}`];

  if (caption && caption !== name) lines.push("", `*${name}*`);
  if (comment) lines.push("", comment);
  if (items.length > 0) lines.push("");

  items.forEach((item, index) => {
    const score =
      item.scoreRaw !== null && item.scoreFormat !== null
        ? ` — **${formatScore(item.scoreRaw, item.scoreFormat as ScoreFormat)}**`
        : "";
    lines.push(`${index + 1}. ${item.title}${score}`);
    // The per-item note is indented under its title so it stays attached to it in
    // renderers that reflow the list.
    if (item.comment) lines.push(`   > ${item.comment}`);
  });

  lines.push("", `— [via Tsugi](${url})`);

  return lines.join("\n");
}
