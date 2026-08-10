import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

// The Supabase transaction pooler (port 6543) does not support prepared
// statements — see context/tech-stack.md (D8).
const client = postgres(getEnv().DATABASE_URL, { prepare: false });

export const db = drizzle(client, { schema });
