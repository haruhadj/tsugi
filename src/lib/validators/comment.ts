import { z } from "zod";

/**
 * Discussion comments on a published list (D44).
 *
 * 280 characters is invariant 7's cap, enforced here, in the `varchar(280)` column,
 * and in the composer's counter — all three, every time.
 *
 * `.trim()` runs before the length checks, so a body of only whitespace fails `min(1)`
 * rather than storing as a blank comment.
 */
export const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(280),
  /** Names the comment being replied to. Threading is one level deep; the service
   *  rejects a parent that is itself a reply, which the schema cannot express. */
  parentId: z.uuid().optional(),
  /** The commenter's pick from the list, as that item's public `position`
   *  (0-based, matching createList) — never a database id, per invariant 1. */
  favoritePosition: z.number().int().min(0).optional(),
});

export const voteCommentSchema = z.object({
  direction: z.union([z.literal(1), z.literal(-1)]),
});

export const COMMENT_SORTS = ["top", "new", "old"] as const;
export type CommentSort = (typeof COMMENT_SORTS)[number];

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
