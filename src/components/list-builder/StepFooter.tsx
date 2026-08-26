import { ArrowLeftIcon, ArrowRightIcon, GlobeIcon, Loader2Icon, SaveIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PendingAction } from "@/components/list-builder/useListBuilderSubmit";
import type { BuilderList } from "@/components/ListBuilder";

/** Step footer: Back / Next, or the save + publish actions on the last step. */
export function StepFooter({
  step,
  isEdit,
  existing,
  pending,
  onBack,
  onNext,
  onCancel,
  onSaveEdit,
  onSubmit,
}: {
  step: number;
  isEdit: boolean;
  existing: BuilderList | undefined;
  pending: PendingAction;
  onBack: () => void;
  onNext: () => void;
  onCancel: () => void;
  onSaveEdit: () => void;
  onSubmit: (publish: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card/60 p-4">
      <Button type="button" variant="ghost" size="sm" disabled={step === 1} onClick={onBack}>
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
          <Button type="button" variant="ghost" size="sm" disabled={pending !== null} onClick={onCancel}>
            <XIcon aria-hidden="true" />
            Cancel
          </Button>
          <Button type="button" size="sm" disabled={pending !== null} onClick={onSaveEdit}>
            {pending === "save" ? (
              <Loader2Icon className="animate-spin" aria-hidden="true" />
            ) : (
              <SaveIcon aria-hidden="true" />
            )}
            Save changes
          </Button>
        </div>
      ) : step < 3 ? (
        <Button type="button" size="sm" onClick={onNext}>
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
            onClick={() => onSubmit(false)}
          >
            {pending === "draft" ? (
              <Loader2Icon className="animate-spin" aria-hidden="true" />
            ) : (
              <SaveIcon aria-hidden="true" />
            )}
            Save draft
          </Button>
          <Button type="button" size="sm" disabled={pending !== null} onClick={() => onSubmit(true)}>
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
  );
}
