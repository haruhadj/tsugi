import { useMemo, useState } from "react";
import { previewGenres, toWireItem } from "@/components/list-builder/helpers";
import { type TrayItem } from "@/components/ItemTray";
import { FALLBACK_LIST_CATEGORY, type ListCategory } from "@/lib/categories";
import type { CreateListItem } from "@/lib/validators/list";
import type { ListEntry, Provider, UnifiedMediaResult } from "@/lib/types/media";
import type { BuilderList } from "@/components/ListBuilder";

export type Step = 1 | 2 | 3;

/**
 * All of the builder's form state (name/category/caption/comment/items), the
 * item-tray mutators, and the client-side validation gates. Split out of
 * `ListBuilder` so the component itself is just wiring the steps and footer
 * together.
 */
export function useListBuilderForm(existing: BuilderList | undefined) {
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
  const [error, setError] = useState<string | null>(null);

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

  return {
    step,
    setStep,
    items,
    setItems,
    name,
    setName,
    category,
    setCategory,
    caption,
    setCaption,
    comment,
    setComment,
    error,
    setError,
    genres,
    isSelected,
    handleSelect,
    handleRemove,
    handleImport,
    body,
    validate,
    goNext,
    goBack,
  };
}
