"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2Icon } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { searchMedia } from "@/lib/providers";
import type { MediaType, Provider, UnifiedMediaResult } from "@/lib/types/media";

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

const PROVIDER_LABELS: Record<Provider, string> = {
  anilist: "AniList",
  mal: "MyAnimeList",
};

function otherProvider(provider: Provider): Provider {
  return provider === "anilist" ? "mal" : "anilist";
}

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "results"; results: UnifiedMediaResult[] }
  // "reauth_required" is a list-import (Phase 7) reason, never returned by
  // search — included only so the shared ProviderResult type checks.
  | {
      status: "error";
      reason: "rate_limited" | "unavailable" | "not_found" | "timeout" | "reauth_required";
    };

export function MediaSearchInput({
  provider,
  mediaType,
  onSelect,
  onSwitchProvider,
}: {
  provider: Provider;
  mediaType: MediaType;
  onSelect: (result: UnifiedMediaResult) => void;
  onSwitchProvider: (provider: Provider) => void;
}) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const [open, setOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const runSearch = (q: string, forProvider: Provider) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: "loading" });
    searchMedia(forProvider, q, mediaType, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.ok) {
        setState({ status: "results", results: result.data });
      } else {
        setState({ status: "error", reason: result.reason });
      }
    });
  };

  useEffect(() => {
    if (query.length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort();
      return;
    }
    const timer = setTimeout(() => runSearch(query, provider), DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, provider]);

  const effectiveState: SearchState = query.length < MIN_QUERY_LENGTH ? { status: "idle" } : state;

  const handleSwitchOffer = () => {
    const next = otherProvider(provider);
    onSwitchProvider(next);
    runSearch(query, next);
  };

  const handleSelect = (result: UnifiedMediaResult) => {
    onSelect(result);
    setQuery("");
    setState({ status: "idle" });
    setOpen(false);
  };

  return (
    <Popover open={open && query.length >= MIN_QUERY_LENGTH} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Command shouldFilter={false} className="relative overflow-visible bg-transparent">
          <CommandInput
            autoFocus
            placeholder="Search for a title…"
            value={query}
            onValueChange={(value) => {
              setQuery(value);
              setOpen(true);
            }}
          />
          {effectiveState.status === "loading" && (
            <Loader2Icon
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </Command>
      </PopoverAnchor>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList>
            {effectiveState.status === "results" && effectiveState.results.length === 0 && (
              <CommandEmpty>No results on {PROVIDER_LABELS[provider]}.</CommandEmpty>
            )}
            {effectiveState.status === "results" && effectiveState.results.length > 0 && (
              <CommandGroup>
                {effectiveState.results.map((result) => (
                  <CommandItem
                    key={`${result.provider}-${result.externalId}`}
                    value={`${result.provider}-${result.externalId}`}
                    onSelect={() => handleSelect(result)}
                  >
                    {result.title}
                    {result.year ? ` (${result.year})` : ""}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {effectiveState.status === "error" && effectiveState.reason === "rate_limited" && (
              <p className="px-3 py-4 text-sm text-muted-foreground" role="status">
                Searching too fast, one moment.
              </p>
            )}
            {effectiveState.status === "error" &&
              (effectiveState.reason === "unavailable" || effectiveState.reason === "timeout") && (
                <div className="flex flex-col gap-2 px-3 py-4 text-sm" role="status">
                  <p className="text-muted-foreground">
                    {PROVIDER_LABELS[provider]} isn&apos;t responding right now.
                  </p>
                  <button
                    type="button"
                    className="min-h-11 self-start text-sm font-medium text-primary underline underline-offset-4"
                    onClick={handleSwitchOffer}
                  >
                    Search {PROVIDER_LABELS[otherProvider(provider)]} instead
                  </button>
                </div>
              )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
