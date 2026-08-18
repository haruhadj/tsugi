import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { list, listComment, listCommentVote, listItem } from "@/db/schema";
import { user } from "@/db/auth-schema";
import type { WireComment } from "@/lib/types/comment";
import type { CreateCommentInput, CommentSort } from "@/lib/validators/comment";

export type CommentView = {
  id: string;
  content: string;
  createdAt: Date;
  authorUsername: string;
  /** True when the commenter is the list's owner — the "Curator" badge. */
  isCurator: boolean;
  /** The title of the item this comment picked out, if any. */
  favoriteTitle: string | null;
  score: number;
  /** The viewer's own vote, or 0 when they have none / are signed out. */
  viewerVote: 1 | -1 | 0;
  /** True when the viewer wrote it, which is what reveals the delete control. */
  viewerIsAuthor: boolean;
  replies: CommentView[];
};

export type CreateCommentResult =
  | { status: "created"; id: string }
  | { status: "not_found" }
  | { status: "invalid_parent" }
  | { status: "invalid_item" };

/**
 * The list a comment can be attached to: published, or a draft the author is looking
 * at. Mirrors getListBySlug's visibility rule so a comment can never exist on a list
 * the commenter could not have read.
 */
async function findVisibleList(slug: string, viewerId: string | null) {
  const [row] = await db
    .select({ id: list.id, userId: list.userId, published: list.published })
    .from(list)
    .where(eq(list.slug, slug))
    .limit(1);

  if (!row) return null;
  if (!row.published && row.userId !== viewerId) return null;
  return row;
}

export async function createComment(
  slug: string,
  authorId: string,
  input: CreateCommentInput,
): Promise<CreateCommentResult> {
  const target = await findVisibleList(slug, authorId);
  if (!target) return { status: "not_found" };

  if (input.parentId) {
    const [parent] = await db
      .select({ id: listComment.id, listId: listComment.listId, parentId: listComment.parentId })
      .from(listComment)
      .where(eq(listComment.id, input.parentId))
      .limit(1);

    // Threading is one level deep, and a reply must stay on the list it belongs to —
    // without the listId check, a parentId from another list would graft this comment
    // onto a thread its readers cannot see.
    if (!parent || parent.listId !== target.id || parent.parentId !== null) {
      return { status: "invalid_parent" };
    }
  }

  if (input.favoritePosition !== undefined) {
    const [item] = await db
      .select({ position: listItem.position })
      .from(listItem)
      .where(
        and(eq(listItem.listId, target.id), eq(listItem.position, input.favoritePosition)),
      )
      .limit(1);

    if (!item) return { status: "invalid_item" };
  }

  const [created] = await db
    .insert(listComment)
    .values({
      listId: target.id,
      authorId,
      content: input.content,
      parentId: input.parentId ?? null,
      favoritePosition: input.favoritePosition ?? null,
    })
    .returning({ id: listComment.id });

  // `returning` on a single-row insert always yields that row; the guard exists only
  // to satisfy noUncheckedIndexedAccess.
  if (!created) return { status: "not_found" };
  return { status: "created", id: created.id };
}

/**
 * Every comment on a list, nested one level. Reads in a single query and assembles the
 * tree in memory — the depth is capped at one by createComment, so there is nothing
 * recursive to walk and no N+1 to avoid.
 *
 * `viewerId` is null for signed-out readers, who see the same comments with no vote
 * state and no delete controls (invariant 9: viewing never requires a session).
 */
