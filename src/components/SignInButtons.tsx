"use client";

import { Loader2Icon, ShieldCheckIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

// AniList and MyAnimeList are the two providers — both unlock list import
// (Phase 7). Each carries its own brand glyph and per-button pending state.
export function SignInButtons() {
  const [pendingProvider, setPendingProvider] = useState<
    "anilist" | "mal" | null
  >(null);

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
          Each provider is identified by its own mark rather than a coloured
          chip. The marks are monochrome lettermarks and inherit the button's
          `primary-foreground`, so they read on every theme's primary — the
          brand tokens could not: two themes take their primary from the same
          swatches (sky for `anilist`, indigo for `mal`), and a brand-coloured
          mark vanishes into the button there.
        */}
        {(
          [
            { id: "anilist", label: "AniList", Mark: AniListMark },
            { id: "mal", label: "MyAnimeList", Mark: MyAnimeListMark },
          ] as const
        ).map((provider) => (
          <Button
            key={provider.id}
            size="lg"
            className="relative justify-center"
            disabled={isBusy}
            onClick={() => signInWithGenericOAuth(provider.id)}
          >
            <span className="flex items-center gap-2.5">
              {/*
                A fixed square slot, so the two marks line up with each other
                and with the label's cap height. They are different shapes — a
                square "A" against a wide "MAL" lettermark — and sized bare they
                read as two different weights of icon.
              */}
              <span className="flex size-6 shrink-0 items-center justify-center">
                <provider.Mark />
              </span>
              Continue with {provider.label}
            </span>
            {/*
              Taken out of the flow so it cannot shift the label: the mark and
              its label stay centred whether or not this button is the one
              waiting on a redirect.
            */}
            {pendingProvider === provider.id ? (
              <Loader2Icon
                className="absolute right-4 animate-spin"
                aria-hidden
              />
            ) : null}
          </Button>
        ))}
        <p className="text-sm text-muted-foreground">
          Unlocks importing your list later.
        </p>
      </div>
    </div>
  );
}

/*
  The providers' own marks, as single-path SVGs filled with `currentColor` so
  they take the button's text colour. Each is sized on its own rather than by a
  shared `size-*`: AniList's is a square "A", MyAnimeList's a wide "MAL"
  lettermark whose viewBox is cropped to the glyph's own bounds — one square box
  would shrink the wide one until it read as a smudge.
*/
function AniListMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden>
      <path d="M24 17.53v2.421c0 .71-.391 1.101-1.1 1.101h-5l-.057-.165L11.84 3.736c.106-.502.46-.788 1.053-.788h2.422c.71 0 1.1.391 1.1 1.1v12.38H22.9c.71 0 1.1.392 1.1 1.101zM11.034 2.947l6.337 18.104h-4.918l-1.052-3.131H6.019l-1.077 3.131H0L6.361 2.948h4.673zm-.66 10.96-1.69-5.014-1.541 5.015h3.23z" />
    </svg>
  );
}

function MyAnimeListMark() {
  return (
    <svg viewBox="0 6.4 24 9.8" fill="currentColor" className="w-6" aria-hidden>
      <path d="M14.921 6.479c-.82 0-3.683 0-4.947 3.156-.662 1.652-.986 4.812.876 7.886l1.934-1.41s-.767-1.095-1.083-3.191h2.897l.022 3.19h2.604V8.835h-2.581v2.043l-2.46-.023s.413-2.408 2.877-2.336h2.454l-.572-2.04ZM0 6.528v9.624h2.348v-5.84l2.031 2.664 2.047-2.652v5.828h2.336V6.528H6.437L4.368 9.474 2.31 6.528Zm18.447.022v9.583h5.022L24 14.09h-3.232V6.55Z" />
    </svg>
  );
}
