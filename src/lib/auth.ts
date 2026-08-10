import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";

// Minimal on purpose — the Better-Auth CLI aborts before it looks at
// `--adapter` if no config file exists at all (tech-stack.md). This is only
// enough to satisfy the generator: the Drizzle adapter and the one
// additionalFields entry the schema needs. Sign-in and the Hono mount
// arrive in Phase 2 (D18).
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  user: {
    additionalFields: {
      // The scale this user rates in — read from the session in Phase 5,
      // written at sign-in in Phase 2, refreshed on every list fetch in
      // Phase 7 (D32).
      scoreFormat: {
        type: "string",
        required: true,
        defaultValue: "POINT_10",
        input: false,
      },
    },
  },
});
