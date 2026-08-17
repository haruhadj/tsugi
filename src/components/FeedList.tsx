"use client";

import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  LayoutGridIcon,
  LayoutListIcon,
  ListOrderedIcon,
  Rows3Icon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { MediaCover } from "@/components/MediaCover";
import { VoteButtons } from "@/components/VoteButtons";
import type { FeedEntry } from "@/server/services/lists";
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
 */
export function FeedList({ entries, firstSlot }: { entries: FeedEntry[]; firstSlot: number }) {
  const [density, setDensity] = useState<Density>("stream");

  return (
    <div>
      <div className="mb-5 flex items-center justify-end">
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

      {density === "grid" ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {entries.map((entry, index) => (
            <GridCard key={entry.slug} entry={entry} slot={firstSlot + index} />
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry, index) =>
            density === "stream" ? (
              <StreamCard key={entry.slug} entry={entry} slot={firstSlot + index} />
            ) : (
              <CompactRow key={entry.slug} entry={entry} slot={firstSlot + index} />
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

function CategoryChip({ name }: { name: string }) {
  return (
    <span className="rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
      {name}
    </span>
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

function StreamCard({ entry, slot }: { entry: FeedEntry; slot: number }) {
  return (
    <li className="flex gap-4 rounded-2xl border border-border bg-card/60 p-4 transition-colors hover:border-input sm:p-5">
      <div className="flex shrink-0 flex-col items-center gap-2">
        <VoteButtons slug={entry.slug} initialScore={entry.score} orientation="vertical" />
        <span aria-hidden className="font-mono text-[11px] tabular-nums text-muted-foreground/50">
          {String(slot).padStart(2, "0")}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryChip name={entry.name} />
        </div>

        <Link
          href={`/r/${entry.slug}`}
          className="min-w-0 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <h2 className="font-display leading-tight font-bold tracking-[-0.01em] text-foreground">
            {entry.caption ?? entry.name}
          </h2>
        </Link>

        {/*
          Decorative: the covers repeat a list this row already names and links, and
          FeedEntry carries no per-title text to caption them with. Hidden rather than
          given invented alt like "Title 3", which would be noise to a screen reader.
        */}
        {entry.covers.length > 0 && (
          <ul aria-hidden className="flex gap-2 overflow-x-auto pb-1">
            {entry.covers.map((cover, index) => (
              <li key={index} className="relative shrink-0">
                <MediaCover src={cover} title="" width={56} height={84} className="rounded-md" />
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Meta entry={entry} />
          <div className="flex items-center gap-1 text-[11px]">
            <CopyLinkButton slug={entry.slug} />
          </div>
        </div>
      </div>
    </li>
  );
}

function CompactRow({ entry, slot }: { entry: FeedEntry; slot: number }) {
  return (
    <li className="flex items-center gap-4 rounded-xl border border-border bg-card/40 px-4 py-3 transition-colors hover:border-input">
      <span
        aria-hidden
        className="w-6 shrink-0 font-mono text-sm font-bold tabular-nums text-muted-foreground/50"
      >
        {String(slot).padStart(2, "0")}
      </span>

      <MediaCover
        src={entry.covers[0] ?? null}
        title={entry.caption ?? entry.name}
        width={36}
        height={54}
        className="shrink-0 rounded-md"
      />

      <Link
        href={`/r/${entry.slug}`}
        className="min-w-0 flex-1 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <h2 className="truncate text-sm leading-tight font-semibold text-foreground">
          {entry.caption ?? entry.name}
        </h2>
        <div className="mt-1 flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
          <span>{entry.name}</span>
          <span>{entry.itemCount} titles</span>
          <span>{entry.views} views</span>
        </div>
      </Link>

      <VoteButtons slug={entry.slug} initialScore={entry.score} className="shrink-0" />
    </li>
  );
}

function GridCard({ entry, slot }: { entry: FeedEntry; slot: number }) {
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-4 transition-colors hover:border-input">
      <div className="flex items-center justify-between gap-2">
        <CategoryChip name={entry.name} />
        <span aria-hidden className="font-mono text-[11px] tabular-nums text-muted-foreground/50">
          {String(slot).padStart(2, "0")}
        </span>
      </div>

      <Link
        href={`/r/${entry.slug}`}
        className="rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <h2 className="line-clamp-2 font-display leading-tight font-bold tracking-[-0.01em] text-foreground">
          {entry.caption ?? entry.name}
        </h2>
      </Link>

      {/*
        The covers overlap into a fanned stack. Negative margin on every cover but the
        first, so the leftmost stays flush with the card's padding.
      */}
      {entry.covers.length > 0 && (
        <ul aria-hidden className="flex">
          {entry.covers.map((cover, index) => (
            <li key={index} className={cn("shrink-0", index > 0 && "-ml-6")}>
              <MediaCover
                src={cover}
                title=""
                width={56}
                height={84}
                className="rounded-md ring-2 ring-card"
              />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex items-center justify-between gap-2">
        <Meta entry={entry} />
        <VoteButtons slug={entry.slug} initialScore={entry.score} />
      </div>
    </li>
  );
}
