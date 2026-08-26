import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { list, listItem } from "@/db/schema";
import type { CreateListInput } from "@/lib/validators/list";
import {
  MAX_SLUG_ATTEMPTS,
  isSlugCollision,
  newSlug,
  resolveAllItems,
} from "@/server/services/lists/resolve";

export type CreateListResult =
  { ok: true; slug: string } | { ok: false; reason: "resolve_failed" };

/**
 * The create flow's core, independent of HTTP, session, and rate limiting —
 * those are the Hono route's job (`src/server/hono/userLists.ts`), which
 * calls this only once a session and a validated body both exist. Takes a
 * plain `userId` rather than a session object so it can be exercised
 * directly against a real Postgres test user, without needing a real signed
 * session cookie.
 */
export async function createList(
  userId: string,
  input: CreateListInput,
  fetchImpl: typeof fetch = fetch,
): Promise<CreateListResult> {
  // D13 — the server resolves every item itself; nothing from the request's
  // own title/coverImage-shaped fields (there are none, Zod stripped them)
  // ever reaches the row that gets written.
  const resolution = await resolveAllItems(input.items, fetchImpl);
  if (!resolution.ok) {
    return { ok: false, reason: "resolve_failed" };
  }

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const slug = newSlug();
    try {
      await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(list)
          .values({
            slug,
            name: input.name,
            category: input.category,
            caption: input.caption,
            comment: input.comment,
            userId,
            // Publishing happens in the same transaction as the insert (D48).
            // The alternative — create, then a second POST to /publish — can
            // fail between the two and leave a list the author believes is
            // live sitting as a draft. No `coalesce` on publishedAt as in
            // publishList: this row did not exist a moment ago, so this is
            // always the first publish.
            published: input.publish ?? false,
            publishedAt: input.publish ? sql`now()` : null,
          })
          .returning({ id: list.id });

        await tx.insert(listItem).values(
          input.items.map((item, index) => ({
            listId: row!.id,
            position: index,
            provider: item.provider,
            externalId: item.externalId,
            mediaType: item.mediaType,
            title: resolution.resolved[index]!.title,
            coverImage: resolution.resolved[index]!.coverImage,
            // Resolved server-side with the title and cover (D13) — the
            // client's genre list is never trusted, same as everything else here.
            genres: resolution.resolved[index]!.genres,
            scoreRaw: item.scoreRaw ?? null,
            scoreFormat: item.scoreFormat ?? null,
            comment: item.comment,
          })),
        );
      });

      return { ok: true, slug };
    } catch (error) {
      if (isSlugCollision(error) && attempt < MAX_SLUG_ATTEMPTS - 1) continue;
      throw error;
    }
  }

  // Unreachable — the loop above always returns or rethrows.
  throw new Error("Exhausted slug attempts without returning");
}
