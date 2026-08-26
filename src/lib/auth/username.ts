import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/auth-schema";

// Derives the one-time default username from the OAuth provider's display
// name (Phase B, D42) — slugified to the `username_format` CHECK charset
// (^[a-zA-Z0-9_]{3,20}$), with a numeric suffix on collision. Only ever
// called from databaseHooks.user.create.before, i.e. exactly once per user;
// later sign-ins never touch `username` again (overrideUserInfo only
// re-syncs name/image/scoreFormat).
export async function deriveDefaultUsername(displayName: string, userId: string): Promise<string> {
  const slug = displayName
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);

  const base = slug.length >= 3 ? slug : `user_${userId}`.slice(0, 20);

  for (let attempt = 0; attempt < 50; attempt++) {
    const suffix = attempt === 0 ? "" : `_${attempt + 1}`;
    const candidate = (suffix ? base.slice(0, 20 - suffix.length) : base) + suffix;

    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(sql`lower(${user.username}) = lower(${candidate})`)
      .limit(1);

    if (!existing) return candidate;
  }

  // Astronomically unlikely (50 collisions on one slug) — fall back to a
  // guaranteed-unique id-based name rather than looping forever.
  return `user_${userId}`.slice(0, 20);
}
