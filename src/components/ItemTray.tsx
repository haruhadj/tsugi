"use client";

import { ArrowDownIcon, ArrowUpIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaCover } from "@/components/MediaCover";
import { ScoreInput } from "@/components/ScoreInput";
import type { ScoreFormat } from "@/lib/score";
import type { UnifiedMediaResult } from "@/lib/types/media";

export const MAX_ITEMS = 10;

export type TrayItem = UnifiedMediaResult & {
  scoreRaw: number | null;
  comment: string;
};

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
  scoreFormat,
}: {
  items: TrayItem[];
  onChange: (items: TrayItem[]) => void;
  scoreFormat: ScoreFormat;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        Items ({items.length}/{MAX_ITEMS})
      </h3>
      <ul className="flex flex-col gap-3">
        {items.map((item, index) => {
          const key = `${item.provider}-${item.externalId}`;
          const scoreId = `${key}-score`;
          const noteId = `${key}-note`;
          return (
            <li
              key={key}
              className="flex flex-col gap-3 rounded-md border border-input p-3 sm:flex-row sm:items-start"
            >
              <MediaCover src={item.coverImage} title={item.title} width={56} height={80} />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <ScoreInput
                  id={scoreId}
                  scoreFormat={scoreFormat}
                  value={item.scoreRaw}
                  onChange={(value) => {
                    const next = items.slice();
                    next[index] = { ...item, scoreRaw: value };
                    onChange(next);
                  }}
                />
                <div className="flex flex-col gap-1">
                  <Label htmlFor={noteId} className="sr-only">
                    Note for {item.title}
                  </Label>
                  <Input
                    id={noteId}
                    value={item.comment}
                    maxLength={280}
                    placeholder="Note (optional)"
                    onChange={(e) => {
                      const next = items.slice();
                      next[index] = { ...item, comment: e.target.value };
                      onChange(next);
                    }}
                  />
                </div>
              </div>
              <div className="flex flex-row gap-1 sm:flex-col">
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${item.title}`}
                  onClick={() => onChange(items.filter((_, i) => i !== index))}
                >
                  <XIcon aria-hidden="true" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function canAddItem(items: TrayItem[]): boolean {
  return items.length < MAX_ITEMS;
}
