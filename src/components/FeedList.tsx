"use client";

import {
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
  EyeIcon,
  LayoutGridIcon,
  LayoutListIcon,
  ListOrderedIcon,
  Rows3Icon,
  Share2Icon,
  SparklesIcon,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { MediaCover } from "@/components/MediaCover";
import { ScoreBadge } from "@/components/ScoreBadge";
import { ShareModal } from "@/components/ShareModal";
import { VoteButtons } from "@/components/VoteButtons";
import type { FeedCover, FeedEntry } from "@/server/services/lists";
import { cn } from "@/lib/utils";

const DENSITIES = [
  { id: "stream", label: "Stream", icon: LayoutListIcon },
  { id: "classic", label: "Compact", icon: Rows3Icon },
  { id: "grid", label: "Grid", icon: LayoutGridIcon },
] as const;

type Density = (typeof DENSITIES)[number]["id"];

/**
 * The feed's rows, in one of three densities. Density is client state and never a URL
 * param: it is a reading preference, not part of what the page is showing, so it must
 * not change what a shared /feed link resolves to. Sort, category and page do all live
 * in the URL, and are owned by the server component above this one.
 *
 * `sortNav`, `filterBar` and `browseDrawer` are rendered by the server and handed down
 * rather than placed above this component, so the density toggle can share the sort
 * tabs' row instead of claiming an otherwise empty line of its own.
 */
export function FeedList({
  entries,
  sortNav,
  filterBar,
  browseDrawer,
}: {
  entries: FeedEntry[];
  sortNav: ReactNode;
  filterBar?: ReactNode;
  browseDrawer?: ReactNode;
}) {
  const [density, setDensity] = useState<Density>("stream");

  return (
    <div>
      {/* One bar: sort tabs, any page-level filter control, and density read as a
          single toolbar rather than three controls stacked down the page. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-2xl border border-border bg-card/60 p-2">
        {sortNav}
        <div className="flex items-center gap-2">
          {browseDrawer}
          <div
            role="group"
            aria-label="Feed layout"
            className="inline-flex items-center gap-0.5 rounded-full border border-border bg-secondary/40 p-0.5"
          >
            {DENSITIES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setDensity(option.id)}
                aria-pressed={density === option.id}
                title={option.label}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  density === option.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <option.icon className="size-3.5" aria-hidden />
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {filterBar}

      {density === "grid" ? (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {entries.map((entry) => (
            <GridCard key={entry.slug} entry={entry} />
          ))}
        </ul>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {entries.map((entry) =>
            density === "stream" ? (
              <StreamCard key={entry.slug} entry={entry} />
            ) : (
              <CompactRow key={entry.slug} entry={entry} />
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/r/${slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied outright; the link is still on screen and
      // selectable, so there is nothing to recover from and nothing to announce.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {copied ? (
        <CheckIcon className="size-3.5 text-success" aria-hidden />
      ) : (
        <CopyIcon className="size-3.5" aria-hidden />
      )}
      <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
    </button>
  );
}

/**
 * The same modal the artifact page's `ShareListButton` opens, minus the card
 * tab — a feed row has the URL but not the resolved titles `SocialCardInput`
 * needs, and `ShareModal` already treats `card` as optional for exactly that
 * case (the builder opens it in the same half-known state).
 */
function ShareRowButton({ slug, name }: { slug: string; name: string }) {
  const [open, setOpen] = useState(false);
  const url =
    typeof window === "undefined" ? `/r/${slug}` : `${window.location.origin}/r/${slug}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Share2Icon className="size-3.5" aria-hidden />
        Share
      </button>
      <ShareModal open={open} onOpenChange={setOpen} url={url} text={name} />
    </>
  );
}

/**
 * The lead titles, badged with their rank and score.
 *
 * This used to be `aria-hidden` decoration because `FeedEntry` carried nothing
 * but image URLs — captioning it would have meant inventing alt text. Now that
 * each cover arrives with its title and `(raw, format)` score pair, the strip
 * says something the row does not, so it is exposed.
 *
 * Each cover is `flex-1` so the strip divides the row's whole width between
 * however many covers there are, rather than sitting at a fixed size and
 * scrolling — no cap on that growth, or a short list would leave the leftover
 * width unfilled at the end of the row instead of resolving to a share for
 * each cover. `fluid` on `MediaCover` is what lets the art itself grow to fill
 * that flexible slot instead of rendering at its 56×84 intrinsic size.
 */
function Filmstrip({ covers }: { covers: FeedCover[] }) {
  if (covers.length === 0) return null;

  return (
    <ul aria-label="Leading titles" className="flex items-start gap-2">
      {covers.map((cover, index) => (
        <li
          key={`${cover.title}-${index}`}
          className="flex min-w-0 flex-1 basis-0 flex-col items-center gap-1"
        >
          <div className="relative w-full">
            <MediaCover
              src={cover.coverImage}
              title={cover.title}
              width={56}
              height={84}
              fluid
              className="rounded-md"
            />
            {/* The rank restates the cover's position in a list that is already
                ordered, so it is decoration for anyone reading the markup. */}
            <span
              aria-hidden
              className="absolute top-0 left-0 rounded-tl-md rounded-br-md bg-background/85 px-1 font-mono text-[9px] font-bold tabular-nums text-foreground"
            >
              {index + 1}
            </span>
          </div>
          {cover.scoreRaw !== null && cover.scoreFormat !== null && (
            // Below the cover rather than over it: at 56px wide a POINT_100
            // score would cover the art it is annotating.
            <ScoreBadge
              scoreRaw={cover.scoreRaw}
              scoreFormat={cover.scoreFormat}
              size="sm"
              className="px-1 text-[9px]"
            />
          )}
        </li>
      ))}
    </ul>
  );
}

/** Fewer than three genres describes a theme; three or more describes a range. */
const MULTI_GENRE_THRESHOLD = 3;

function MultiGenreBadge({ genres }: { genres: string[] }) {
  if (genres.length < MULTI_GENRE_THRESHOLD) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-highlight/30 bg-highlight/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-highlight">
      <SparklesIcon className="size-3" aria-hidden />
      Multi-genre
    </span>
  );
}

/**
 * The link-overlay pattern: the title's `<Link>` grows a full-card pseudo-element
 * so the whole row is a click target, while staying a real anchor — keyboard
 * focus, middle-click and open-in-new-tab all keep working. A `div` with an
 * `onClick` would look identical and silently lose all three (ui-rules.md:
 * never strip a primitive's behaviour to match a mockup).
 *
 * Everything interactive that sits *over* the overlay needs `relative z-10`, or
 * the overlay swallows it — that is what `OVER_LINK_OVERLAY` marks.
 */
const LINK_OVERLAY = "after:absolute after:inset-0 after:content-['']";
const OVER_LINK_OVERLAY = "relative z-10";

function CategoryChip({ name }: { name: string }) {
  return (
    <span className="rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
      {name}
    </span>
  );
}

/**
 * The author's handle (D49). Renders nothing at all when there isn't one —
 * accounts that predate mandatory handles are gated at next sign-in rather than
 * backfilled, so until then their published lists simply go unattributed rather
 * than being signed with a name the person never chose.
 */
function AuthorTag({ username }: { username: string | null }) {
  if (!username) return null;
  return <span className="font-mono text-[11px] text-muted-foreground">u/{username}</span>;
}

/** Genre chips link back into the feed, so the rundown filters itself. */
function GenreChips({ genres }: { genres: string[] }) {
  if (genres.length === 0) return null;
  return (
    <ul className="flex flex-wrap items-center gap-1">
      {genres.map((genre) => (
        <li key={genre}>
          <Link
            href={`/feed?genre=${encodeURIComponent(genre)}`}
            className="inline-block rounded border border-border bg-secondary/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:border-highlight/50 hover:text-highlight focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            #{genre}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Meta({ entry }: { entry: FeedEntry }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <EyeIcon className="size-3" aria-hidden />
        {entry.views}
      </span>
      <span className="inline-flex items-center gap-1">
        <ListOrderedIcon className="size-3" aria-hidden />
        {entry.itemCount} {entry.itemCount === 1 ? "title" : "titles"}
      </span>
      <span>/r/{entry.slug}</span>
    </div>
  );
}

/**
 * Stream stays *partially* clickable — title, filmstrip and the footer link —
 * rather than taking the link overlay the other two densities use. It is the
 * density with the most of its own affordances inside it (per-cover art, genre
 * chips, a caption worth selecting), and a card-wide target would swallow them.
 */
function StreamCard({ entry }: { entry: FeedEntry }) {
  return (
    <li className="flex gap-4 rounded-2xl border border-border bg-card/60 p-4 transition-colors hover:border-input sm:p-5">
      <div className="flex shrink-0 flex-col items-center gap-2">
        <VoteButtons slug={entry.slug} initialScore={entry.score} orientation="vertical" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryChip name={entry.category} />
          <MultiGenreBadge genres={entry.genres} />
          <AuthorTag username={entry.authorUsername} />
        </div>

        <Link
          href={`/r/${entry.slug}`}
          className="min-w-0 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <h2 className="font-display leading-tight font-bold tracking-[-0.01em] text-foreground">
            {entry.name}
          </h2>
          {entry.caption && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{entry.caption}</p>
          )}
        </Link>

        <GenreChips genres={entry.genres} />

        <Filmstrip covers={entry.covers} />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Meta entry={entry} />
          <div className="flex items-center gap-1 text-[11px]">
            <Link
              href={`/r/${entry.slug}`}
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-medium text-primary transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              View list
              <ArrowRightIcon className="size-3.5" aria-hidden />
            </Link>
            <CopyLinkButton slug={entry.slug} />
            <ShareRowButton slug={entry.slug} name={entry.name} />
          </div>
        </div>
      </div>
    </li>
  );
}

function CompactRow({ entry }: { entry: FeedEntry }) {
  return (
    <li className="relative flex items-center gap-4 rounded-xl border border-border bg-card/40 px-4 py-3 transition-colors hover:border-input">
      <MediaCover
        src={entry.covers[0]?.coverImage ?? null}
        title={entry.name}
        width={36}
        height={54}
        className="shrink-0 rounded-md"
      />

      <div className="min-w-0 flex-1">
        <Link
          href={`/r/${entry.slug}`}
          className={cn(
            "rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            LINK_OVERLAY,
          )}
        >
          <h2 className="truncate text-sm leading-tight font-semibold text-foreground">
            {entry.name}
          </h2>
        </Link>
        <div className="mt-1 flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
          <span className="truncate">{entry.category}</span>
          {entry.authorUsername && <span className="truncate">u/{entry.authorUsername}</span>}
          <span className="hidden sm:inline">{entry.itemCount} titles</span>
          <span className="hidden sm:inline">{entry.views} views</span>
        </div>
        <div className={cn("mt-2", OVER_LINK_OVERLAY)}>
          <GenreChips genres={entry.genres} />
        </div>
      </div>

      <VoteButtons
        slug={entry.slug}
        initialScore={entry.score}
        className={cn("shrink-0", OVER_LINK_OVERLAY)}
      />
    </li>
  );
}

function GridCard({ entry }: { entry: FeedEntry }) {
  return (
    <li className="relative flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-4 transition-colors hover:border-input">
      <div className="flex flex-wrap items-center gap-2">
        <CategoryChip name={entry.category} />
        <MultiGenreBadge genres={entry.genres} />
      </div>

      <Link
        href={`/r/${entry.slug}`}
        className={cn(
          "rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          LINK_OVERLAY,
        )}
      >
        <h2 className="line-clamp-2 font-display leading-tight font-bold tracking-[-0.01em] text-foreground">
          {entry.name}
        </h2>
      </Link>

      <AuthorTag username={entry.authorUsername} />

      {/*
        The covers overlap into a fanned stack — a deliberately decorative
        treatment, unlike the stream's filmstrip, so it keeps its aria-hidden:
        overlapping art cannot be read in order and the titles are one click away.
        Each is `flex-1` so they share the card's width evenly and grow to fill
        it; the negative margin overlaps them, and `ring-card` draws the seam
        between. The first stays flush with the card's left padding, and the
        flex growth carries the last one out to the right edge, so there is no
        dead space beside the stack whatever the card's width. `basis-0` keeps
        the split even regardless of the covers' intrinsic size.
      */}
      {entry.covers.length > 0 && (
        <ul aria-hidden className="flex">
          {entry.covers.map((cover, index) => (
            <li
              key={`${cover.title}-${index}`}
              className={cn("min-w-0 flex-1 basis-0", index > 0 && "-ml-4")}
              // Later covers sit on top of earlier ones, so the fan reads
              // left-over-right like a spread hand rather than the reverse.
              style={{ zIndex: index }}
            >
              <MediaCover
                src={cover.coverImage}
                title=""
                width={56}
                height={84}
                fluid
                className="rounded-md ring-2 ring-card"
              />
            </li>
          ))}
        </ul>
      )}

      <div className={OVER_LINK_OVERLAY}>
        <GenreChips genres={entry.genres} />
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        <Meta entry={entry} />
        <VoteButtons
          slug={entry.slug}
          initialScore={entry.score}
          className={OVER_LINK_OVERLAY}
        />
      </div>
    </li>
  );
}
