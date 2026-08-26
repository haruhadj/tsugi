import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import type { Provider } from "@/lib/types/media";

const TRACKER_PROVIDER_IDS: Provider[] = ["anilist", "mal"];

/**
 * Whether the signed-in user has a tracker account linked, so step 2 can offer
 * "My list" import alongside search. Fetched once on mount — the account list
 * cannot change mid-session from anything this component does.
 */
export function useTrackerLinking() {
  const [linkedProviderIds, setLinkedProviderIds] = useState<string[] | null>(null);

  useEffect(() => {
    authClient.listAccounts().then(({ data }) => {
      setLinkedProviderIds(data?.map((account) => account.providerId) ?? []);
    });
  }, []);

  const hasTrackerLinked =
    linkedProviderIds?.some((id) => TRACKER_PROVIDER_IDS.includes(id as Provider)) ?? false;

  return { hasTrackerLinked };
}
