"use client";

import { AlertCircleIcon, CheckIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AddTitlesStep } from "@/components/list-builder/steps/AddTitlesStep";
import { ArrangeStep } from "@/components/list-builder/steps/ArrangeStep";
import { DetailsStep } from "@/components/list-builder/steps/DetailsStep";
import { StepFooter } from "@/components/list-builder/StepFooter";
import { StepRail } from "@/components/list-builder/StepRail";
import { useListBuilderForm } from "@/components/list-builder/useListBuilderForm";
import { useListBuilderSubmit } from "@/components/list-builder/useListBuilderSubmit";
import { useTrackerLinking } from "@/components/list-builder/useTrackerLinking";
import { type TrayItem } from "@/components/ItemTray";
import { ShareModal } from "@/components/ShareModal";
import { useState } from "react";
import { type ListCategory } from "@/lib/categories";
import type { MediaType, Provider } from "@/lib/types/media";

export { toTrayItems } from "@/components/list-builder/helpers";

type Mode = "search" | "mylist";

/**
 * The builder is a three-step flow (D-create-steps): Details → Add titles →
 * Arrange & publish. The import picker used to render its full tracker grid on
 * the same screen as the tray being built, burying the tray below hundreds of
 * covers. Splitting the flow gives the picker the whole width on step 2 and the
 * tray the whole width on step 3, so neither fights the other for space.
 */

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
  const isEdit = existing !== undefined;

  const [provider, setProvider] = useState<Provider>("anilist");
  const [mediaType, setMediaType] = useState<MediaType>("anime");
  const [mode, setMode] = useState<Mode>("search");
  const [showCard, setShowCard] = useState(false);

  const {
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
  } = useListBuilderForm(existing);

  const { hasTrackerLinked } = useTrackerLinking();

  const { pending, savedNotice, shareUrl, setShareUrl, submit, saveEdit, router } =
    useListBuilderSubmit({ existing, body, validate, setError });

  return (
    <div className="flex flex-col gap-6">
      <StepRail
        step={step}
        onStepChange={(n) => {
          setError(null);
          setStep(n);
        }}
        onNext={goNext}
        name={name}
        isEdit={isEdit}
      />

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

      <StepFooter
        step={step}
        isEdit={isEdit}
        existing={existing}
        pending={pending}
        onBack={goBack}
        onNext={goNext}
        onCancel={() => existing && router.push(`/r/${existing.slug}`)}
        onSaveEdit={saveEdit}
        onSubmit={submit}
      />

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
