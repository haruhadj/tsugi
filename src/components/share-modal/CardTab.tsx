import { CheckIcon, DownloadIcon, ImageIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import type { CardState } from "@/components/share-modal/useShareModalState";

export function CardTab({
  cardState,
  onCopy,
  onSave,
}: {
  cardState: CardState;
  onCopy: () => void;
  onSave: () => void;
}) {
  return (
    <TabsContent value="card" className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        The same 1200×630 card the link unfurls into, as a file you can post yourself.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={cardState === "working"}
          onClick={onCopy}
        >
          {cardState === "working" ? (
            <Loader2Icon className="animate-spin" aria-hidden />
          ) : cardState === "copied" ? (
            <CheckIcon aria-hidden />
          ) : (
            <ImageIcon aria-hidden />
          )}
          {cardState === "copied" ? "Image copied" : "Copy image"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          disabled={cardState === "working"}
          onClick={onSave}
        >
          <DownloadIcon aria-hidden />
          Download PNG
        </Button>
      </div>
      <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
        {cardState === "failed" && "This browser cannot copy images — use Download PNG instead."}
      </p>
    </TabsContent>
  );
}
