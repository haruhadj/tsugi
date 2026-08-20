import { EyeIcon } from "lucide-react";
import { ListItemViews } from "@/components/ListItemViews";
import { ListQuickActions } from "@/components/ListQuickActions";
import { ShareListButton } from "@/components/ShareListButton";
import { getEnv } from "@/lib/env";
import { buildMarkdownExport } from "@/lib/markdown";
import type { SocialCardInput } from "@/lib/canvasExport";
import type { ListView } from "@/server/services/lists";

/**
 * The artifact — the thing the whole product exists to produce, and the only surface
 * that gets the full card treatment. The feed deliberately runs quieter so that
 * arriving here feels like arriving somewhere.
 *
 * A Server Component, and it has to stay one: `getEnv()` below validates the full
 * server env, so this module must never gain a `"use client"`. The interactive parts
 * are client leaves — the quick actions, the share modal, and the item layouts.
 */
export function RecView({ rec }: { rec: ListView }) {
  // Built server-side from NEXT_PUBLIC_APP_URL rather than window.location, so the
  // shared link is the canonical one no matter what host served the page.
  const shareUrl = `${getEnv().NEXT_PUBLIC_APP_URL}/r/${rec.slug}`;
  const markdown = buildMarkdownExport({
    name: rec.name,
    caption: rec.caption,
    comment: rec.comment,
    url: shareUrl,
    items: rec.items,
  });
  const card: SocialCardInput = {
    // Since D48 `name` is the list's title and `caption` is the line under it,
    // so the card leads with the name. Before the split, `name` was the category
    // and the caption had to stand in as the headline.
    title: rec.name,
    subtitle: rec.caption,
    comment: rec.comment,
    itemCount: rec.items.length,
    items: rec.items.map((item) => ({ title: item.title, coverImage: item.coverImage })),
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 sm:py-16">
      <article className="animate-card-in overflow-hidden rounded-3xl border border-border bg-card/60 shadow-xl">
        <div className="brand-gradient h-1 w-full" />

        <div className="p-6 sm:p-10">
          <header className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-primary/30 bg-primary/15 px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wide text-primary">
                {rec.category}
              </span>
              {/*
                The author's handle (D49). Absent only for lists published before
                handles were mandatory, whose owner has not signed in since — no
                line at all rather than a name they never chose as a handle.
              */}
              {rec.authorUsername && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  u/{rec.authorUsername}
                </span>
              )}
              <span className="font-mono text-[11px] text-muted-foreground">/r/{rec.slug}</span>
              {!rec.published && (
                <span className="rounded-full border border-border bg-secondary px-2.5 py-1 font-mono text-[11px] font-semibold text-muted-foreground">
                  Draft
                </span>
              )}
            </div>

            <h1 className="font-display text-[clamp(1.75rem,5vw,2.5rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-foreground">
              {rec.name}
            </h1>

            {rec.caption && (
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
                {rec.caption}
              </p>
            )}

            {rec.comment && (
              <p className="max-w-2xl text-sm leading-relaxed text-foreground/85">
                {rec.comment}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs text-muted-foreground">
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

              <div className="flex flex-wrap items-center gap-2">
                <ListQuickActions url={shareUrl} card={card} />
                <ShareListButton
                  url={shareUrl}
                  text={rec.caption ?? rec.name}
                  markdown={markdown}
                  card={card}
                />
              </div>
            </div>
          </header>

          <ListItemViews items={rec.items} genres={rec.genres} />
        </div>
      </article>
    </main>
  );
}
