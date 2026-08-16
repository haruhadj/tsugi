"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2Icon, RefreshCwIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MediaCover } from "@/components/MediaCover";
import type { ListEntry, MediaType, Provider } from "@/lib/types/media";

const PROVIDER_LABELS: Record<Provider, string> = {
  anilist: "AniList",
  mal: "MyAnimeList",
};

type ListState =
  | { status: "loading" }
  | { status: "results"; entries: ListEntry[]; stale?: boolean }
  | {
      status: "error";
      reason: "not_linked" | "reauth_required" | "rate_limited" | "unavailable" | "timeout" | "not_found";
    };

function stateFromStatus(status: number): ListState {
  if (status === 404) return { status: "error", reason: "not_linked" };
  if (status === 409) return { status: "error", reason: "reauth_required" };
  if (status === 429) return { status: "error", reason: "rate_limited" };
  if (status === 504) return { status: "error", reason: "timeout" };
  return { status: "error", reason: "unavailable" };
}

export function MyListPicker({
  provider,
  mediaType,
  onImport,
  atCapacity = false,
  isSelected,
}: {
  provider: Provider;
  mediaType: MediaType;
  onImport: (entry: ListEntry) => void;
  atCapacity?: boolean;
  isSelected: (entry: ListEntry) => boolean;
}) {
  const [state, setState] = useState<ListState>({ status: "loading" });
  const [filter, setFilter] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const load = (force: boolean) => {
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
          setState({ status: "results", entries: data.entries, stale: data.stale });
        } else {
          setState(stateFromStatus(res.status));
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sets initial loading state synchronously; results arrive async via fetch
    load(false);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, mediaType]);

  if (state.status === "loading") {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground" role="status">
        <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
        Loading your {PROVIDER_LABELS[provider]} list…
      </div>
    );
  }

  if (state.status === "error") {
    if (state.reason === "not_linked" || state.reason === "reauth_required") {
      return (
        <div className="flex flex-col gap-2 py-4 text-sm" role="status">
          <p className="text-muted-foreground">
            {state.reason === "not_linked"
              ? `Connect ${PROVIDER_LABELS[provider]} to import from your list.`
              : `Your ${PROVIDER_LABELS[provider]} connection needs to be renewed.`}
          </p>
          <a
            href="/settings"
            className="min-h-11 self-start text-sm font-medium text-primary underline underline-offset-4"
          >
            Go to settings
          </a>
        </div>
      );
    }
    if (state.reason === "rate_limited") {
      return (
        <p className="py-4 text-sm text-muted-foreground" role="status">
          Fetching too fast, one moment.
        </p>
      );
    }
    return (
      <p className="py-4 text-sm text-muted-foreground" role="status">
        {PROVIDER_LABELS[provider]} isn&apos;t responding right now.
      </p>
    );
  }

  const filtered = state.entries.filter((entry) =>
    entry.title.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Filter your list…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter your list"
          className="flex-1"
        />
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          aria-label={`Refresh ${PROVIDER_LABELS[provider]} list`}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent disabled:opacity-50"
        >
          <RefreshCwIcon className={`size-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
        </button>
      </div>
      {state.stale && (
        <p className="text-xs text-muted-foreground" role="status">
          {PROVIDER_LABELS[provider]} isn&apos;t responding right now — showing your last synced list.
        </p>
      )}
      {atCapacity && (
        <p className="text-sm text-muted-foreground" role="status">
          You&apos;ve reached the 10-item limit. Remove an item to add another.
        </p>
      )}
      <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
        {filtered.length === 0 && (
          <li className="py-4 text-sm text-muted-foreground">No titles match.</li>
        )}
        {filtered.map((entry) => {
          const selected = isSelected(entry);
          const disabled = atCapacity || selected;
          return (
            <li key={`${entry.provider}-${entry.externalId}`}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onImport(entry)}
                className="flex min-h-11 w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
              >
                <MediaCover src={entry.coverImage} title={entry.title} width={32} height={44} />
                <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                {selected && <span className="text-xs text-muted-foreground">Added</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
