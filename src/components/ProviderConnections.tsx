"use client";

import { CheckIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";

/*
  `glyph` and `tone` carry each provider's own brand colour, which is the one
  sanctioned use of the `anilist`/`mal` tokens — identifying a provider, never
  as a UI accent (ui-tokens.md). Written out in full rather than interpolated.
*/
const TRACKER_PROVIDERS = [
  {
    id: "anilist",
    label: "AniList",
    glyph: "AL",
    tone: "border-anilist/30 bg-anilist/15 text-anilist",
  },
  {
    id: "mal",
    label: "MyAnimeList",
    glyph: "MAL",
    tone: "border-mal/30 bg-mal/15 text-mal",
  },
] as const;

type TrackerProviderId = (typeof TRACKER_PROVIDERS)[number]["id"];
type LinkedAccount = { providerId: string; accountId: string };

// D33 + PHASE-8.md: which providers are linked, a button to link another,
// unlink (guarded so the last provider can never be removed — criterion 10),
// and sign-out — the only sign-out control in the product.
export function ProviderConnections() {
  const router = useRouter();
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[] | null>(null);
  const [linkingProvider, setLinkingProvider] = useState<TrackerProviderId | null>(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState<TrackerProviderId | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    authClient.listAccounts().then(({ data }) => {
      setLinkedAccounts(data?.map(({ providerId, accountId }) => ({ providerId, accountId })) ?? []);
    });
  }, []);

  async function link(providerId: TrackerProviderId) {
    setLinkingProvider(providerId);
    // AniList and MyAnimeList are genericOAuth providers — linking one goes
    // through oauth2.link(), not linkSocial() (that method is for built-in
    // social providers only).
    await authClient.oauth2.link({ providerId, callbackURL: "/settings" });
  }

  async function unlink(account: LinkedAccount) {
    setUnlinkingProvider(account.providerId as TrackerProviderId);
    await authClient.unlinkAccount({
      providerId: account.providerId,
      accountId: account.accountId,
    });
    setLinkedAccounts(
      (current) => current?.filter((a) => a.accountId !== account.accountId) ?? null,
    );
    setUnlinkingProvider(null);
  }

  async function signOut() {
    setIsSigningOut(true);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  const isLoading = linkedAccounts === null;
  // Criterion 10: a user must never be left with zero trackers linked, so the
  // unlink control is disabled (not hidden — the state should stay legible)
  // whenever removing this account would leave none.
  const isLastAccount = (linkedAccounts?.length ?? 0) <= 1;

  return (
    <div className="flex flex-col gap-8">
      <ul className="flex flex-col">
        {TRACKER_PROVIDERS.map((provider, index) => {
          const account = linkedAccounts?.find((a) => a.providerId === provider.id) ?? null;
          return (
            <li key={provider.id}>
              {index > 0 ? <Separator /> : null}
              <div className="flex flex-wrap items-center justify-between gap-4 py-4">
                <span className="flex items-center gap-2.5">
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg border font-mono text-[10px] font-bold ${provider.tone}`}
                    aria-hidden
                  >
                    {provider.glyph}
                  </span>
                  <span className="font-display text-sm font-semibold tracking-[0.06em]">
                    {provider.label}
                  </span>
                </span>
                {account ? (
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 font-mono text-xs tracking-[0.16em] text-success uppercase">
                      <CheckIcon className="size-3.5" aria-hidden />
                      Linked
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      disabled={isLastAccount || unlinkingProvider !== null}
                      title={isLastAccount ? "You need at least one linked tracker." : undefined}
                      onClick={() => unlink(account)}
                    >
                      Unlink
                      {unlinkingProvider === provider.id ? (
                        <Loader2Icon className="animate-spin" aria-hidden />
                      ) : null}
                    </Button>
                  </div>
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
