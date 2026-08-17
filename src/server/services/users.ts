import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/auth-schema";

export type UpdateUsernameResult = "updated" | "taken";

/**
 * Case-insensitive uniqueness check mirrors `deriveDefaultUsername`'s
 * (src/lib/auth.ts) query shape, but this path is user-initiated (Settings),
 * so a collision is reported back rather than retried with a suffix — the
 * user picked this name on purpose.
 */
export async function updateUsername(
  userId: string,
  username: string,
): Promise<UpdateUsernameResult> {
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(sql`lower(${user.username}) = lower(${username})`)
    .limit(1);

  if (existing && existing.id !== userId) {
    return "taken";
  }

  await db.update(user).set({ username }).where(eq(user.id, userId));
  return "updated";
}
