"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

// AniList and MyAnimeList are visually primary and unlock list import
// (Phase 7); Google is a plain fallback, separated below (D24). Google is
// not wired into src/lib/auth.ts yet, so its button is disabled rather than
// omitted — the sign-in screen's shape should not have to change again once
// it is.
export function SignInButtons() {
  const [pendingProvider, setPendingProvider] = useState<"anilist" | "mal" | null>(null);

  async function signInWithGenericOAuth(providerId: "anilist" | "mal") {
    setPendingProvider(providerId);
    await authClient.signIn.oauth2({ providerId, callbackURL: "/" });
  }

  // shadcn's Button has no pending variant of its own, so the spinner and the
  // disabled state are wired here — per button, not per page, so the two tracker
  // buttons never both look busy.
  const isBusy = pendingProvider !== null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {(
          [
            { id: "anilist", label: "AniList" },
            { id: "mal", label: "MyAnimeList" },
          ] as const
        ).map((provider) => (
          <Button
            key={provider.id}
            size="lg"
            className="justify-between"
            disabled={isBusy}
            onClick={() => signInWithGenericOAuth(provider.id)}
          >
            Continue with {provider.label}
            {pendingProvider === provider.id ? (
              <Loader2Icon className="animate-spin" aria-hidden />
            ) : null}
          </Button>
        ))}
        <p className="text-sm text-muted-foreground">
          Unlocks importing your list later.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button variant="outline" size="lg" disabled>
          Continue with Google
        </Button>
        <p className="text-sm text-muted-foreground">
          Sign-in only — link a tracker afterwards from Settings.
        </p>
      </div>
    </div>
  );
}
