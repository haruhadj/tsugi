import { describe, expect, test } from "bun:test";

// Live-database tier (D22) — gated on a plain `if`, not describe.skip, because
// registering the block at all would run the "server-only" import that "@/db"
// pulls in (see auth.db.test.ts for the full reasoning).
const hasDb = Boolean(process.env.DATABASE_URL);

// Each test drives several sequential round-trips (fixture setup, the call under
// test, teardown) against a remote pooler, which comfortably exceeds Bun's 5s
// default. This is latency, not slowness worth chasing.
const TIMEOUT_MS = 30_000;

if (hasDb) {
  describe("comments (live Supabase)", () => {
    /**
     * Each test builds its own user + list and tears them down afterwards, so the
     * suite can run repeatedly against a shared database without colliding. The
     * list cascade removes its own comments and votes.
     */
    async function withFixture(
      run: (ctx: {
        userId: string;
        otherUserId: string;
        slug: string;
        listId: string;
      }) => Promise<void>,
    ) {
      const { db } = await import("@/db");
      const { list, listItem } = await import("@/db/schema");
      const { user } = await import("@/db/auth-schema");
      const { eq } = await import("drizzle-orm");

      const stamp = Date.now() + Math.floor(Math.random() * 1000);
      const userId = `test-author-${stamp}`;
      const otherUserId = `test-other-${stamp}`;
      const slug = `t${stamp}`.slice(0, 12);

      await db.insert(user).values([
        {
          id: userId,
          name: "Author",
          email: `author-${stamp}@example.test`,
          emailVerified: false,
          username: `author${stamp}`.slice(0, 20),
        },
        {
          id: otherUserId,
          name: "Other",
          email: `other-${stamp}@example.test`,
          emailVerified: false,
          username: `other${stamp}`.slice(0, 20),
        },
      ]);

      const [created] = await db
        .insert(list)
        .values({ slug, name: "Test", userId, published: true })
        .returning({ id: list.id });

      const listId = created!.id;

      await db.insert(listItem).values([
        {
          listId,
          position: 0,
          provider: "anilist",
          externalId: 1,
          mediaType: "anime",
          title: "First Title",
        },
        {
          listId,
          position: 1,
          provider: "anilist",
          externalId: 2,
          mediaType: "anime",
          title: "Second Title",
        },
      ]);

      try {
        await run({ userId, otherUserId, slug, listId });
      } finally {
        await db.delete(list).where(eq(list.id, listId));
        await db.delete(user).where(eq(user.id, userId));
        await db.delete(user).where(eq(user.id, otherUserId));
      }
    }

    test("a comment round-trips, and its author is flagged as the curator", async () => {
      const { createComment, listComments } = await import("./comments");

      await withFixture(async ({ userId, otherUserId, slug }) => {
        const created = await createComment(slug, userId, { content: "Curator here" });
        expect(created.status).toBe("created");

        await createComment(slug, otherUserId, { content: "Just a reader" });

        const comments = await listComments(slug, userId, "old");
        expect(comments).not.toBeNull();
        expect(comments!.length).toBe(2);

        // The list's owner gets the badge; anyone else does not.
        expect(comments![0]!.isCurator).toBe(true);
        expect(comments![1]!.isCurator).toBe(false);

        // The viewer sees their own comment as theirs, and the other as not.
        expect(comments![0]!.viewerIsAuthor).toBe(true);
        expect(comments![1]!.viewerIsAuthor).toBe(false);
      });
    }, TIMEOUT_MS);

    test("threading stops at one level — a reply cannot be replied to", async () => {
      const { createComment } = await import("./comments");

      await withFixture(async ({ userId, slug }) => {
        const root = await createComment(slug, userId, { content: "root" });
        expect(root.status).toBe("created");
        const rootId = root.status === "created" ? root.id : "";

        const reply = await createComment(slug, userId, {
          content: "reply",
          parentId: rootId,
        });
        expect(reply.status).toBe("created");
        const replyId = reply.status === "created" ? reply.id : "";

        const nested = await createComment(slug, userId, {
          content: "reply to a reply",
          parentId: replyId,
        });
        expect(nested.status).toBe("invalid_parent");
      });
    }, TIMEOUT_MS);

    test("deleting a parent takes its replies with it", async () => {
      const { createComment, deleteComment, listComments } = await import("./comments");

      await withFixture(async ({ userId, slug }) => {
        const root = await createComment(slug, userId, { content: "root" });
        const rootId = root.status === "created" ? root.id : "";
        await createComment(slug, userId, { content: "reply", parentId: rootId });

        const before = await listComments(slug, userId, "old");
        expect(before![0]!.replies.length).toBe(1);

        expect(await deleteComment(rootId, userId)).toBe("deleted");

        const after = await listComments(slug, userId, "old");
        expect(after!.length).toBe(0);
      });
    }, TIMEOUT_MS);

    test("only the author can delete their comment", async () => {
      const { createComment, deleteComment } = await import("./comments");

      await withFixture(async ({ userId, otherUserId, slug }) => {
        const created = await createComment(slug, userId, { content: "mine" });
        const id = created.status === "created" ? created.id : "";

        expect(await deleteComment(id, otherUserId)).toBe("forbidden");
        expect(await deleteComment(id, userId)).toBe("deleted");
        expect(await deleteComment(id, userId)).toBe("not_found");
      });
    }, TIMEOUT_MS);

    test("a favourite pick resolves to its title, and an off-list position is rejected", async () => {
      const { createComment, listComments } = await import("./comments");

      await withFixture(async ({ userId, slug }) => {
        const ok = await createComment(slug, userId, {
          content: "loved this one",
          favoritePosition: 1,
        });
        expect(ok.status).toBe("created");

        const comments = await listComments(slug, userId, "old");
        expect(comments![0]!.favoriteTitle).toBe("Second Title");

        // Position 9 is not on this list.
        const bad = await createComment(slug, userId, {
          content: "nope",
          favoritePosition: 9,
        });
        expect(bad.status).toBe("invalid_item");
      });
    }, TIMEOUT_MS);

    test("voting toggles: same direction un-votes, opposite flips", async () => {
      const { createComment, listComments, toggleCommentVote } = await import("./comments");

      await withFixture(async ({ userId, otherUserId, slug }) => {
        const created = await createComment(slug, userId, { content: "vote on me" });
        const id = created.status === "created" ? created.id : "";

        expect(await toggleCommentVote(id, otherUserId, 1)).toEqual({
          status: "ok",
          direction: 1,
        });

        let comments = await listComments(slug, otherUserId, "top");
        expect(comments![0]!.score).toBe(1);
        expect(comments![0]!.viewerVote).toBe(1);

        // Opposite direction flips rather than stacking.
        expect(await toggleCommentVote(id, otherUserId, -1)).toEqual({
          status: "ok",
          direction: -1,
        });
        comments = await listComments(slug, otherUserId, "top");
        expect(comments![0]!.score).toBe(-1);

        // Same direction again removes the vote entirely.
        expect(await toggleCommentVote(id, otherUserId, -1)).toEqual({
          status: "ok",
          direction: 0,
        });
        comments = await listComments(slug, otherUserId, "top");
        expect(comments![0]!.score).toBe(0);
        expect(comments![0]!.viewerVote).toBe(0);
      });
    }, TIMEOUT_MS);

    test("a signed-out reader sees the comments but no vote or authorship state", async () => {
      const { createComment, listComments } = await import("./comments");

      await withFixture(async ({ userId, slug }) => {
        await createComment(slug, userId, { content: "public" });

        const comments = await listComments(slug, null, "top");
        expect(comments!.length).toBe(1);
        expect(comments![0]!.viewerVote).toBe(0);
        expect(comments![0]!.viewerIsAuthor).toBe(false);
      });
    }, TIMEOUT_MS);

    test("an unpublished list hides its discussion from everyone but its owner", async () => {
      const { db } = await import("@/db");
      const { list } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");
      const { createComment, listComments } = await import("./comments");

      await withFixture(async ({ userId, otherUserId, slug, listId }) => {
        await db.update(list).set({ published: false }).where(eq(list.id, listId));

        expect(await listComments(slug, otherUserId, "top")).toBeNull();
        expect(await listComments(slug, null, "top")).toBeNull();
        expect(await listComments(slug, userId, "top")).not.toBeNull();

        const blocked = await createComment(slug, otherUserId, { content: "sneaking in" });
        expect(blocked.status).toBe("not_found");
      });
    }, TIMEOUT_MS);
  });
}
