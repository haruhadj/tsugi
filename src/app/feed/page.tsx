import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { VoteButtons } from "@/components/VoteButtons";
import { cn } from "@/lib/utils";
import {
  listFeedCategories,
  listPublishedFeed,
  type FeedSort,
} from "@/server/services/lists";

type SearchParams = Promise<{ sort?: string; page?: string; category?: string }>;

const PAGE_SIZE = 20;

function isFeedSort(value: string | undefined): value is FeedSort {
  return value === "top" || value === "new";
}

export default async function FeedPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const sort: FeedSort = isFeedSort(params.sort) ? params.sort : "top";
  const pageParam = Number(params.page ?? "1");
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const category = params.category || undefined;

  const [entries, categories] = await Promise.all([
    listPublishedFeed({ page, pageSize: PAGE_SIZE, sort, category }),
    listFeedCategories(),
  ]);

  const categoryQuery = (value?: string) => (value ? `&category=${encodeURIComponent(value)}` : "");

  // Slot numbers continue across pages: page 2 opens at 21, not at 1. They are
  // the sort order made visible, so they have to keep counting to stay true.
  const firstSlot = (page - 1) * PAGE_SIZE + 1;

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-6 pt-8">
        <Link href="/">
          <Wordmark />
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="animate-card-in">
          <p className="font-mono text-xs tracking-[0.28em] text-muted-foreground uppercase">
            {category ?? "Everything"}
          </p>
          <h1 className="mt-4 font-display text-[clamp(1.9rem,5vw,2.75rem)] leading-[0.95] font-extrabold tracking-[-0.03em] uppercase">
            The rundown
          </h1>

          {/*
            Two nav axes, two forms. Sort is a switcher — exactly one of two
            states, so it is one enclosed control. Category is a filter over an
            open-ended set, so it is an underlined rail. Making them look alike
            (the old matching pills) implied they were the same kind of choice.
          */}
          <div className="mt-8 flex items-stretch divide-x divide-border rounded-xs border border-border">
            {(["top", "new"] as const).map((option) => (
              <Link
                key={option}
                href={`/feed?sort=${option}${categoryQuery(category)}`}
                aria-current={sort === option ? "true" : undefined}
                className={cn(
                  "px-4 py-2 font-mono text-xs tracking-[0.2em] uppercase transition-colors",
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                  sort === option
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option}
              </Link>
            ))}
          </div>

          {categories.length > 0 ? (
            <nav
              aria-label="Categories"
              className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3"
            >
              {[undefined, ...categories].map((name) => {
                const isActive = category === name;
                return (
                  <Link
                    key={name ?? "__all"}
                    href={`/feed?sort=${sort}${categoryQuery(name)}`}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "border-b-2 pb-1 font-mono text-xs tracking-[0.2em] uppercase transition-colors",
                      "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                      isActive
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {name ?? "All"}
                  </Link>
                );
              })}
            </nav>
          ) : null}

          {entries.length === 0 ? (
            <div className="mt-10 rounded-xs border border-border p-8">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {category
                  ? `Nothing published under ${category} yet. Publish a list with that category and it opens the rundown.`
                  : "The rundown is empty. Publish a list and it takes slot 01."}
              </p>
              <Link
                href="/"
                className="mt-4 inline-block font-mono text-xs tracking-[0.2em] text-primary uppercase underline-offset-4 hover:underline"
              >
                Make a list
              </Link>
            </div>
          ) : (
            /*
              One surface, hairline-divided rows — not twenty floating cards.
              `bg-card` and the eyecatch edge stay reserved for /r/[slug], where
              there genuinely is one card. Spending them twenty times here is
              what flattened the feed.
            */
            <ul className="mt-10 divide-y divide-border rounded-xs border border-border">
              {entries.map((entry, index) => {
                const slot = firstSlot + index;
                const isLead = slot === 1;
                return (
                  <li key={entry.slug} className="relative">
                    {/* The lead slot is the one cyan thing on this screen. */}
                    {isLead ? (
                      <div className="eyecatch-edge absolute inset-y-0 left-0 w-1" aria-hidden />
                    ) : null}
                    <div className="flex items-start gap-5 py-6 pr-6 pl-8">
                      <span
                        aria-hidden
                        className={cn(
                          "mt-0.5 font-mono text-2xl leading-none font-medium tabular-nums",
                          isLead ? "text-bloom" : "text-muted-foreground/50",
                        )}
                      >
                        {String(slot).padStart(2, "0")}
                      </span>

                      <Link
                        href={`/r/${entry.slug}`}
                        className="min-w-0 flex-1 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <p className="font-display leading-tight font-semibold tracking-[-0.01em] uppercase">
                          {entry.name}
                        </p>
                        {entry.caption ? (
                          <p className="mt-1.5 truncate text-sm text-muted-foreground">
                            {entry.caption}
                          </p>
                        ) : null}
                        <p className="mt-2 font-mono text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase">
                          {entry.views} {entry.views === 1 ? "view" : "views"}
                        </p>
                      </Link>

                      <VoteButtons slug={entry.slug} initialScore={entry.score} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-8 flex items-center justify-between">
            {page > 1 ? (
              <Link
                href={`/feed?sort=${sort}&page=${page - 1}${categoryQuery(category)}`}
                className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                Back
              </Link>
            ) : (
              <span />
            )}
            {entries.length === PAGE_SIZE ? (
              <Link
                href={`/feed?sort=${sort}&page=${page + 1}${categoryQuery(category)}`}
                className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                Slot {firstSlot + PAGE_SIZE} onward
              </Link>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
