import { defineConfig } from "drizzle-kit";
import { getEnv } from "./src/lib/env";

// drizzle-kit needs session-level features the transaction pooler (6543)
// does not provide, so migrations go through the direct/session connection.
export default defineConfig({
  schema: ["./src/db/schema.ts", "./src/db/auth-schema.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: getEnv().DIRECT_URL,
  },
});
