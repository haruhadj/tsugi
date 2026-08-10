"use client";

import { Button } from "@heroui/react";
import { useState } from "react";
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Button
          variant="primary"
          isPending={pendingProvider === "anilist"}
          isDisabled={pendingProvider !== null}
          onPress={() => signInWithGenericOAuth("anilist")}
        >
          Continue with AniList
        </Button>
        <Button
          variant="primary"
          isPending={pendingProvider === "mal"}
          isDisabled={pendingProvider !== null}
          onPress={() => signInWithGenericOAuth("mal")}
        >
          Continue with MyAnimeList
        </Button>
        <p className="text-sm text-foreground/60">
          Unlocks importing your list later.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Button variant="outline" isDisabled>
          Continue with Google
        </Button>
        <p className="text-sm text-foreground/60">
          Sign-in only — link a tracker afterwards from Settings.
        </p>
      </div>
    </div>
  );
}
