"use client";

import { ArrowDownIcon, ArrowUpIcon, MessageSquareIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MediaCover } from "@/components/MediaCover";
import { ScoreInput } from "@/components/ScoreInput";
import { SourceLink } from "@/components/SourceLink";
import { cn } from "@/lib/utils";
import type { ScoreFormat } from "@/lib/score";
import type { UnifiedMediaResult } from "@/lib/types/media";

const COMMENT_LIMIT = 280;

/**
 * A title in the tray, plus what the author has said about it so far.
 *
 * `scoreFormat` rides along per item rather than being one setting for the whole
 * tray (D47). Anything typed here is `POINT_10`, but a score imported from a
 * tracker keeps the scale it was rated on — an 87/100 from AniList stays 87/100
 * instead of being rounded into a ten-point number the user never chose. Null
 * together with `scoreRaw`, never alone (invariant 6).
 */
export type TrayItem = UnifiedMediaResult & {
  scoreRaw: number | null;
  scoreFormat: ScoreFormat | null;
  comment: string;
};

/** Everything typed in the builder is rated out of ten (D47). */
const TYPED_SCORE_FORMAT: ScoreFormat = "POINT_10";

function moved<T>(items: T[], index: number, offset: -1 | 1): T[] {
  const target = index + offset;
  if (target < 0 || target >= items.length) return items;
  const next = items.slice();
  [next[index], next[target]] = [next[target] as T, next[index] as T];
  return next;
}

export function ItemTray({
  items,
  onChange,
}: {
  items: TrayItem[];
  onChange: (items: TrayItem[]) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center">
        <p className="text-sm font-semibold text-foreground">No titles yet</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
          Use the search above to find anime or manga. Every title you add can carry its own
          score and a note about why it made the list.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item, index) => {
        const key = `${item.provider}-${item.externalId}`;
        const scoreId = `${key}-score`;
        const noteId = `${key}-note`;
        const commentLength = item.comment.length;
        const atLimit = commentLength >= COMMENT_LIMIT;

        const update = (patch: Partial<TrayItem>) => {
          const next = items.slice();
          next[index] = { ...item, ...patch };
          onChange(next);
        };

        return (
          <li key={key} className="rounded-2xl border border-border bg-card/60 p-4">
            <div className="flex items-start gap-3">
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary font-mono text-xs font-bold text-primary"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <MediaCover
                src={item.coverImage}
                title={item.title}
                width={48}
                height={64}
                className="shrink-0 rounded-lg"
              />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  {item.year !== null && (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {item.year}
                    </span>
                  )}
                  <SourceLink
                    provider={item.provider}
                    mediaType={item.mediaType}
                    externalId={item.externalId}
                    className="font-mono text-[11px] text-primary underline-offset-4 hover:underline"
                  />
                </div>
                <p className="text-sm font-bold text-foreground">{item.title}</p>
                {item.titleNative && item.titleNative !== item.title && (
                  <p className="font-mono text-xs text-muted-foreground">{item.titleNative}</p>
                )}
              </div>
            </div>

            {/*
              Grouped into one bordered cluster, as in the prototype. Drag is
              not implemented and is not claimed to be — these buttons are the
              reorder mechanism, and they work from the keyboard (ui-rules.md).
              On its own row (rather than squeezed beside the title) so long
              titles get the card's full width instead of truncating.
            */}
            <div className="mt-3 flex justify-end">
              <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-background p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === 0}
                  aria-label={`Move ${item.title} up`}
                  onClick={() => onChange(moved(items, index, -1))}
                >
                  <ArrowUpIcon aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === items.length - 1}
                  aria-label={`Move ${item.title} down`}
                  onClick={() => onChange(moved(items, index, 1))}
                >
                  <ArrowDownIcon aria-hidden="true" />
                </Button>
                <span className="mx-0.5 h-3 w-px bg-border" aria-hidden="true" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  aria-label={`Remove ${item.title}`}
                  onClick={() => onChange(items.filter((_, i) => i !== index))}
                >
                  <XIcon aria-hidden="true" />
                </Button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-4 border-t border-border pt-3 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor={scoreId}
                  className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase"
                >
                  Your rating
                </Label>
                <ScoreInput
                  id={scoreId}
                  // Imported scores keep their own scale; anything typed here is
                  // out of ten (D47). The control draws itself for whichever
                  // this item already carries.
                  scoreFormat={item.scoreFormat ?? TYPED_SCORE_FORMAT}
                  value={item.scoreRaw}
                  onChange={(value) =>
                    update({
                      scoreRaw: value,
                      // The pair moves together (invariant 6): clearing a score
                      // clears its format, and setting one on an item that has
                      // never been scored stamps it as a typed ten-point score.
                      scoreFormat:
                        value === null ? null : (item.scoreFormat ?? TYPED_SCORE_FORMAT),
                    })
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor={noteId}
                    className="flex items-center gap-1 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase"
                  >
                    <MessageSquareIcon className="size-3 text-primary" aria-hidden="true" />
                    Note
                  </Label>
                  <span
                    className={cn(
                      "font-mono text-[10px]",
                      atLimit ? "font-bold text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {commentLength}/{COMMENT_LIMIT}
                  </span>
                </div>
                <Textarea
                  id={noteId}
                  rows={2}
                  maxLength={COMMENT_LIMIT}
                  value={item.comment}
                  placeholder="Why is this one on the list?"
                  className="resize-none text-xs"
                  onChange={(event) => update({ comment: event.target.value })}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
