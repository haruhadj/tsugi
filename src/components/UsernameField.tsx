"use client";

import { CheckIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updateUsernameSchema } from "@/lib/validators/username";

type Props = { initialUsername: string };

type Status = { kind: "idle" } | { kind: "error"; message: string } | { kind: "saved" };

// Settings-editable username (design intent documented in src/db/auth-schema.ts):
// defaulted once at signup, freely editable here. Client-side format check
// mirrors the DB CHECK constraint (src/lib/validators/username.ts) so most
// rejections never round-trip to the server.
export function UsernameField({ initialUsername }: Props) {
  const [username, setUsername] = useState(initialUsername);
  const [saved, setSaved] = useState(initialUsername);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const isDirty = username !== saved;

  async function save() {
    const parsed = updateUsernameSchema.safeParse({ username });
    if (!parsed.success) {
      setStatus({ kind: "error", message: parsed.error.issues[0]?.message ?? "Invalid username." });
      return;
    }

    setIsSaving(true);
    setStatus({ kind: "idle" });

    const res = await fetch("/api/user/username", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    if (res.status === 409) {
      setStatus({ kind: "error", message: "That username is already taken." });
    } else if (res.status === 429) {
      const { retryAfter } = await res.json();
      setStatus({ kind: "error", message: `Too many attempts. Try again in ${retryAfter}s.` });
    } else if (res.status === 401) {
      setStatus({ kind: "error", message: "Sign in to change your username." });
    } else if (!res.ok) {
      setStatus({ kind: "error", message: "Something went wrong. Try again." });
    } else {
      setSaved(username);
      setStatus({ kind: "saved" });
    }

    setIsSaving(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <label
        htmlFor="username"
        className="font-display text-sm font-semibold tracking-[0.06em] uppercase"
      >
        Username
      </label>
      <div className="flex items-center gap-3">
        <input
          id="username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setStatus({ kind: "idle" });
          }}
          maxLength={20}
          className="w-full max-w-xs rounded-md border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-bloom"
        />
        <Button variant="outline" size="sm" disabled={!isDirty || isSaving} onClick={save}>
          Save
          {isSaving ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
        </Button>
      </div>
      {status.kind === "error" ? (
        <p className="font-mono text-xs tracking-[0.06em] text-destructive">{status.message}</p>
      ) : status.kind === "saved" ? (
        <p className="flex items-center gap-2 font-mono text-xs tracking-[0.16em] text-bloom uppercase">
          <CheckIcon className="size-3.5" aria-hidden />
          Saved
        </p>
      ) : (
        <p className="font-mono text-xs tracking-[0.06em] text-muted-foreground">
          3-20 characters: letters, numbers, underscore only. Shown on your public feed entries.
        </p>
      )}
    </div>
  );
}
