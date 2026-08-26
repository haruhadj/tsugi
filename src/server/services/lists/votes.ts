import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { listVote } from "@/db/schema";

export type ToggleVoteResult = { direction: 1 | -1 | 0 };

/**
 * Upsert-or-remove: same direction re-clicked deletes the vote (un-vote);
 * opposite direction flips it in place; no existing vote inserts one. All
 * three cases run inside one transaction so a concurrent second click from
 * the same user can't race the read-then-write.
 */
export async function toggleVote(
  listId: string,
  userId: string,
  direction: 1 | -1,
): Promise<ToggleVoteResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ direction: listVote.direction })
      .from(listVote)
      .where(and(eq(listVote.listId, listId), eq(listVote.userId, userId)))
      .limit(1);

    if (!existing) {
      await tx.insert(listVote).values({ listId, userId, direction });
      return { direction };
    }

    if (existing.direction === direction) {
      await tx
        .delete(listVote)
        .where(and(eq(listVote.listId, listId), eq(listVote.userId, userId)));
      return { direction: 0 };
    }

    await tx
      .update(listVote)
      .set({ direction })
      .where(and(eq(listVote.listId, listId), eq(listVote.userId, userId)));
    return { direction };
  });
}
