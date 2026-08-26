import { Loader2Icon } from "lucide-react";
import { CommandEmpty, CommandGroup, CommandList } from "@/components/ui/command";
import { PROVIDER_LABELS, otherProvider } from "@/components/media-search/labels";
import { SearchResultCard } from "@/components/media-search/SearchResultCard";
import type { SearchState } from "@/components/media-search/useMediaSearch";
import type { Provider, ProviderGenre, UnifiedMediaResult } from "@/lib/types/media";

export function SearchResultsList({
  state,
  provider,
  query,
  genres,
  activeGenre,
  isSelected,
  onItemSelect,
  onSwitchOffer,
  onScroll,
}: {
  state: SearchState;
  provider: Provider;
  query: string;
  genres: ProviderGenre[];
  activeGenre: string | null;
  isSelected: (result: UnifiedMediaResult) => boolean;
  onItemSelect: (result: UnifiedMediaResult) => void;
  onSwitchOffer: () => void;
  onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
}) {
  if (state.status === "idle") return null;

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-border bg-popover">
      <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-3 py-2">
        <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
          {query
            ? `Results for “${query}”`
            : `Browsing ${genres.find((g) => g.id === activeGenre)?.label ?? "genre"}`}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {PROVIDER_LABELS[provider]}
        </span>
      </div>

      <CommandList className="max-h-96" onScroll={onScroll}>
        {state.status === "results" && state.results.length === 0 && (
          <CommandEmpty>No results on {PROVIDER_LABELS[provider]}.</CommandEmpty>
        )}
        {state.status === "results" && state.results.length > 0 && (
          <CommandGroup>
            {state.results.map((result) => (
              <SearchResultCard
                key={`${result.provider}-${result.externalId}`}
                result={result}
                added={isSelected(result)}
                onSelect={() => onItemSelect(result)}
              />
            ))}
            {state.loadingMore && (
              <div className="col-span-full flex items-center justify-center py-3">
                <Loader2Icon className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
              </div>
            )}
          </CommandGroup>
        )}
        {state.status === "error" && state.reason === "rate_limited" && (
          <p className="px-3 py-4 text-sm text-muted-foreground" role="status">
            Searching too fast, one moment.
          </p>
        )}
        {state.status === "error" && (state.reason === "unavailable" || state.reason === "timeout") && (
          <div className="flex flex-col gap-2 px-3 py-4 text-sm" role="status">
            <p className="text-muted-foreground">
              {PROVIDER_LABELS[provider]} isn&apos;t responding right now.
            </p>
            <button
              type="button"
              className="min-h-11 self-start text-sm font-medium text-primary underline underline-offset-4"
              onClick={onSwitchOffer}
            >
              Search {PROVIDER_LABELS[otherProvider(provider)]} instead
            </button>
          </div>
        )}
      </CommandList>
    </div>
  );
}
