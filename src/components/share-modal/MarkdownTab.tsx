import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { CopyState } from "@/components/share-modal/useShareModalState";

export function MarkdownTab({
  markdown,
  markdownCopyState,
  setMarkdownCopyState,
  copyText,
}: {
  markdown: string;
  markdownCopyState: CopyState;
  setMarkdownCopyState: (state: CopyState) => void;
  copyText: (value: string, set: (state: CopyState) => void) => void;
}) {
  return (
    <TabsContent value="markdown" className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        For a forum post or anywhere the link preview will not render.
      </p>
      <Textarea
        readOnly
        value={markdown}
        rows={9}
        onFocus={(e) => e.target.select()}
        aria-label="Markdown export"
        className="resize-none font-mono text-xs"
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => copyText(markdown, setMarkdownCopyState)}
      >
        {markdownCopyState === "copied" ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
        {markdownCopyState === "copied" ? "Copied" : "Copy markdown"}
      </Button>
    </TabsContent>
  );
}
