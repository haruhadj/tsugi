import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { box: 28, word: "text-base", tagline: false },
  md: { box: 36, word: "text-xl", tagline: true },
  lg: { box: 44, word: "text-2xl", tagline: true },
} as const;

/**
 * The lockup: the logo mark beside the wordmark. It is the one element every screen
 * shares, so it carries the whole direction and everything around it stays quiet.
 *
 * The mark (`public/logo.png`) is decorative beside the latin wordmark, never the
 * only thing naming the product, so it stays aria-hidden.
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
      <Image
        src="/logo.png"
        alt=""
        aria-hidden
        width={scale.box}
        height={scale.box}
        className="shrink-0 rounded-xl"
        priority
      />

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