export async function listComments(
  slug: string,
  viewerId: string | null,
  sort: CommentSort,
): Promise<CommentView[] | null> {
  const target = await findVisibleList(slug, viewerId);
  if (!target) return null;

  const scoreExpr = sql<number>`(
    select coalesce(sum(${listCommentVote.direction}), 0)::int
    from ${listCommentVote} where ${listCommentVote.commentId} = ${listComment.id}
  )`;

  const rows = await db
    .select({
      id: listComment.id,
      content: listComment.content,
      createdAt: listComment.createdAt,
      parentId: listComment.parentId,
      authorId: listComment.authorId,
      authorUsername: user.username,
      authorName: user.name,
      favoriteTitle: listItem.title,
      score: scoreExpr,
    })
    .from(listComment)
    .innerJoin(user, eq(user.id, listComment.authorId))
    // Both halves are needed: position is only unique *within* a list, so joining on
    // position alone would match same-numbered items on every other list.
    .leftJoin(
      listItem,
      and(
        eq(listItem.listId, listComment.listId),
        eq(listItem.position, listComment.favoritePosition),
      ),
    )
    .where(eq(listComment.listId, target.id))
    .orderBy(asc(listComment.createdAt));

  if (rows.length === 0) return [];

  // The viewer's own votes, fetched once for the whole page rather than joined per
  // row — the join would need viewerId in the ON clause and still return null for
  // signed-out readers.
  const viewerVotes = new Map<string, 1 | -1>();
  if (viewerId) {
    const votes = await db
      .select({ commentId: listCommentVote.commentId, direction: listCommentVote.direction })
      .from(listCommentVote)
      .where(
        and(
          eq(listCommentVote.userId, viewerId),
          inArray(
            listCommentVote.commentId,
            rows.map((row) => row.id),
          ),
        ),
      );
    for (const vote of votes) {
      viewerVotes.set(vote.commentId, vote.direction === 1 ? 1 : -1);
    }
  }

  const toView = (row: (typeof rows)[number]): CommentView => ({
    id: row.id,
    content: row.content,
    createdAt: row.createdAt,
    // `username` is nullable until a user sets one; `name` comes from the OAuth
    // profile and is always present, so it is the fallback rather than "anonymous".
    authorUsername: row.authorUsername ?? row.authorName,
    isCurator: row.authorId === target.userId,
    favoriteTitle: row.favoriteTitle,
    score: row.score,
    viewerVote: viewerVotes.get(row.id) ?? 0,
    viewerIsAuthor: viewerId !== null && row.authorId === viewerId,
    replies: [],
  });

  const roots: CommentView[] = [];
  const byId = new Map<string, CommentView>();

  // Two passes: every comment becomes a view first, so a reply can always find its
  // parent regardless of the order rows came back in.
  for (const row of rows) {
    byId.set(row.id, toView(row));
  }
  for (const row of rows) {
    const view = byId.get(row.id);
    if (!view) continue;
    const parent = row.parentId ? byId.get(row.parentId) : undefined;
    if (parent) {
      parent.replies.push(view);
    } else {
      roots.push(view);
    }
  }

  // Only the roots reorder. Replies stay oldest-first in every mode, because a thread
  // read out of chronological order stops making sense as a conversation.
  if (sort === "top") {
    roots.sort((a, b) => b.score - a.score || b.createdAt.getTime() - a.createdAt.getTime());
  } else if (sort === "new") {
    roots.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } else {
    roots.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  return roots;
}

export type DeleteCommentResult = "deleted" | "not_found" | "forbidden";

/**
 * Author-only delete. Replies are removed explicitly rather than by cascade (see the
 * schema comment on `parentId`), in the same transaction as the parent so a thread
 * can never be left half-deleted.
 */
export async function deleteComment(
  commentId: string,
  userId: string,
): Promise<DeleteCommentResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: listComment.id, authorId: listComment.authorId })
      .from(listComment)
      .where(eq(listComment.id, commentId))
      .limit(1);

    if (!existing) return "not_found";
    if (existing.authorId !== userId) return "forbidden";

    await tx.delete(listComment).where(eq(listComment.parentId, commentId));
    await tx.delete(listComment).where(eq(listComment.id, commentId));
    return "deleted";
  });
}

export type ToggleCommentVoteResult =
  | { status: "ok"; direction: 1 | -1 | 0 }
  | { status: "not_found" };

/** Same contract as toggleVote on lists: re-clicking un-votes, opposite flips. */
export async function toggleCommentVote(
  commentId: string,
  userId: string,
  direction: 1 | -1,
): Promise<ToggleCommentVoteResult> {
  return db.transaction(async (tx) => {
    const [comment] = await tx
      .select({ id: listComment.id })
      .from(listComment)
      .where(eq(listComment.id, commentId))
      .limit(1);

    if (!comment) return { status: "not_found" };

    const where = and(
      eq(listCommentVote.commentId, commentId),
      eq(listCommentVote.userId, userId),
    );

    const [existing] = await tx
      .select({ direction: listCommentVote.direction })
      .from(listCommentVote)
      .where(where)
      .limit(1);

    if (!existing) {
      await tx.insert(listCommentVote).values({ commentId, userId, direction });
      return { status: "ok", direction };
    }

    if (existing.direction === direction) {
      await tx.delete(listCommentVote).where(where);
      return { status: "ok", direction: 0 };
    }

    await tx.update(listCommentVote).set({ direction }).where(where);
    return { status: "ok", direction };
  });
}

/**
 * Maps service rows to the shape the client works with — Dates become ISO strings so
 * the server-rendered first paint and the JSON refresh path agree. Lives here rather
 * than beside the component because a "use client" module's functions cannot be
 * called from the server.
 */
export function toWireComments(comments: CommentView[]): WireComment[] {
  return comments.map((comment) => ({
    ...comment,
    createdAt: comment.createdAt.toISOString(),
    replies: toWireComments(comment.replies),
  }));
}
