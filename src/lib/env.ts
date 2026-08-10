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

export const env = validateEnv(process.env);
