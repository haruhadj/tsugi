import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : "http://localhost:3000")),
  BETTER_AUTH_SECRET: z.string().min(1),
  ANILIST_CLIENT_ID: z.string().min(1),
  ANILIST_CLIENT_SECRET: z.string().min(1),
  MAL_CLIENT_ID: z.string().min(1),
  MAL_CLIENT_SECRET: z.string().min(1),
  // Optional here on purpose (D9) — requiring an Upstash account to run the
  // homepage locally is friction with no benefit. Phase 0's in-memory
  // fallback covers dev. `src/server/hono/middleware.ts` is the module that
  // actually enforces "required in production", not this file — env.ts's
  // job is shape, not policy.
  UPSTASH_REDIS_REST_URL: z
    .string()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined)),
  UPSTASH_REDIS_REST_TOKEN: z
    .string()
    .min(1)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined)),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(source: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(`Invalid environment configuration. Check: ${missing}`);
  }
  return parsed.data;
}

let cachedEnv: Env | undefined;

// Validated lazily, not on import: env.test.ts imports validateEnv directly, and
// CI runs with no .env at all (D22) — an eager top-level call here would throw
// during test collection before a single test runs.
export function getEnv(): Env {
  cachedEnv ??= validateEnv(process.env);
  return cachedEnv;
}
