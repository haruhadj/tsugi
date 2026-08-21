"use client";

import { Loader2Icon, ShieldCheckIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

// AniList and MyAnimeList are the two providers — both unlock list import
// (Phase 7). Each carries its own brand glyph and per-button pending state.
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
        {/*
          Each provider carries its own glyph chip in its own brand token — the
          sanctioned use of `anilist`/`mal` (ui-tokens.md): identifying a
          service, not accenting the UI. Full class strings, never interpolated.
        */}
        {(
          [
            { id: "anilist", label: "AniList", glyph: "AL", tone: "bg-anilist/20 text-anilist" },
            { id: "mal", label: "MyAnimeList", glyph: "MAL", tone: "bg-mal/20 text-mal" },
          ] as const
        ).map((provider) => (
          <Button
            key={provider.id}
            size="lg"
            className="justify-between"
            disabled={isBusy}
            onClick={() => signInWithGenericOAuth(provider.id)}
          >
            <span className="flex items-center gap-2.5">
              <span
                className={`flex size-6 items-center justify-center rounded-md font-mono text-[10px] font-bold ${provider.tone}`}
                aria-hidden
              >
                {provider.glyph}
              </span>
              Continue with {provider.label}
            </span>
            {pendingProvider === provider.id ? (
              <Loader2Icon className="animate-spin" aria-hidden />
            ) : null}
          </Button>
        ))}
        <p className="text-sm text-muted-foreground">
          Unlocks importing your list later.
        </p>
      </div>

      <p className="flex items-center justify-center gap-1.5 border-t border-border pt-4 font-mono text-[11px] text-muted-foreground">
        <ShieldCheckIcon className="size-3.5 text-success" aria-hidden />
        OAuth only — Tsugi never sees your password.
      </p>
    </div>
  );
}
