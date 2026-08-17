import { cn } from "@/lib/utils";

const SIZES = {
  sm: { box: "size-7 text-xs", word: "text-base", tagline: false },
  md: { box: "size-9 text-base", word: "text-xl", tagline: true },
  lg: { box: "size-11 text-xl", word: "text-2xl", tagline: true },
} as const;

/**
 * The lockup: 次 in the brand-gradient mark, beside the wordmark. It is the one element
 * every screen shares, so it carries the whole direction and everything around it stays
 * quiet.
 *
 * The kanji resolves from the reader's own CJK font — none of the three loaded faces
 * carry it, and pulling a full JP family for a single glyph is not worth the weight.
 * It is decorative beside the latin wordmark, never the only thing naming the product,
 * so it stays aria-hidden.
 */
export function Wordmark({
  size = "md",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const scale = SIZES[size];

  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <div
        aria-hidden
        className={cn(
          "brand-gradient flex shrink-0 items-center justify-center rounded-xl border border-primary/30 font-mono font-bold tracking-tighter text-primary-foreground",
          "[font-family:'Hiragino_Sans','Yu_Gothic','Noto_Sans_JP','Noto_Sans_CJK_JP',ui-monospace,monospace]",
          scale.box,
        )}
      >
        次
      </div>

      <div className="flex flex-col">
        <span
          className={cn(
            "font-display leading-none font-extrabold tracking-tight text-foreground",
            scale.word,
          )}
        >
          Tsugi
        </span>
        {scale.tagline && (
          <span className="mt-1 font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
            Curated Anime &amp; Manga
          </span>
        )}
      </div>
    </div>
  );
}
