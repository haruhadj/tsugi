import { EyeIcon } from "lucide-react";
import { CommentSection } from "@/components/CommentSection";
import { ListItemViews } from "@/components/ListItemViews";
import { ShareListButton } from "@/components/ShareListButton";
import type { SocialCardInput } from "@/lib/canvasExport";
import { getEnv } from "@/lib/env";
import { buildMarkdownExport } from "@/lib/markdown";
import { listComments, toWireComments } from "@/server/services/comments";
import type { ListView } from "@/server/services/lists";

/**
 * The artifact — the thing the whole product exists to produce, and the only surface
 * that gets the full card treatment. The feed deliberately runs quieter so that
 * arriving here feels like arriving somewhere.
 *
 * The header is a Server Component; only the item layouts below it need client state
 * (the ranked/tier/gallery switch), so that is where the boundary sits.
 */
export async function RecView({
  rec,
  viewerId,
}: {
  rec: ListView;
  viewerId: string | null;
}) {
  // Loaded here rather than fetched on mount, so the discussion is in the first
  // paint's HTML and is visible to crawlers along with the list itself.
  const comments = rec.published
    ? toWireComments((await listComments(rec.slug, viewerId, "top")) ?? [])
    : [];

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
    title: rec.caption ?? rec.name,
    subtitle: rec.caption ? rec.name : null,
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

              <ShareListButton
                url={shareUrl}
                text={rec.caption ?? rec.name}
                markdown={markdown}
                card={card}
              />
            </div>
          </header>

          <ListItemViews items={rec.items} />

          {/*
            Discussion only exists once a list is public. On a draft the owner is the
            only possible reader, so a comment box there would be talking to nobody.
          */}
          {rec.published && (
            <CommentSection
              slug={rec.slug}
              items={rec.items.map((item) => ({ position: item.position, title: item.title }))}
              isSignedIn={viewerId !== null}
              initialComments={comments}
            />
          )}
        </div>
      </article>
    </main>
  );
}
