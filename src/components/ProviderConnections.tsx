"use client";

import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-3">
        {TRACKER_PROVIDERS.map((provider) => {
          const isLinked = linkedProviderIds?.includes(provider.id) ?? false;
          return (
            <li key={provider.id} className="flex items-center justify-between gap-4">
              <span>{provider.label}</span>
              {isLinked ? (
                <span className="text-sm text-foreground/60">Linked</span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  isPending={linkingProvider === provider.id}
                  isDisabled={linkedProviderIds === null || linkingProvider !== null}
                  onPress={() => link(provider.id)}
                >
                  Link — unlocks My list
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <Button
        variant="ghost"
        isPending={isSigningOut}
        isDisabled={isSigningOut}
        onPress={signOut}
      >
        Sign out
      </Button>
    </div>
  );
}
