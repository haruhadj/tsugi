import { CompassIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { FeedList } from "@/components/FeedList";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { getServerSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  FEED_SORTS,
  listFeedCategories,
  listPublishedFeed,
  type FeedSort,
} from "@/server/services/lists";

type SearchParams = Promise<{ sort?: string; page?: string; category?: string }>;

const PAGE_SIZE = 20;

const SORT_LABELS: Record<FeedSort, string> = {
  top: "Top",
  new: "New",
  views: "Most viewed",
  items: "Longest",
};

function isFeedSort(value: string | undefined): value is FeedSort {
  return value !== undefined && (FEED_SORTS as readonly string[]).includes(value);
}

export default async function FeedPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const sort: FeedSort = isFeedSort(params.sort) ? params.sort : "top";
  const pageParam = Number(params.page ?? "1");
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const category = params.category || undefined;

  const [session, entries, categories] = await Promise.all([
    getServerSession(),
    listPublishedFeed({ page, pageSize: PAGE_SIZE, sort, category }),
    listFeedCategories(),
  ]);

  const hrefFor = (next: { sort?: FeedSort; category?: string; page?: number }) => {
    const query = new URLSearchParams({ sort: next.sort ?? sort });
    const nextCategory = "category" in next ? next.category : category;
    if (nextCategory) query.set("category", nextCategory);
    if (next.page && next.page > 1) query.set("page", String(next.page));
    return `/feed?${query}`;
  };

  // Slot numbers continue across pages: page 2 opens at 21, not at 1. They are
  // the sort order made visible, so they have to keep counting to stay true.
  const firstSlot = (page - 1) * PAGE_SIZE + 1;

  const totalPublished = categories.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className="min-h-screen">
      <Header username={session ? (session.user.username ?? session.user.name) : null} />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="animate-card-in">
          <section className="relative overflow-hidden rounded-3xl border border-border bg-card/60 p-6 sm:p-10">
            {/* Off-centre glow, purely decorative — kept behind the copy, never over it. */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-primary/20 blur-3xl"
            />
            <div className="relative">
              <p className="font-mono text-xs tracking-[0.28em] text-muted-foreground uppercase">
                {category ?? "Everything"}
              </p>
              <h1 className="mt-3 font-display text-[clamp(1.9rem,5vw,2.75rem)] leading-[1.02] font-extrabold tracking-[-0.03em]">
                The rundown
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
                Every list people have published, ranked by what the room thinks of them.
                Vote on the ones you have opinions about.
              </p>
              <Button asChild className="mt-6 rounded-full">
                <Link href="/">
                  <PlusIcon aria-hidden />
                  Make a list
                </Link>
              </Button>
            </div>
          </section>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem]">
            <div className="min-w-0">
              <nav aria-label="Sort" className="flex flex-wrap items-center gap-1">
                {FEED_SORTS.map((option) => (
                  <Link
                    key={option}
                    href={hrefFor({ sort: option })}
                    aria-current={sort === option ? "true" : undefined}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      sort === option
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    {SORT_LABELS[option]}
                  </Link>
                ))}
              </nav>

              <div className="mt-6">
                {entries.length === 0 ? (
                  <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-16 text-center">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary">
                      <CompassIcon className="size-6 text-muted-foreground" aria-hidden />
                    </div>
                    <h2 className="mt-4 font-display text-lg font-bold">
                      {category ? `Nothing under ${category} yet` : "The rundown is empty"}
                    </h2>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                      {category
                        ? "Publish a list with that category and it opens the rundown."
                        : "Publish a list and it takes slot 01."}
                    </p>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                      {category && (
                        <Button asChild variant="outline" className="rounded-full">
                          <Link href={hrefFor({ category: undefined })}>Clear filter</Link>
                        </Button>
                      )}
                      <Button asChild className="rounded-full">
                        <Link href="/">Make a list</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <FeedList entries={entries} firstSlot={firstSlot} />
                )}
              </div>

              <div className="mt-8 flex items-center justify-between">
                {page > 1 ? (
                  <Button asChild variant="ghost" size="sm" className="rounded-full">
                    <Link href={hrefFor({ page: page - 1 })}>Back</Link>
                  </Button>
                ) : (
                  <span />
                )}
                {entries.length === PAGE_SIZE ? (
                  <Button asChild variant="ghost" size="sm" className="rounded-full">
                    <Link href={hrefFor({ page: page + 1 })}>
                      Slot {firstSlot + PAGE_SIZE} onward
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>

            <aside className="flex flex-col gap-4">
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
                        <span className="font-mono text-[11px] tabular-nums">
                          {totalPublished}
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
                          <span className="font-mono text-[11px] tabular-nums">{entry.count}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}

              <section className="rounded-2xl border border-border bg-card/60 p-4">
                <h2 className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
                  About Tsugi
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Score the anime and manga you would hand to someone, and Tsugi turns them
                  into a link worth sending. Reading takes no account at all.
                </p>
                {session === null && (
                  <Button asChild variant="outline" size="sm" className="mt-4 w-full rounded-full">
                    <Link href="/sign-in">Sign in to vote</Link>
                  </Button>
                )}
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
