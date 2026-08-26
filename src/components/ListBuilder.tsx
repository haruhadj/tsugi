"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  GlobeIcon,
  Loader2Icon,
  SaveIcon,
  XIcon,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AddTitlesStep } from "@/components/list-builder/steps/AddTitlesStep";
import { ArrangeStep } from "@/components/list-builder/steps/ArrangeStep";
import { DetailsStep } from "@/components/list-builder/steps/DetailsStep";
import { previewGenres, toWireItem } from "@/components/list-builder/helpers";
import { useTrackerLinking } from "@/components/list-builder/useTrackerLinking";
import { type TrayItem } from "@/components/ItemTray";
import { ShareModal } from "@/components/ShareModal";
import { FALLBACK_LIST_CATEGORY, type ListCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { CreateListItem } from "@/lib/validators/list";
import type { ListEntry, MediaType, Provider, UnifiedMediaResult } from "@/lib/types/media";

export { toTrayItems } from "@/components/list-builder/helpers";

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

/**
 * The list an edit session starts from (**D59**). Absent for the create path,
 * which starts from nothing — the presence of this prop is what puts the
 * builder in edit mode, so there is no separate `mode` flag to keep in sync.
 */
export type BuilderList = {
  slug: string;
  name: string;
  category: ListCategory;
  caption: string | null;
  comment: string | null;
  items: TrayItem[];
};

export function ListBuilder({ existing }: { existing?: BuilderList } = {}) {
  const router = useRouter();
  const isEdit = existing !== undefined;

  const [provider, setProvider] = useState<Provider>("anilist");
  const [mediaType, setMediaType] = useState<MediaType>("anime");
  const [mode, setMode] = useState<Mode>("search");
  const [step, setStep] = useState<Step>(1);

  // Seeded once from the server-rendered list. `existing` is a prop of a page
  // that re-renders only on navigation, so there is no effect syncing the two —
  // one would fight the user's own typing on every refresh.
  const [items, setItems] = useState<TrayItem[]>(existing?.items ?? []);
  const [name, setName] = useState(existing?.name ?? "");
  const [category, setCategory] = useState<ListCategory>(
    existing?.category ?? FALLBACK_LIST_CATEGORY,
  );
  const [caption, setCaption] = useState(existing?.caption ?? "");
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [showCard, setShowCard] = useState(false);
  const [pending, setPending] = useState<"draft" | "publish" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const { hasTrackerLinked } = useTrackerLinking();

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

  const handleRemove = (candidate: { provider: Provider; externalId: number }) => {
    setItems(
      items.filter(
        (item) => !(item.provider === candidate.provider && item.externalId === candidate.externalId),
      ),
    );
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

  /** Everything both paths send. Edit adds no `publish` — that stays its own endpoint. */
  const body = (): {
    name: string;
    category: ListCategory;
    caption?: string;
    comment?: string;
    items: CreateListItem[];
  } => ({
    name,
    category,
    caption: caption || undefined,
    comment: comment || undefined,
    items: items.map(toWireItem),
  });

  /**
   * The gates the server would apply anyway, checked here only so the message is
   * friendly and lands on the step that can fix it. Returns false having already
   * set the error.
   */
  const validate = (): boolean => {
    if (!name.trim()) {
      setError("Give your list a title.");
      setStep(1);
      return false;
    }
    if (items.length === 0) {
      setError("Add at least one title.");
      setStep(2);
      return false;
    }
    // Invariant 8 — the server enforces it regardless and would answer 400.
    const hasSignal =
      Boolean(comment) || items.some((item) => item.scoreRaw !== null || item.comment);
    if (!hasSignal) {
      setError("Add a score or a note somewhere before saving.");
      return false;
    }
    return true;
  };

  /**
   * Saving an edit (D59). A whole-list replacement, so this sends the same body a
   * create does — see `editListSchema`. On success it navigates to the artifact
   * rather than staying put: the point of editing a published list is to see the
   * thing readers now see.
   */
  const saveEdit = async () => {
    if (!existing) return;
    setError(null);
    setSavedNotice(null);
    if (!validate()) return;

    setPending("save");
    try {
      const res = await fetch(`/api/lists/${existing.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body()),
      });

      if (res.status === 204) {
        // refresh() first so the artifact page re-reads rather than serving the
        // router cache's copy of the list as it was before this save.
        router.refresh();
        router.push(`/r/${existing.slug}`);
        return;
      }
      if (res.status === 429) {
        const { retryAfter } = (await res.json()) as { retryAfter: number };
        setError(`Saving too fast. Try again in ${retryAfter}s.`);
      } else if (res.status === 401) {
        setError("Sign in to edit this list.");
      } else if (res.status === 404) {
        setError("This list no longer exists, or is not yours to edit.");
      } else {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Could not save these changes.");
      }
    } finally {
      setPending(null);
    }
  };

  const submit = async (publish: boolean) => {
    setError(null);
    setSavedNotice(null);
    if (!validate()) return;

    setPending(publish ? "publish" : "draft");
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body(), publish }),
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
              {name.trim() || (isEdit ? "Edit list" : "Build a list")}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isEdit
                ? "Changes go live at the link you already shared."
                : "Add titles, score them, publish a link."}
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
        <DetailsStep
          name={name}
          onNameChange={(value) => {
            setName(value);
            setError(null);
          }}
          category={category}
          onCategoryChange={setCategory}
          caption={caption}
          onCaptionChange={setCaption}
          comment={comment}
          onCommentChange={setComment}
        />
      )}

      {step === 2 && (
        <AddTitlesStep
          hasTrackerLinked={hasTrackerLinked}
          mode={mode}
          onModeChange={setMode}
          provider={provider}
          onProviderChange={setProvider}
          mediaType={mediaType}
          onMediaTypeChange={setMediaType}
          items={items}
          isSelected={isSelected}
          onSelect={handleSelect}
          onRemove={handleRemove}
          onImport={handleImport}
          onNext={goNext}
        />
      )}

      {step === 3 && (
        <ArrangeStep
          items={items}
          onItemsChange={setItems}
          showCard={showCard}
          onShowCardChange={setShowCard}
          caption={caption}
          name={name}
          comment={comment}
          category={category}
          genres={genres}
        />
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

        {isEdit ? (
          /*
            One save button on every step, not just the last: an edit is often a
            one-word fix to the title, and making that person walk to step 3 to
            commit it is the kind of friction the create flow at least earns by
            being a flow. Cancel is a link back to the artifact, which is also
            where a successful save lands.
          */
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending !== null}
              onClick={() => router.push(`/r/${existing.slug}`)}
            >
              <XIcon aria-hidden="true" />
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={pending !== null} onClick={saveEdit}>
              {pending === "save" ? (
                <Loader2Icon className="animate-spin" aria-hidden="true" />
              ) : (
                <SaveIcon aria-hidden="true" />
              )}
              Save changes
            </Button>
          </div>
        ) : step < 3 ? (
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
