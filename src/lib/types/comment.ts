/**
 * A comment as it crosses to the client — from the server component's props on first
 * paint, and from `GET /api/lists/:slug/comments` on every refresh after.
 *
 * `createdAt` is an ISO string rather than a Date because the refresh path goes
 * through JSON. Both paths produce this exact shape (the server maps its rows with
 * `toWireComments`) so the component never has to ask which one it got.
 *
 * Nothing here is a database id except the comment's own — invariant 1.
 */
export type WireComment = {
  id: string;
  content: string;
  createdAt: string;
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
  replies: WireComment[];
};
