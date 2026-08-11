import { cn } from "@/lib/utils";

const SIZES = {
  sm: { mark: "text-lg", word: "text-sm tracking-[0.42em]", bar: "h-px" },
  lg: { mark: "text-4xl sm:text-5xl", word: "text-base tracking-[0.52em]", bar: "h-0.5" },
} as const;

/**
 * The eyecatch lockup: 次 beside the wordmark, over the glowing bar that wipes in.
 * It is the one element every screen shares, so it carries the whole direction and
 * everything around it stays quiet.
 *
 * The kanji resolves from the reader's own CJK font — none of the three loaded faces
 * carry it, and pulling a full JP family for a single glyph is not worth the weight.
 * It is decorative beside the latin wordmark, never the only thing naming the product.
 */
export function Wordmark({
  size = "sm",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const scale = SIZES[size];

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline gap-3">
        <span
          aria-hidden
          className={cn("font-normal text-bloom/90 [font-family:'Hiragino_Sans','Yu_Gothic','Noto_Sans_JP','Noto_Sans_CJK_JP',sans-serif]", scale.mark)}
        >
          次
        </span>
        <span className={cn("font-display font-semibold text-foreground uppercase", scale.word)}>
          Tsugi
        </span>
      </div>
      <div className={cn("eyecatch-bar w-full origin-left animate-wipe-in", scale.bar)} />
    </div>
  );
}
