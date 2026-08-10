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
