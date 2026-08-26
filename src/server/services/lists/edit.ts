import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { list, listItem } from "@/db/schema";
import type { EditListInput } from "@/lib/validators/list";
import { itemColumns } from "@/server/services/lists/read";
import { resolveAllItems } from "@/server/services/lists/resolve";

/**
 * Identity of a stored item, per invariant 2 — the triple, never the id alone.
 * Used to decide which items in an edit are already resolved and which are new.
 */
function itemKey(item: { provider: string; mediaType: string; externalId: number }): string {
  return `${item.provider}:${item.mediaType}:${item.externalId}`;
}

export type EditListResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "resolve_failed" };

/**
 * A full owner-checked edit of an existing list (**D59**) — metadata plus the
 * whole item set, including additions, removals, reordering, and score/note
 * changes. Replaced the metadata-only `updateList` (name + category, D48).
 *
 * Two things worth knowing before changing this:
 *
 * **Only genuinely new titles are re-resolved.** An item already stored under
 * the same `(provider, mediaType, externalId)` keeps its resolved title, cover
 * and genres rather than being fetched again — reordering a list or fixing a
 * typo in a note must not be able to fail because AniList is down, and a second
 * resolution of the same id yields the same answer anyway. D13 still holds for
 * the items that *are* new: nothing title-shaped from the request is trusted.
 *
 * **The item set is replaced, not merged.** Delete-then-insert inside one
 * transaction, rather than diffing: `position_per_list` is a unique constraint,
 * so shuffling positions in place would collide mid-update against rows that
 * have not moved yet. The delete clears the field first.
 *
 * The ownership check folds `userId` into the lookup and answers `not_found`
 * for someone else's list, matching `updateList` before it — PHASE-8.md's
 * 403-not-404 criterion is specific to delete.
 */
export async function editList(
  slug: string,
  userId: string,
  input: EditListInput,
  fetchImpl: typeof fetch = fetch,
): Promise<EditListResult> {
  const [existing] = await db
    .select({ id: list.id })
    .from(list)
    .where(and(eq(list.slug, slug), eq(list.userId, userId)))
    .limit(1);

  if (!existing) return { ok: false, reason: "not_found" };

  const storedItems = await db
    .select(itemColumns)
    .from(listItem)
    .where(eq(listItem.listId, existing.id));

  type Resolved = { title: string; coverImage: string | null; genres: string[] };
  const resolvedByKey = new Map<string, Resolved>(
    storedItems.map((item) => [
      itemKey(item),
      { title: item.title, coverImage: item.coverImage, genres: item.genres },
    ]),
  );

  const newItems = input.items.filter((item) => !resolvedByKey.has(itemKey(item)));
  if (newItems.length > 0) {
    const resolution = await resolveAllItems(newItems, fetchImpl);
    if (!resolution.ok) return { ok: false, reason: "resolve_failed" };
    newItems.forEach((item, index) => {
      const resolved = resolution.resolved[index]!;
      resolvedByKey.set(itemKey(item), {
        title: resolved.title,
        coverImage: resolved.coverImage,
        genres: resolved.genres,
      });
    });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(list)
      .set({
        name: input.name,
        category: input.category,
        // `?? null`, not a spread-if-present: an edit is a whole-list
        // replacement, so an absent caption means the author cleared it.
        caption: input.caption ?? null,
        comment: input.comment ?? null,
      })
      .where(eq(list.id, existing.id));

    await tx.delete(listItem).where(eq(listItem.listId, existing.id));

    await tx.insert(listItem).values(
      input.items.map((item, index) => {
        const resolved = resolvedByKey.get(itemKey(item))!;
        return {
          listId: existing.id,
          position: index,
          provider: item.provider,
          externalId: item.externalId,
          mediaType: item.mediaType,
          title: resolved.title,
          coverImage: resolved.coverImage,
          genres: resolved.genres,
          scoreRaw: item.scoreRaw ?? null,
          scoreFormat: item.scoreFormat ?? null,
          comment: item.comment ?? null,
        };
      }),
    );
  });

  return { ok: true };
}
