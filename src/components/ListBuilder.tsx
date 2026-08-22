"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  EyeIcon,
  GlobeIcon,
  InfoIcon,
  LayersIcon,
  Loader2Icon,
  SaveIcon,
  TagIcon,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ItemTray, type TrayItem } from "@/components/ItemTray";
import { MediaCover } from "@/components/MediaCover";
import { MediaSearchInput } from "@/components/MediaSearchInput";
import { MyListPicker } from "@/components/MyListPicker";
import { SegmentedRadioGroup } from "@/components/SegmentedRadioGroup";
import { ShareModal } from "@/components/ShareModal";
import { SocialCardPreview } from "@/components/SocialCardPreview";
import { authClient } from "@/lib/auth-client";
import { FALLBACK_LIST_CATEGORY, LIST_CATEGORIES, type ListCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { CreateListItem } from "@/lib/validators/list";
import type { ListEntry, MediaType, Provider, UnifiedMediaResult } from "@/lib/types/media";

const TRACKER_PROVIDER_IDS: Provider[] = ["anilist", "mal"];
const CAPTION_LIMIT = 120;
const COMMENT_LIMIT = 280;

type Mode = "search" | "mylist";

/**
 * The builder is a three-step flow (D-create-steps): Details → Add titles →
 * Arrange & publish. The import picker used to render its full tracker grid on
 * the same screen as the tray being built, burying the tray below hundreds of
 * covers. Splitting the flow gives the picker the whole width on step 2 and the
 * tray the whole width on step 3, so neither fights the other for space.
 */
type Step = 1 | 2 | 3;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Details" },
  { n: 2, label: "Add titles" },
  { n: 3, label: "Arrange" },
];

function toWireItem(item: TrayItem): CreateListItem {
  return {
    provider: item.provider,
    externalId: item.externalId,
    mediaType: item.mediaType,
    // The pair travels together or not at all (invariant 6). The format is the
    // item's own — POINT_10 for anything typed here, the tracker's own scale
    // for anything imported (D47).
    ...(item.scoreRaw != null && item.scoreFormat != null
      ? { scoreRaw: item.scoreRaw, scoreFormat: item.scoreFormat }
      : {}),
    ...(item.comment ? { comment: item.comment } : {}),
  } as CreateListItem;
}

/**
 * The genre cloud shown while building. A *preview*: it can only aggregate what
 * the client already knows, and a title imported from a tracker list carries no
 * genres until the server resolves it at save time. The list's real cloud is
 * computed server-side from the stored items (D48).
 */
