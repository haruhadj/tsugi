import { SparklesIcon } from "lucide-react";
import Link from "next/link";
import { EyeIcon, ListOrderedIcon } from "lucide-react";
import type { FeedEntry } from "@/server/services/lists";

/** Fewer than three genres describes a theme; three or more describes a range. */
const MULTI_GENRE_THRESHOLD = 3;

export function MultiGenreBadge({ genres }: { genres: string[] }) {
  if (genres.length < MULTI_GENRE_THRESHOLD) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-highlight/30 bg-highlight/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-highlight">
      <SparklesIcon className="size-3" aria-hidden />
      Multi-genre
    </span>
  );
}

export function CategoryChip({ name }: { name: string }) {
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
export function AuthorTag({ username }: { username: string | null }) {
  if (!username) return null;
  return (
    <span className="font-mono text-[11px] text-muted-foreground">
      u/{username}
    </span>
  );
}

/** Genre chips link back into the feed, so the rundown filters itself. */
export function GenreChips({ genres }: { genres: string[] }) {
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

export function Meta({ entry }: { entry: FeedEntry }) {
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
    </div>
  );
}
