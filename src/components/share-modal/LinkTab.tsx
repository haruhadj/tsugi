import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { buildDiscordMessage, buildWhatsAppShareUrl, buildXShareUrl } from "@/lib/share";
import type { CopyState } from "@/components/share-modal/useShareModalState";

export function LinkTab({
  url,
  text,
  copyState,
  setCopyState,
  discordCopyState,
  setDiscordCopyState,
  copyText,
}: {
  url: string;
  text?: string;
  copyState: CopyState;
  setCopyState: (state: CopyState) => void;
  discordCopyState: CopyState;
  setDiscordCopyState: (state: CopyState) => void;
  copyText: (value: string, set: (state: CopyState) => void) => void;
}) {
  return (
    <TabsContent value="link" className="flex flex-col gap-4">
      <div role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {copyState === "copied" && "Link copied!"}
        {copyState === "failed" && "Copy your link"}
      </div>
      <div className="flex flex-row gap-2">
        <Input readOnly value={url} onFocus={(e) => e.target.select()} aria-label="List link" />
        <Button
          type="button"
          variant="outline"
          onClick={() => copyText(url, setCopyState)}
          aria-label="Copy link"
        >
          {copyState === "copied" ? (
            <CheckIcon aria-hidden="true" />
          ) : (
            <CopyIcon aria-hidden="true" />
          )}
        </Button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild type="button" variant="secondary" className="flex-1">
          <a href={buildXShareUrl(url, text)} target="_blank" rel="noopener noreferrer">
            Share to X
          </a>
        </Button>
        <Button asChild type="button" variant="secondary" className="flex-1">
          <a href={buildWhatsAppShareUrl(url, text)} target="_blank" rel="noopener noreferrer">
            Share to WhatsApp
          </a>
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={() => copyText(buildDiscordMessage(url, text), setDiscordCopyState)}
        >
          {discordCopyState === "copied" ? "Message copied" : "Copy for Discord"}
        </Button>
      </div>
      <div role="status" aria-live="polite" className="sr-only">
        {discordCopyState === "copied" && "Discord message copied to clipboard"}
      </div>
      <a href={url} className="text-sm text-muted-foreground underline underline-offset-4">
        View it
      </a>
    </TabsContent>
  );
}
