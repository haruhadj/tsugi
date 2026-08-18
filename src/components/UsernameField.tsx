"use client";

import { AtSignIcon, CheckIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updateUsernameSchema } from "@/lib/validators/username";

type Props = {
  initialUsername: string;
  /**
   * Called after a successful save. The handle gate uses this to leave the
   * blocking screen; settings passes nothing and simply stays put.
   */
  onSaved?: (username: string) => void;
  saveLabel?: string;
  autoFocus?: boolean;
};

type Status = { kind: "idle" } | { kind: "error"; message: string } | { kind: "saved" };

// Settings-editable username (design intent documented in src/db/auth-schema.ts):
// defaulted once at signup, freely editable here. Client-side format check
// mirrors the DB CHECK constraint (src/lib/validators/username.ts) so most
// rejections never round-trip to the server.
//
// Since D49 a handle is mandatory, so this component is also what `/handle`
// renders — hence `onSaved`, which is the only difference between the two uses.
export function UsernameField({ initialUsername, onSaved, saveLabel = "Save", autoFocus }: Props) {
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
      onSaved?.(username);
    }

    setIsSaving(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="username" className="font-display text-sm font-semibold tracking-[0.06em]">
        Username
      </label>
      <div className="flex flex-wrap items-center gap-3">
        {/*
          The `@` is a static glyph inside the frame rather than part of the
          value — it is never submitted, and the DB's format constraint would
          reject it if it were.
        */}
        <div className="flex min-h-11 w-full max-w-xs items-center gap-1.5 rounded-xl border border-input bg-background px-3 focus-within:border-primary/60 focus-within:ring-[3px] focus-within:ring-ring/50">
          <AtSignIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            id="username"
            value={username}
            autoFocus={autoFocus}
            onChange={(e) => {
              setUsername(e.target.value);
              setStatus({ kind: "idle" });
            }}
            maxLength={20}
            className="w-full bg-transparent py-2 font-mono text-sm outline-none"
          />
        </div>
        <Button variant="outline" size="sm" disabled={!isDirty || isSaving} onClick={save}>
          {saveLabel}
          {isSaving ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
        </Button>
      </div>
      {status.kind === "error" ? (
        <p className="font-mono text-xs tracking-[0.06em] text-destructive">{status.message}</p>
      ) : status.kind === "saved" ? (
        <p className="flex items-center gap-2 font-mono text-xs tracking-[0.16em] text-success uppercase">
          <CheckIcon className="size-3.5" aria-hidden />
          Saved
        </p>
      ) : (
        <p className="font-mono text-xs tracking-[0.06em] text-muted-foreground">
          3-20 characters: letters, numbers, underscore only. Shown as u/{username || "yourname"}{" "}
          on everything you publish.
        </p>
      )}
    </div>
  );
}
