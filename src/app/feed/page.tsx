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
            Feed
          </p>
          <h1 className="mt-4 font-display text-[clamp(1.9rem,5vw,2.75rem)] leading-[0.95] font-extrabold tracking-[-0.03em] uppercase">
            Published lists
          </h1>

          <div className="mt-6 flex gap-2">
            <Link
              href={`/feed?sort=top${categoryQuery(category)}`}
              className={cn(
                "rounded-md border border-border px-3 py-1.5 font-mono text-xs tracking-[0.16em] uppercase",
                sort === "top" ? "bg-bloom text-bloom-foreground" : "text-muted-foreground",
              )}
            >
              Top
            </Link>
            <Link
              href={`/feed?sort=new${categoryQuery(category)}`}
              className={cn(
                "rounded-md border border-border px-3 py-1.5 font-mono text-xs tracking-[0.16em] uppercase",
                sort === "new" ? "bg-bloom text-bloom-foreground" : "text-muted-foreground",
              )}
            >
              New
            </Link>
          </div>

          {categories.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/feed?sort=${sort}`}
                className={cn(
                  "rounded-full border border-border px-3 py-1 font-mono text-[11px] tracking-[0.12em] uppercase",
                  !category ? "bg-bloom text-bloom-foreground" : "text-muted-foreground",
                )}
              >
                All
              </Link>
              {categories.map((name) => (
                <Link
                  key={name}
                  href={`/feed?sort=${sort}${categoryQuery(name)}`}
                  className={cn(
                    "rounded-full border border-border px-3 py-1 font-mono text-[11px] tracking-[0.12em] uppercase",
                    category === name ? "bg-bloom text-bloom-foreground" : "text-muted-foreground",
                  )}
                >
                  {name}
                </Link>
              ))}
            </div>
          ) : null}

          <ul className="mt-8 flex flex-col gap-4">
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {category ? `No published lists in "${category}" yet.` : "No published lists yet."}
              </p>
            ) : (
              entries.map((entry) => (
                <li
                  key={entry.slug}
                  className="relative overflow-hidden rounded-md border border-border bg-card"
                >
                  <div className="eyecatch-edge absolute inset-y-0 left-0 w-1" />
                  <div className="flex items-center gap-4 p-6 pl-8">
                    <VoteButtons slug={entry.slug} initialScore={entry.score} />
                    <Link href={`/r/${entry.slug}`} className="min-w-0 flex-1">
                      <p className="font-display text-lg font-semibold tracking-[0.02em] uppercase">
                        {entry.name}
                      </p>
                      {entry.caption ? (
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {entry.caption}
                        </p>
                      ) : null}
                      <p className="mt-2 font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase">
                        {entry.views} views
                      </p>
                    </Link>
                  </div>
                </li>
              ))
            )}
          </ul>

          <div className="mt-8 flex justify-between">
            {page > 1 ? (
              <Link
                href={`/feed?sort=${sort}&page=${page - 1}${categoryQuery(category)}`}
                className="font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase"
              >
                Previous
              </Link>
            ) : (
              <span />
            )}
            {entries.length === PAGE_SIZE ? (
              <Link
                href={`/feed?sort=${sort}&page=${page + 1}${categoryQuery(category)}`}
                className="font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase"
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
