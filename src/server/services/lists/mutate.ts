import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { list, listItem } from "@/db/schema";
import { itemColumns } from "@/server/services/lists/read";
import { MAX_SLUG_ATTEMPTS, isSlugCollision, newSlug } from "@/server/services/lists/resolve";

export type PublishListResult = "updated" | "not_found";

/**
 * `publishedAt` is set only on the transition into published — re-publishing
 * an already-published list, or unpublishing, never touches it, so a list's
 * first-publish timestamp survives repeated publish/unpublish cycles.
 */
export async function publishList(slug: string, userId: string): Promise<PublishListResult> {
  const result = await db
    .update(list)
    .set({
      published: true,
      publishedAt: sql`coalesce(${list.publishedAt}, now())`,
    })
    .where(and(eq(list.slug, slug), eq(list.userId, userId)))
    .returning({ id: list.id });

  return result.length > 0 ? "updated" : "not_found";
}

export async function unpublishList(slug: string, userId: string): Promise<PublishListResult> {
  const result = await db
    .update(list)
    .set({ published: false })
    .where(and(eq(list.slug, slug), eq(list.userId, userId)))
    .returning({ id: list.id });

  return result.length > 0 ? "updated" : "not_found";
}

export type DeleteListResult = "deleted" | "not_found" | "forbidden";

/**
 * PHASE-8.md: "deleting is immediate and total" — the DB's own
 * `onDelete: "cascade"` on `listItem.listId` (and `listVote.listId`) removes
 * the items and votes, so this is a single statement. The ownership check is
 * a separate read rather than folding `userId` into the delete's WHERE
 * clause, so a slug that exists but belongs to someone else can be told
 * apart from a slug that never existed (criterion 6: 403 vs 404).
 */
export async function deleteList(slug: string, userId: string): Promise<DeleteListResult> {
  const [existing] = await db
    .select({ userId: list.userId })
    .from(list)
    .where(eq(list.slug, slug))
    .limit(1);

  if (!existing) return "not_found";
  if (existing.userId !== userId) return "forbidden";

  await db.delete(list).where(and(eq(list.slug, slug), eq(list.userId, userId)));

  return "deleted";
}

export type DuplicateListResult =
  { status: "duplicated"; slug: string } | { status: "not_found" } | { status: "forbidden" };

/**
 * Clones a list and its items as a fresh draft owned by the same user.
 *
 * The copy always starts unpublished with its counters reset: views and votes belong
 * to the original's history, and silently carrying them over would let anyone mint a
 * list that looks popular by duplicating one that is. Items are copied straight from
 * the stored rows rather than re-resolved against the providers — they were resolved
 * server-side when the original was created, so a second round of network calls would
 * add failure modes for no new information.
 */
export async function duplicateList(
  slug: string,
  userId: string,
): Promise<DuplicateListResult> {
  const [existing] = await db
    .select({
      id: list.id,
      userId: list.userId,
      name: list.name,
      category: list.category,
      caption: list.caption,
      comment: list.comment,
    })
    .from(list)
    .where(eq(list.slug, slug))
    .limit(1);

  if (!existing) return { status: "not_found" };
  if (existing.userId !== userId) return { status: "forbidden" };

  const sourceItems = await db
    .select(itemColumns)
    .from(listItem)
    .where(eq(listItem.listId, existing.id))
    .orderBy(listItem.position);

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const newSlugValue = newSlug();
    try {
      await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(list)
          .values({
            slug: newSlugValue,
            name: existing.name,
            category: existing.category,
            caption: existing.caption,
            comment: existing.comment,
            userId,
          })
          .returning({ id: list.id });

        if (sourceItems.length > 0) {
          await tx
            .insert(listItem)
            .values(sourceItems.map((item) => ({ ...item, listId: created!.id })));
        }
      });

      return { status: "duplicated", slug: newSlugValue };
    } catch (error) {
      if (isSlugCollision(error) && attempt < MAX_SLUG_ATTEMPTS - 1) continue;
      throw error;
    }
  }

  // Unreachable — the loop above always returns or rethrows.
  throw new Error("Exhausted slug attempts without returning");
}
