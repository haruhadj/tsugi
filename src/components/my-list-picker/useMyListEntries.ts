import { useEffect, useRef, useState } from "react";
import { stateFromStatus, type ListState } from "@/components/my-list-picker/helpers";
import type { ListEntry, MediaType, Provider } from "@/lib/types/media";

/**
 * Fetches (and caches) the signed-in user's tracker list for one
 * `(provider, mediaType)` pair, with a manual force-refresh.
 *
 * Cached per `provider:mediaType` for the component's lifetime — switching
 * back to a pair already loaded this session shows it instantly rather than
 * re-spending the same rate-limit budget a fresh fetch would.
 */
export function useMyListEntries(provider: Provider, mediaType: MediaType) {
  const [state, setState] = useState<ListState>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, ListState>>(new Map());

  const load = (force: boolean) => {
    const key = `${provider}:${mediaType}`;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (force) {
      setRefreshing(true);
    } else {
      setState({ status: "loading" });
    }

    fetch(`/api/lists/${provider}/${mediaType}${force ? "?refresh=1" : ""}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (controller.signal.aborted) return;
        if (res.status === 200) {
          const data = (await res.json()) as { entries: ListEntry[]; stale?: boolean };
          const next: ListState = { status: "results", entries: data.entries, stale: data.stale };
          cacheRef.current.set(key, next);
          setState(next);
        } else {
          const next = stateFromStatus(res.status);
          cacheRef.current.set(key, next);
          setState(next);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error", reason: "unavailable" });
      })
      .finally(() => {
        if (!controller.signal.aborted) setRefreshing(false);
      });
  };

  useEffect(() => {
    const key = `${provider}:${mediaType}`;
    const cached = cacheRef.current.get(key);
    if (cached) {
      setState(cached);
      return;
    }
    load(false);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, mediaType]);

  return { state, refreshing, load };
}
