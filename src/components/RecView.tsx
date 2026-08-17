import { EyeIcon } from "lucide-react";
import { ListItemViews } from "@/components/ListItemViews";
import type { ListView } from "@/server/services/lists";

/**
 * The artifact — the thing the whole product exists to produce, and the only surface
 * that gets the full card treatment. The feed deliberately runs quieter so that
 * arriving here feels like arriving somewhere.
 *
 * The header is a Server Component; only the item layouts below it need client state
 * (the ranked/tier/gallery switch), so that is where the boundary sits.
 */
export function RecView({ rec }: { rec: ListView }) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10 sm:py-16">
      <article className="animate-card-in overflow-hidden rounded-3xl border border-border bg-card/60 shadow-xl">
        <div className="brand-gradient h-1 w-full" />

        <div className="p-6 sm:p-10">
          <header className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-primary/30 bg-primary/15 px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wide text-primary">
                {rec.name}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">/r/{rec.slug}</span>
              {!rec.published && (
                <span className="rounded-full border border-border bg-secondary px-2.5 py-1 font-mono text-[11px] font-semibold text-muted-foreground">
                  Draft
                </span>
              )}
            </div>

            <h1 className="font-display text-[clamp(1.75rem,5vw,2.5rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-foreground">
              {rec.caption ?? rec.name}
            </h1>

            {rec.comment && (
              <p className="max-w-2xl text-sm leading-relaxed text-foreground/85">
                {rec.comment}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <EyeIcon className="size-3.5" aria-hidden />
                {rec.views.toLocaleString()} {rec.views === 1 ? "view" : "views"}
              </span>
              {rec.publishedAt && (
                <time dateTime={rec.publishedAt.toISOString()}>
                  {rec.publishedAt.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              )}
            </div>
          </header>

          <ListItemViews items={rec.items} />
        </div>
      </article>
    </main>
  );
}
