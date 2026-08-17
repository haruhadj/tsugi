import { z } from "zod";

// Mirrors the DB's own constraints (src/db/auth-schema.ts): the
// `username_format` CHECK and the case-insensitive `user_username_lower_idx`
// unique index. Client/server validation agreeing with the DB constraint
// means a rejected update never surfaces as an opaque 500.
export const updateUsernameSchema = z.object({
  username: z
    .string()
    .regex(/^[a-zA-Z0-9_]{3,20}$/, "3-20 characters: letters, numbers, underscore only."),
});

export type UpdateUsernameInput = z.infer<typeof updateUsernameSchema>;
