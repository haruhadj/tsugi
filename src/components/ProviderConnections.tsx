"use client";

import { CheckIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";

const TRACKER_PROVIDERS = [
  { id: "anilist", label: "AniList" },
  { id: "mal", label: "MyAnimeList" },
] as const;

type TrackerProviderId = (typeof TRACKER_PROVIDERS)[number]["id"];

// Minimal on purpose (D33): which providers are linked, a button to link
// another, and sign-out — the only sign-out control in the product.
// Unlinking and the last-provider guard are Phase 8's.
export function ProviderConnections() {
  const router = useRouter();
  const [linkedProviderIds, setLinkedProviderIds] = useState<string[] | null>(null);
  const [linkingProvider, setLinkingProvider] = useState<TrackerProviderId | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    authClient.listAccounts().then(({ data }) => {
      setLinkedProviderIds(data?.map((account) => account.providerId) ?? []);
    });
  }, []);

  async function link(providerId: TrackerProviderId) {
    setLinkingProvider(providerId);
    // AniList and MyAnimeList are genericOAuth providers — linking one goes
    // through oauth2.link(), not linkSocial() (that method is for built-in
    // social providers only, e.g. Google once it's wired in).
    await authClient.oauth2.link({ providerId, callbackURL: "/settings" });
  }

  async function signOut() {
    setIsSigningOut(true);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  const isLoading = linkedProviderIds === null;

  return (
    <div className="flex flex-col gap-8">
      <ul className="flex flex-col">
        {TRACKER_PROVIDERS.map((provider, index) => {
          const isLinked = linkedProviderIds?.includes(provider.id) ?? false;
          return (
            <li key={provider.id}>
              {index > 0 ? <Separator /> : null}
              <div className="flex items-center justify-between gap-4 py-4">
                <span className="font-display text-sm font-semibold tracking-[0.06em] uppercase">
                  {provider.label}
                </span>
                {isLinked ? (
                  <span className="flex items-center gap-2 font-mono text-xs tracking-[0.16em] text-bloom uppercase">
                    <CheckIcon className="size-3.5" aria-hidden />
                    Linked
                  </span>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isLoading || linkingProvider !== null}
                    onClick={() => link(provider.id)}
                  >
                    Link — unlocks My list
                    {linkingProvider === provider.id ? (
                      <Loader2Icon className="animate-spin" aria-hidden />
                    ) : null}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <Button
        variant="ghost"
        className="self-start text-muted-foreground"
        disabled={isSigningOut}
        onClick={signOut}
      >
        Sign out
        {isSigningOut ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
      </Button>
    </div>
  );
}
