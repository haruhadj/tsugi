import { ArrowRightIcon } from "lucide-react";
import type { TrayItem } from "@/components/ItemTray";
import { MediaCover } from "@/components/MediaCover";
import { MediaSearchInput } from "@/components/MediaSearchInput";
import { MyListPicker } from "@/components/MyListPicker";
import { SegmentedRadioGroup } from "@/components/SegmentedRadioGroup";
import { Button } from "@/components/ui/button";
import type { ListEntry, MediaType, Provider, UnifiedMediaResult } from "@/lib/types/media";

type Mode = "search" | "mylist";

export function AddTitlesStep({
  hasTrackerLinked,
  mode,
  onModeChange,
  provider,
  onProviderChange,
  mediaType,
  onMediaTypeChange,
  items,
  isSelected,
  onSelect,
  onRemove,
  onImport,
  onNext,
}: {
  hasTrackerLinked: boolean;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  provider: Provider;
  onProviderChange: (provider: Provider) => void;
  mediaType: MediaType;
  onMediaTypeChange: (mediaType: MediaType) => void;
  items: TrayItem[];
  isSelected: (candidate: { provider: Provider; externalId: number }) => boolean;
  onSelect: (result: UnifiedMediaResult) => void;
  onRemove: (candidate: { provider: Provider; externalId: number }) => void;
  onImport: (entry: ListEntry) => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {hasTrackerLinked && (
        <SegmentedRadioGroup
          label="Add from"
          value={mode}
          options={[
            { value: "search", label: "Search" },
            { value: "mylist", label: "My list" },
          ]}
          onChange={onModeChange}
          className="self-start"
        />
      )}

      {mode === "search" ? (
        <MediaSearchInput
          provider={provider}
          mediaType={mediaType}
          onSelect={onSelect}
          onRemove={onRemove}
          onSwitchProvider={onProviderChange}
          onMediaTypeChange={onMediaTypeChange}
          isSelected={isSelected}
        />
      ) : (
        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
          <h2 className="font-mono text-[0.65rem] font-semibold tracking-[0.24em] text-foreground uppercase">
            Import from your tracker
          </h2>
          <MyListPicker
            provider={provider}
            mediaType={mediaType}
            onImport={onImport}
            isSelected={isSelected}
            handle={null}
          />
        </section>
      )}

      {/*
        A slim, read-only strip of what has been added so far. The full
        scoring/reordering tray lives on step 3 — here it is just a running
        confirmation so the picker keeps the whole width.
      */}
      {/*
        `bottom-rail`, not `bottom-0`: this pins to the bottom of the *available*
        viewport, above Header's fixed tab bar. At bottom-0 it slid underneath
        that bar on every phone, taking "Next: Arrange" with it — the one control
        that moves the create path forward was unreachable on the device the
        create path is designed for. The rail collapses to 0 at md, where there
        is no tab bar, so this needs no breakpoint of its own.
      */}
      <div className="sticky bottom-rail z-10 flex flex-col gap-2 rounded-2xl border border-border bg-card/95 p-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">Added</span>
          <span className="rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 font-mono text-xs font-bold text-primary">
            {items.length}
          </span>
          {items.length > 0 && (
            <Button type="button" size="sm" className="ml-auto" onClick={onNext}>
              Next: Arrange
              <ArrowRightIcon aria-hidden="true" />
            </Button>
          )}
        </div>
        {items.length > 0 ? (
          <ul className="flex gap-1.5 overflow-x-auto pb-1">
            {items.map((item) => (
              <li key={`${item.provider}-${item.externalId}`} className="shrink-0">
                <button
                  type="button"
                  aria-label={`Remove ${item.title}`}
                  className="rounded-md transition-opacity hover:opacity-70"
                  onClick={() => onRemove(item)}
                >
                  <MediaCover
                    src={item.coverImage}
                    title={item.title}
                    width={32}
                    height={44}
                    className="rounded-md"
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            Nothing added yet — search or import above to start filling the list.
          </p>
        )}
      </div>
    </div>
  );
}
