import type { TrayItem } from "@/components/ItemTray";
import type { ScoreFormat } from "@/lib/score";
import type { CreateListItem } from "@/lib/validators/list";
import type { MediaType, Provider } from "@/lib/types/media";
import type { ListView } from "@/server/services/lists";

/**
 * Stored items back into tray items.
 *
 * The casts are the database's enums being re-asserted in TypeScript: `provider`,
 * `mediaType` and `scoreFormat` are Postgres enum columns whose values are exactly
 * these unions, but Drizzle hands them back as `string` through `ListView`. Nothing
 * else could be in those columns.
 *
 * `titleNative`, `year` and `averageScore` are null because we never stored them —
 * they are search-result decoration, not part of a list. Nothing is lost by it:
 * `toWireItem` sends only the identity triple, the score pair, and the note.
 */
export function toTrayItems(items: ListView["items"]): TrayItem[] {
  return items.map((item) => ({
    provider: item.provider as Provider,
    externalId: item.externalId,
    mediaType: item.mediaType as MediaType,
    title: item.title,
    titleNative: null,
    coverImage: item.coverImage,
    year: null,
    averageScore: null,
    genres: item.genres,
    scoreRaw: item.scoreRaw,
    scoreFormat: item.scoreFormat as ScoreFormat | null,
    comment: item.comment ?? "",
  }));
}

export function toWireItem(item: TrayItem): CreateListItem {
  return {
    provider: item.provider,
    externalId: item.externalId,
    mediaType: item.mediaType,
    // The pair travels together or not at all (invariant 6). The format is the
    // item's own — POINT_10 for anything typed here, the tracker's own scale
    // for anything imported (D47).
    ...(item.scoreRaw != null && item.scoreFormat != null
      ? { scoreRaw: item.scoreRaw, scoreFormat: item.scoreFormat }
      : {}),
    ...(item.comment ? { comment: item.comment } : {}),
  } as CreateListItem;
}

/**
 * The genre cloud shown while building. A *preview*: it can only aggregate what
 * the client already knows, and a title imported from a tracker list carries no
 * genres until the server resolves it at save time. The list's real cloud is
 * computed server-side from the stored items (D48).
 */
export function previewGenres(items: TrayItem[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const genre of item.genres) {
      const trimmed = genre.trim();
      if (trimmed) counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
