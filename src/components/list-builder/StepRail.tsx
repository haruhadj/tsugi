import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Step } from "@/components/list-builder/useListBuilderForm";

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Details" },
  { n: 2, label: "Add titles" },
  { n: 3, label: "Arrange" },
];

/**
 * The step rail header. Each step is a button so a user can jump straight
 * back to one they have already passed; forward moves go through `onNext` so
 * the title/at-least-one-title gates still apply.
 */
export function StepRail({
  step,
  onStepChange,
  onNext,
  name,
  isEdit,
}: {
  step: Step;
  onStepChange: (step: Step) => void;
  onNext: () => void;
  name: string;
  isEdit: boolean;
}) {
  return (
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
                  // Backward is always free; forward is gated by onNext.
                  if (n <= step) {
                    onStepChange(n);
                  } else {
                    onNext();
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
  );
}
