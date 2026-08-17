import { MediaCover } from "@/components/MediaCover";
import { ScoreBadge } from "@/components/ScoreBadge";
import { SourceLink } from "@/components/SourceLink";
import type { ListView } from "@/server/services/lists";
import type { MediaType, Provider } from "@/lib/types/media";
import type { ScoreFormat } from "@/lib/score";

/**
 * The artifact — the thing the whole product exists to produce, and the only
 * surface that gets the full eyecatch card. The feed deliberately runs quiet so
 * that arriving here feels like arriving somewhere.
 *
 * Slot numbers carry through from the rundown: there they number lists, here
 * they number titles. Both are real running orders (`item.position`), so the
 * device is describing the content rather than decorating it.
 */
export function RecView({ rec }: { rec: ListView }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <article className="animate-card-in relative overflow-hidden rounded-md border border-border bg-card">
        <div className="eyecatch-edge absolute inset-y-0 left-0 w-1" aria-hidden />

        <div className="p-8 pl-10 sm:p-10 sm:pl-12">
          <header className="flex flex-col gap-2">
            <p className="font-mono text-[0.65rem] tracking-[0.3em] text-muted-foreground uppercase">
              {rec.items.length} {rec.items.length === 1 ? "title" : "titles"}
            </p>
            <h1 className="mt-3 font-display text-[clamp(1.75rem,5vw,2.5rem)] leading-[0.95] font-extrabold tracking-[-0.03em] text-foreground uppercase">
              {rec.name}
            </h1>
            {rec.caption ? (
              <p className="mt-1 text-sm text-muted-foreground">{rec.caption}</p>
            ) : null}
            {rec.comment ? (
              <p className="mt-5 max-w-lg text-sm leading-relaxed text-foreground/85">
                {rec.comment}
              </p>
            ) : null}
          </header>

          <ul className="mt-10 flex flex-col divide-y divide-border border-t border-border">
            {rec.items.map((item, index) => (
              <li key={item.position} className="flex gap-5 py-6 first:pt-8">
                <span
                  aria-hidden
                  className="mt-1 font-mono text-sm leading-none font-medium tabular-nums text-muted-foreground/60"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <MediaCover src={item.coverImage} title={item.title} width={72} height={108} />

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="font-display leading-tight font-semibold tracking-[-0.01em] text-foreground uppercase">
                      {item.title}
                    </h2>
                    {item.scoreRaw !== null && item.scoreFormat !== null ? (
                      <ScoreBadge
                        scoreRaw={item.scoreRaw}
                        scoreFormat={item.scoreFormat as ScoreFormat}
                      />
                    ) : null}
                  </div>

                  {item.comment ? (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {item.comment}
                    </p>
                  ) : null}

                  <SourceLink
                    provider={item.provider as Provider}
                    mediaType={item.mediaType as MediaType}
                    externalId={item.externalId}
                    className="w-fit font-mono text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="eyecatch-bar h-0.5 w-full" aria-hidden />
      </article>
    </main>
  );
}