function previewGenres(items: TrayItem[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const genre of item.genres) {
      const trimmed = genre.trim();
      if (trimmed) counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function ListBuilder() {
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");
  const initialMode: Mode = fromParam === "mylist" ? "mylist" : "search";

  const [provider, setProvider] = useState<Provider>("anilist");
  const [mediaType, setMediaType] = useState<MediaType>("anime");
  const [mode, setMode] = useState<Mode>(initialMode);
  // Arriving via the Import nav link lands the user straight on the add step so
  // the tracker picker is what they see; a plain visit starts at Details.
  const [step, setStep] = useState<Step>(fromParam === "mylist" ? 2 : 1);

  // The Import nav link points at `/?from=mylist`. When the user is already on
  // this page, that navigation only changes the query string — the component
  // never remounts, so the initial `useState` alone would leave the builder
  // stuck in whatever mode it was in. Sync during render (React's recommended
  // "adjust state when a prop changes" pattern) rather than in an effect, which
  // would cascade an extra render.
  const [prevFrom, setPrevFrom] = useState(fromParam);
  if (fromParam !== prevFrom) {
    setPrevFrom(fromParam);
    if (fromParam === "mylist") {
      setMode("mylist");
      setStep(2);
    } else {
      setMode("search");
    }
  }

  const [items, setItems] = useState<TrayItem[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ListCategory>(FALLBACK_LIST_CATEGORY);
  const [caption, setCaption] = useState("");
  const [comment, setComment] = useState("");
  const [showCard, setShowCard] = useState(false);
  const [pending, setPending] = useState<"draft" | "publish" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [linkedProviderIds, setLinkedProviderIds] = useState<string[] | null>(null);

  useEffect(() => {
    authClient.listAccounts().then(({ data }) => {
      setLinkedProviderIds(data?.map((account) => account.providerId) ?? []);
    });
  }, []);

  const hasTrackerLinked =
    linkedProviderIds?.some((id) => TRACKER_PROVIDER_IDS.includes(id as Provider)) ?? false;

  const genres = useMemo(() => previewGenres(items), [items]);

  const isSelected = (candidate: { provider: Provider; externalId: number }) =>
    items.some(
      (item) => item.provider === candidate.provider && item.externalId === candidate.externalId,
    );

  const handleSelect = (result: UnifiedMediaResult) => {
    if (isSelected(result)) return;
    setItems([...items, { ...result, scoreRaw: null, scoreFormat: null, comment: "" }]);
    setError(null);
  };

  const handleImport = (entry: ListEntry) => {
    if (isSelected(entry)) return;
    setItems([
      ...items,
      {
        provider: entry.provider,
        externalId: entry.externalId,
        mediaType: entry.mediaType,
        title: entry.title,
        titleNative: entry.titleNative,
        coverImage: entry.coverImage,
        year: entry.year,
        averageScore: null,
        // D52: entries now carry genres from the tracker; also used for preview
        genres: entry.genres,
        // Kept exactly as the tracker returned it, format and all (D47). This
        // used to drop any score whose format differed from the user's own,
        // silently losing the rating it had just imported.
        scoreRaw: entry.scoreRaw,
        scoreFormat: entry.scoreFormat,
        comment: "",
      },
    ]);
    setError(null);
  };

  const submit = async (publish: boolean) => {
    setError(null);
    setSavedNotice(null);

    if (!name.trim()) {
      setError("Give your list a title.");
      setStep(1);
      return;
    }
    if (publish && items.length === 0) {
      setError("Add at least one title before publishing.");
      setStep(2);
      return;
    }
    if (items.length === 0) {
      setError("Add at least one title.");
      setStep(2);
      return;
    }
    // Invariant 8, checked here only so the message is friendly — the server
    // enforces it regardless and would answer 400.
    const hasSignal = Boolean(comment) || items.some((item) => item.scoreRaw !== null || item.comment);
    if (!hasSignal) {
      setError("Add a score or a note somewhere before saving.");
      return;
    }

    setPending(publish ? "publish" : "draft");
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          caption: caption || undefined,
          comment: comment || undefined,
          publish,
          items: items.map(toWireItem),
        }),
      });

      if (res.status === 201) {
        const data = (await res.json()) as { slug: string };
        if (publish) {
          setShareUrl(`${window.location.origin}/r/${data.slug}`);
        } else {
          setSavedNotice("Draft saved. You can publish it from your lists.");
        }
        return;
      }
      if (res.status === 429) {
        setError("Too many lists created recently. Try again shortly.");
      } else if (res.status === 401) {
        setError("Sign in to create a list.");
      } else {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Could not save this list.");
      }
    } finally {
      setPending(null);
    }
  };

  const goNext = () => {
    if (step === 1) {
      if (!name.trim()) {
        setError("Give your list a title.");
        return;
      }
      setError(null);
      setStep(2);
    } else if (step === 2) {
      if (items.length === 0) {
        setError("Add at least one title.");
        return;
      }
      setError(null);
      setStep(3);
    }
  };

  const goBack = () => {
    setError(null);
    setStep((s) => (s === 3 ? 2 : 1));
  };

  return (
    <div className="flex flex-col gap-6">
      {/*
        The step rail. Each step is a button so a user can jump straight back to
        one they have already passed; forward moves go through `goNext` so the
        title/at-least-one-title gates still apply.
      */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/60 p-4">
        <div className="flex items-center gap-3">
          <span
            className="brand-gradient flex size-10 shrink-0 items-center justify-center rounded-xl font-mono text-lg font-bold text-primary-foreground"
            aria-hidden="true"
          >
            次
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-foreground sm:text-lg">
              {name.trim() || "Build a list"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Add titles, score them, publish a link.
            </p>
          </div>
        </div>

        <ol className="flex items-center gap-2">
          {STEPS.map(({ n, label }, i) => {
            const isCurrent = step === n;
            const isDone = step > n;
            return (
              <li key={n} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    // Backward is always free; forward is gated by goNext.
                    if (n <= step) {
                      setError(null);
                      setStep(n);
                    } else {
                      goNext();
                    }
                  }}
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "flex min-h-11 flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors",
                    isCurrent
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold",
                      isCurrent
                        ? "bg-primary text-primary-foreground"
                        : isDone
                          ? "bg-success/20 text-success"
                          : "bg-secondary text-muted-foreground",
                    )}
                    aria-hidden="true"
                  >
                    {isDone ? <CheckIcon className="size-3.5" /> : n}
                  </span>
                  <span className="truncate text-xs font-semibold sm:text-sm">{label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <span className="hidden h-px w-4 shrink-0 bg-border sm:block" aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/*
        A recoverable failure, so this is an `Alert` inside the form with every
        field preserved — not a field-level line and not a toast (ui-rules.md's
        error tiers).
      */}
      {error && (
        <Alert variant="destructive">
          <AlertCircleIcon aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {savedNotice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-success/40 bg-success/15 px-3 py-2.5 text-xs text-success"
        >
          <CheckIcon className="size-4 shrink-0" aria-hidden="true" />
          {savedNotice}
        </div>
      )}

      {step === 1 && (
        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card/60 p-5">
          <h2 className="flex items-center gap-1.5 font-mono text-[0.65rem] font-semibold tracking-[0.24em] text-muted-foreground uppercase">
            <LayersIcon className="size-3.5 text-primary" aria-hidden="true" />
            List details
          </h2>

          <div className="flex flex-col gap-2">
            <Label htmlFor="list-name">Title</Label>
            <Input
              id="list-name"
              value={name}
              maxLength={80}
              placeholder="Ten romances that actually end"
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="list-category">Category</Label>
            <Select value={category} onValueChange={(next) => setCategory(next as ListCategory)}>
              <SelectTrigger id="list-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIST_CATEGORIES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs leading-relaxed text-muted-foreground">
              This is how the list is filed on the rundown. The title above is free text.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="list-caption">Caption (optional)</Label>
              <span className="font-mono text-[10px] text-muted-foreground">
                {caption.length}/{CAPTION_LIMIT}
              </span>
            </div>
            <Textarea
              id="list-caption"
              rows={2}
              maxLength={CAPTION_LIMIT}
              value={caption}
              placeholder="A short line about this list"
              className="resize-none text-sm"
              onChange={(event) => setCaption(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="list-comment">Note (optional)</Label>
              <span
                className={cn(
                  "font-mono text-[10px]",
                  comment.length >= COMMENT_LIMIT
                    ? "font-bold text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {comment.length}/{COMMENT_LIMIT}
              </span>
            </div>
            <Textarea
              id="list-comment"
              rows={3}
              maxLength={COMMENT_LIMIT}
              value={comment}
              placeholder="Why you're sharing this"
              className="resize-none text-sm"
              onChange={(event) => setComment(event.target.value)}
            />
          </div>
        </section>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          {hasTrackerLinked && (
            <SegmentedRadioGroup
              label="Add from"
              value={mode}
              options={[
                { value: "search", label: "Search" },
                { value: "mylist", label: "My list" },
              ]}
              onChange={setMode}
              className="self-start"
            />
          )}

          {mode === "search" ? (
            <MediaSearchInput
              provider={provider}
              mediaType={mediaType}
              onSelect={handleSelect}
              onSwitchProvider={setProvider}
              onMediaTypeChange={setMediaType}
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
                onImport={handleImport}
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
          <div className="sticky bottom-0 flex flex-col gap-2 rounded-2xl border border-border bg-card/95 p-3 backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">Added</span>
              <span className="rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                {items.length}
              </span>
              {items.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  className="ml-auto"
                  onClick={goNext}
                >
                  Next: Arrange
                  <ArrowRightIcon aria-hidden="true" />
                </Button>
              )}
            </div>
            {items.length > 0 ? (
              <ul className="flex gap-1.5 overflow-x-auto pb-1">
                {items.map((item) => (
                  <li key={`${item.provider}-${item.externalId}`} className="shrink-0">
                    <MediaCover
                      src={item.coverImage}
                      title={item.title}
                      width={32}
                      height={44}
                      className="rounded-md"
                    />
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
      )}

      {step === 3 && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between px-1">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              Titles
              <span className="rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                {items.length}
              </span>
            </h2>
            <Button
              type="button"
              variant={showCard ? "secondary" : "outline"}
              size="sm"
              aria-pressed={showCard}
              onClick={() => setShowCard(!showCard)}
            >
              <EyeIcon aria-hidden="true" />
              Social card
            </Button>
          </div>

          {showCard && (
            <SocialCardPreview
              title={caption || name || "Untitled list"}
              subtitle={caption ? name : null}
              comment={comment || null}
              category={category}
              items={items}
            />
          )}

          {/* The auto-aggregated genre cloud */}
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-background/60 p-3">
            <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-[0.18em] text-foreground uppercase">
              <TagIcon className="size-3 text-primary" aria-hidden="true" />
              Genres ({genres.length})
            </span>
            {genres.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {genres.map((genre) => (
                  <span
                    key={genre.name}
                    className="rounded-md border border-primary/30 bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">
                Add titles and their genres collect here automatically.
              </p>
            )}
            <p className="flex items-start gap-1.5 border-t border-border pt-2 text-[10px] leading-relaxed text-muted-foreground">
              <InfoIcon className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
              <span>
                Titles bring their own genres, and readers can filter the rundown by any of
                them. Imported titles fill theirs in once the list is saved.
              </span>
            </p>
          </div>

          <ItemTray items={items} onChange={setItems} />
        </div>
      )}

      {/* Step footer: Back / Next, or the save + publish actions on the last step. */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card/60 p-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={step === 1}
          onClick={goBack}
        >
          <ArrowLeftIcon aria-hidden="true" />
          Back
        </Button>

        {step < 3 ? (
          <Button type="button" size="sm" onClick={goNext}>
            {step === 1 ? "Next: Add titles" : "Next: Arrange"}
            <ArrowRightIcon aria-hidden="true" />
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending !== null}
              onClick={() => submit(false)}
            >
              {pending === "draft" ? (
                <Loader2Icon className="animate-spin" aria-hidden="true" />
              ) : (
                <SaveIcon aria-hidden="true" />
              )}
              Save draft
            </Button>
            <Button type="button" size="sm" disabled={pending !== null} onClick={() => submit(true)}>
              {pending === "publish" ? (
                <Loader2Icon className="animate-spin" aria-hidden="true" />
              ) : (
                <GlobeIcon aria-hidden="true" />
              )}
              Publish list
            </Button>
          </div>
        )}
      </div>

      <ShareModal
        open={shareUrl !== null}
        onOpenChange={(open) => {
          if (!open) setShareUrl(null);
        }}
        url={shareUrl ?? ""}
        text={caption || undefined}
      />
    </div>
  );
}
