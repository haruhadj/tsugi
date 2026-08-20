import { BookOpenIcon, TvIcon } from "lucide-react";
import type { MediaType } from "@/lib/types/media";
import { cn } from "@/lib/utils";

/**
 * The anime/manga chip, as the prototype draws it: a glyph beside the word. Shared
 * because the builder shows it twice — once on a search result, once on the tray row
 * it becomes — and a second copy of the icon map is where the two start to disagree.
 *
 * The icons are the same pair the feed's media-format panel uses, so "anime" reads as
 * the same thing on both screens. The prototype also had a `Film` variant keyed on a
 * `format` field (TV/MOVIE/OVA); there is deliberately no such column here, so there
 * are exactly two cases (see the decisions table in the Phase C tracker).
 */
const ICONS: Record<MediaType, typeof TvIcon> = {
  anime: TvIcon,
  manga: BookOpenIcon,
};

export function MediaTypeChip({
  mediaType,
  className,
}: {
  mediaType: MediaType;
  className?: string;
}) {
  const Icon = ICONS[mediaType];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground uppercase",
        className,
      )}
    >
      <Icon className="size-2.5" aria-hidden="true" />
      {mediaType}
    </span>
  );
}
