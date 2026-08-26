import { PlusIcon } from "lucide-react";
import Link from "next/link";
import {
  FeedMediaTypeFilter,
  FeedPanel,
  FeedSearch,
} from "@/components/FeedControls";
import { Button } from "@/components/ui/button";
import type { ListCategory } from "@/lib/categories";
import type { HrefFor, FeedUrlState } from "@/lib/feed-params";
import { cn } from "@/lib/utils";
import type {
  FeedCategory,
  FeedMediaTypeCounts,
} from "@/server/services/lists";

/**
 * The rundown's directory: search, media format, categories, genres, and the
 * account panel. Rendered both inline on desktop (`FeedBrowseSidebar`) and
 * inside the phone's Browse drawer (`FeedBrowseMobileTrigger`) — the caller
 * decides where this content lives, this component only builds it.
 */
export function FeedDirectory({
  urlState,
  mediaTypeCounts,
  categories,
  genres,
  category,
  genre,
  hrefFor,
  totalPublished,
  signedIn,
}: {
  urlState: FeedUrlState;
  mediaTypeCounts: FeedMediaTypeCounts;
  categories: FeedCategory[];
  genres: FeedCategory[];
  category?: ListCategory;
  genre?: string;
  hrefFor: HrefFor;
  totalPublished: number;
  signedIn: boolean;
}) {
  const matchingLists = categories.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <>
      <FeedSearch urlState={urlState} />

      <FeedMediaTypeFilter urlState={urlState} counts={mediaTypeCounts} />

      {categories.length > 0 && (
        <nav
          aria-label="Categories"
          className="rounded-2xl border border-border bg-card/60 p-4"
        >
          <h2 className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
            Categories
          </h2>
          <ul className="mt-3 flex flex-col">
            <li>
              <Link
                href={hrefFor({ category: undefined })}
                aria-current={category === undefined ? "true" : undefined}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  category === undefined
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <span className="truncate">All</span>
                {/* The other filters still apply, so this is how many the reader
                    would see with the category cleared — not the global total
                    the account panel below quotes. */}
                <span className="font-mono text-[11px] tabular-nums">
                  {matchingLists}
                </span>
              </Link>
            </li>
            {categories.map((entry) => (
              <li key={entry.name}>
                <Link
                  href={hrefFor({ category: entry.name })}
                  aria-current={category === entry.name ? "true" : undefined}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    category === entry.name
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <span className="truncate">{entry.name}</span>
                  <span className="font-mono text-[11px] tabular-nums">
                    {entry.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/*
        Genres sit below categories and read differently on purpose: a category is
        where the author filed the list, a genre is what the titles on it actually
        are. Same directory shape, amber rather than the category's neutral
        selection, matching the chips on the rows themselves.
      */}
      {genres.length > 0 && (
        <nav
          aria-label="Genres"
          className="rounded-2xl border border-border bg-card/60 p-4"
        >
          <h2 className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
            Genres
          </h2>
          <ul className="mt-3 flex flex-col">
            {genres.map((entry) => (
              <li key={entry.name}>
                <Link
                  href={hrefFor({
                    genre: genre === entry.name ? undefined : entry.name,
                  })}
                  aria-current={genre === entry.name ? "true" : undefined}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    genre === entry.name
                      ? "bg-highlight/15 text-highlight"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <span className="truncate font-mono text-xs">
                    #{entry.name}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums">
                    {entry.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/*
        The drawer's last slot is an invitation rather than a description: a reader
        who opened the drawer already knows what the rundown is, so the space is
        worth more as the next step.
      */}
      <FeedPanel title="Your rundown">
        <dl className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2">
            <dt className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
              Curations
            </dt>
            <dd className="mt-0.5 font-display text-lg font-bold tabular-nums">
              {totalPublished}
            </dd>
          </div>
          <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2">
            <dt className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
              Sources
            </dt>
            <dd className="mt-0.5 text-sm font-semibold">AniList + MAL</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Score the anime and manga you would hand to someone and yours joins
          them as a link worth sending.
        </p>
        <Button asChild size="sm" className="mt-4 w-full rounded-full">
          <Link href={signedIn ? "/" : "/sign-in"}>
            <PlusIcon className="size-4" aria-hidden />
            {signedIn ? "Build one" : "Sign in to build one"}
          </Link>
        </Button>
      </FeedPanel>
    </>
  );
}
